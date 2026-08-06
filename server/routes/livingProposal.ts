// ---------------------------------------------------------------------------
// The Living Proposal — /api/lp
// ---------------------------------------------------------------------------
// Day 1 of PORTAL-5-DAY-PLAN.md: the whole loop, ugly. Open a link, read the
// graph, answer what we need, upload a file, send it back, get emailed, and
// leave a trail of events behind you.
//
// Access model matches the existing v2 routes: token = identity for clients,
// Bearer + profiles.role for admins. Every write goes through the service-role
// client here — never from the frontend (.agents/memory/backend-write-proxy.md).
// ---------------------------------------------------------------------------
import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { sendLivingProposalReady, sendLivingProposalSubmitted } from "../email";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client.lex-ops.io";
const LEXOPS_NOTIFY_EMAIL = process.env.LEXOPS_NOTIFY_EMAIL || "isuru@lex-ops.io";

const GRAPH_VERSION = 1; // pilot runs one live graph per proposal — no versioning

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ message: "Unauthorized" }); return; }
  const { data: { user }, error } = await adminSupabase.auth.getUser(auth.slice(7));
  if (error || !user) { res.status(401).json({ message: "Unauthorized" }); return; }
  const { data: profile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["lexops_admin", "lexops_member"].includes(profile?.role)) { res.status(403).json({ message: "Forbidden" }); return; }
  (req as any).adminUser = user;
  next();
}

function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Resolve a `/p/:token` token to { proposal, recipient }.
 *
 * Two token shapes are accepted so existing proposal links keep working:
 *  - a `proposal_recipients.token` (per-person, the one we now send), or
 *  - the legacy `proposals.token`, which lazily mints a primary recipient so
 *    the same link starts producing per-recipient telemetry from first open.
 */
async function resolveToken(token: string): Promise<{ proposal: any; recipient: any } | null> {
  const { data: recipient } = await (adminSupabase as any)
    .from("proposal_recipients").select("*").eq("token", token).maybeSingle();

  if (recipient) {
    const { data: proposal } = await adminSupabase
      .from("proposals").select("*").eq("id", recipient.proposal_id).single();
    return proposal ? { proposal, recipient } : null;
  }

  const { data: proposal } = await adminSupabase
    .from("proposals").select("*").eq("token", token).maybeSingle();
  if (!proposal) return null;

  // Legacy link: adopt it as the primary recipient so telemetry has a subject.
  const { data: existingPrimary } = await (adminSupabase as any)
    .from("proposal_recipients")
    .select("*").eq("proposal_id", proposal.id).is("invited_by", null).maybeSingle();
  if (existingPrimary) return { proposal, recipient: existingPrimary };

  const { data: created } = await (adminSupabase as any)
    .from("proposal_recipients")
    .insert({
      proposal_id: proposal.id,
      email: proposal.client_email,
      name: proposal.client_contact_name || proposal.client_name,
      token,                 // reuse the legacy token so the link stays valid
      invited_by: null,
    })
    .select().single();
  return { proposal, recipient: created || null };
}

async function logEvent(
  proposalId: string,
  recipientId: string | null,
  type: string,
  nodeId?: string | null,
  meta?: any
) {
  const { error } = await (adminSupabase as any).from("proposal_events").insert({
    proposal_id: proposalId,
    recipient_id: recipientId,
    type,
    node_id: nodeId || null,
    meta: meta || null,
  });
  if (error) console.error("[lp] event insert:", error.message);
}

/** Any meaningful client activity moves the clock the stall query reads. */
async function touchClientActivity(proposalId: string) {
  const { error } = await adminSupabase
    .from("proposals")
    .update({ last_client_activity_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (error) console.error("[lp] touch activity:", error.message);
}

async function getGraph(proposalId: string) {
  const { data } = await (adminSupabase as any)
    .from("proposal_graphs")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("version", GRAPH_VERSION)
    .maybeSingle();
  return data || null;
}

/** Progress is counted over required needs only — optional extras never block. */
function countNeeds(graph: any, inputs: any[]) {
  const answeredKeys = new Set(
    (inputs || [])
      .filter((i) => i.value != null || i.file_path != null)
      .map((i) => `${i.node_id}::${i.need_id}`)
  );
  let required = 0;
  let answered = 0;
  let optionalAnswered = 0;
  let optional = 0;
  for (const node of (graph?.nodes || [])) {
    for (const need of (node.needs || [])) {
      const key = `${node.id}::${need.id}`;
      if (need.required === false) {
        optional += 1;
        if (answeredKeys.has(key)) optionalAnswered += 1;
      } else {
        required += 1;
        if (answeredKeys.has(key)) answered += 1;
      }
    }
  }
  return { required, answered, optional, optionalAnswered };
}

// ===========================================================================
// CLIENT SIDE — token = identity
// ===========================================================================

// GET /api/lp/p/:token — the whole session in one payload
router.get("/p/:token", async (req, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const graph = await getGraph(proposal.id);

  const [inputsResult, notesResult] = await Promise.all([
    (adminSupabase as any).from("proposal_inputs")
      .select("*").eq("proposal_id", proposal.id).eq("graph_version", GRAPH_VERSION),
    (adminSupabase as any).from("proposal_notes")
      .select("*").eq("proposal_id", proposal.id).order("created_at", { ascending: false }),
  ]);
  const inputs = inputsResult.data || [];

  // First open is the single most valuable bit of telemetry — bucket 1 of the
  // stall query is invisible without it.
  if (recipient) {
    const now = new Date().toISOString();
    const patch: any = { last_seen_at: now };
    if (!recipient.first_opened_at) patch.first_opened_at = now;
    await (adminSupabase as any).from("proposal_recipients").update(patch).eq("id", recipient.id);
    await logEvent(proposal.id, recipient.id, "viewed", null, { first: !recipient.first_opened_at });
  }

  res.json({
    proposal: {
      id: proposal.id,
      name: proposal.name,
      client_name: proposal.client_name,
      state: proposal.state,
      ball_in_court: proposal.ball_in_court,
      // The proposal document itself, for the download at the end of Act V.
      // This object is a whitelist rather than the row — the row carries
      // internal pricing and pipeline fields a client must never receive — so
      // anything the page needs has to be named here explicitly.
      pdf_url: proposal.pdf_url ?? null,
    },
    recipient: recipient ? { id: recipient.id, email: recipient.email, name: recipient.name } : null,
    graph,
    inputs,
    notes: notesResult.data || [],
    progress: countNeeds(graph, inputs),
  });
});

// POST /api/lp/p/:token/answer — autosave one need. Upsert, so re-answering
// overwrites rather than piling up rows.
router.post("/p/:token/answer", async (req, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const { node_id, need_id, value } = req.body || {};
  if (!node_id || !need_id) { res.status(400).json({ message: "node_id and need_id are required" }); return; }

  const isBlank = value == null || (typeof value === "string" && value.trim() === "");

  const { data, error } = await (adminSupabase as any)
    .from("proposal_inputs")
    .upsert({
      proposal_id: proposal.id,
      graph_version: GRAPH_VERSION,
      node_id,
      need_id,
      value: isBlank ? null : value,
      answered_by: recipient?.email || null,
      answered_at: new Date().toISOString(),
    }, { onConflict: "proposal_id,graph_version,node_id,need_id" })
    .select().single();

  if (error) {
    console.error("[lp] answer upsert:", error.message);
    res.status(500).json({ message: error.message }); return;
  }

  await Promise.all([
    logEvent(proposal.id, recipient?.id || null, isBlank ? "need_cleared" : "need_answered", node_id, { need_id }),
    touchClientActivity(proposal.id),
  ]);

  const graph = await getGraph(proposal.id);
  const { data: inputs } = await (adminSupabase as any)
    .from("proposal_inputs").select("*").eq("proposal_id", proposal.id).eq("graph_version", GRAPH_VERSION);

  res.json({ input: data, progress: countNeeds(graph, inputs || []) });
});

// POST /api/lp/p/:token/upload — a `file` need. Storage and the metadata row
// reuse the existing client-files path so admin file listing keeps working.
router.post("/p/:token/upload", upload.single("file"), async (req: any, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const { node_id, need_id } = req.body as Record<string, string>;
  const file = req.file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ message: "No file uploaded" }); return; }
  if (!node_id || !need_id) { res.status(400).json({ message: "node_id and need_id are required" }); return; }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const storagePath = `proposals/${proposal.id}/graph/${node_id}/${Date.now()}_${safeName}`;

  const { error: storageErr } = await (adminSupabase as any).storage
    .from("proposal-assets")
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: true });
  if (storageErr) {
    console.error("[lp] storage:", storageErr.message);
    res.status(500).json({ message: `Upload failed: ${storageErr.message}` }); return;
  }
  const { data: { publicUrl } } = (adminSupabase as any).storage
    .from("proposal-assets").getPublicUrl(storagePath);

  const { data, error } = await (adminSupabase as any)
    .from("proposal_inputs")
    .upsert({
      proposal_id: proposal.id,
      graph_version: GRAPH_VERSION,
      node_id,
      need_id,
      file_path: storagePath,
      file_name: file.originalname,
      file_url: publicUrl,
      answered_by: recipient?.email || null,
      answered_at: new Date().toISOString(),
    }, { onConflict: "proposal_id,graph_version,node_id,need_id" })
    .select().single();

  if (error) {
    await (adminSupabase as any).storage.from("proposal-assets").remove([storagePath]).catch(() => {});
    console.error("[lp] upload upsert:", error.message);
    res.status(500).json({ message: error.message }); return;
  }

  // Mirror into proposal_client_files so the existing admin file list sees it.
  await (adminSupabase as any).from("proposal_client_files").insert({
    proposal_id: proposal.id,
    workflow_id: null,
    stage_index: null,
    kind: "submitted",
    file_name: file.originalname,
    storage_path: storagePath,
    file_url: publicUrl,
    size_bytes: file.size,
    content_type: file.mimetype,
  }).then(({ error: mirrorErr }: any) => {
    if (mirrorErr) console.error("[lp] client-files mirror:", mirrorErr.message);
  });

  await Promise.all([
    logEvent(proposal.id, recipient?.id || null, "file_uploaded", node_id, { need_id, file_name: file.originalname }),
    touchClientActivity(proposal.id),
  ]);

  const graph = await getGraph(proposal.id);
  const { data: inputs } = await (adminSupabase as any)
    .from("proposal_inputs").select("*").eq("proposal_id", proposal.id).eq("graph_version", GRAPH_VERSION);

  res.json({ input: data, progress: countNeeds(graph, inputs || []) });
});

// POST /api/lp/p/:token/note — comment or flag on a node
router.post("/p/:token/note", async (req, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const { node_id, kind, body, payload } = req.body || {};
  if (!body || !String(body).trim()) { res.status(400).json({ message: "body is required" }); return; }

  const { data, error } = await (adminSupabase as any).from("proposal_notes").insert({
    proposal_id: proposal.id,
    node_id: node_id || null,
    kind: ["comment", "flag", "proposed_node"].includes(kind) ? kind : "comment",
    body: String(body).trim(),
    payload: payload || null,
    author_email: recipient?.email || null,
  }).select().single();

  if (error) { res.status(500).json({ message: error.message }); return; }

  await Promise.all([
    logEvent(proposal.id, recipient?.id || null, "commented", node_id || null, { kind }),
    touchClientActivity(proposal.id),
  ]);
  res.json({ note: data });
});

// POST /api/lp/p/:token/event — telemetry from the client (node opened, etc.)
router.post("/p/:token/event", async (req, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const { type, node_id, meta } = req.body || {};
  if (!type) { res.status(400).json({ message: "type is required" }); return; }
  await logEvent(proposal.id, recipient?.id || null, String(type), node_id || null, meta);
  res.json({ ok: true });
});

// POST /api/lp/p/:token/send-back — always available, however incomplete.
router.post("/p/:token/send-back", async (req, res) => {
  const resolved = await resolveToken(req.params.token);
  if (!resolved) { res.status(404).json({ message: "Not found" }); return; }
  const { proposal, recipient } = resolved;

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  const { error } = await adminSupabase.from("proposals").update({
    state: "feedback_shared",
    ball_in_court: "lexops",
    last_client_activity_at: new Date().toISOString(),
  }).eq("id", proposal.id);
  if (error) {
    console.error("[lp] send-back:", error.message);
    res.status(500).json({ message: error.message }); return;
  }

  if (message) {
    await (adminSupabase as any).from("proposal_notes").insert({
      proposal_id: proposal.id,
      node_id: null,
      kind: "comment",
      body: message,
      author_email: recipient?.email || null,
    });
  }

  const graph = await getGraph(proposal.id);
  const { data: inputs } = await (adminSupabase as any)
    .from("proposal_inputs").select("*").eq("proposal_id", proposal.id).eq("graph_version", GRAPH_VERSION);
  const progress = countNeeds(graph, inputs || []);

  await logEvent(proposal.id, recipient?.id || null, "sent_back", null, {
    answered: progress.answered, required: progress.required,
  });

  const emailResult = await sendLivingProposalSubmitted(
    LEXOPS_NOTIFY_EMAIL,
    proposal.client_name,
    proposal.name || "your proposal",
    progress.answered,
    progress.required,
    message || null,
    `${SITE_URL}/admin/living-proposals/${proposal.id}`
  );
  if (!emailResult.ok) console.error("[lp] submitted email:", emailResult.error);

  // The client is told what happens next and by when — unset expectations are
  // what make people stop checking (LIVING-PROPOSAL-PLAN.md §6b).
  res.json({ ok: true, progress, emailed: emailResult.ok });
});

// ===========================================================================
// ADMIN SIDE
// ===========================================================================

// GET /api/lp/admin/proposals — the living-proposal list.
//
// Scoped to proposals that *have* a proposal_graphs row, not every row in
// `proposals` — that table is shared with the older v2/workflow product, and
// this admin has no business listing those. A proposal enters this list the
// moment `POST /admin/proposals` creates it (which always creates an empty
// graph row in the same breath), so "has a graph" is a clean, zero-schema-change
// way to tell the two products' rows apart.
router.get("/admin/proposals", requireAdmin, async (_req, res) => {
  const { data: graphs, error: graphErr } = await (adminSupabase as any)
    .from("proposal_graphs")
    .select("proposal_id, preset, nodes, edges, updated_at, published_at")
    .eq("version", GRAPH_VERSION);
  if (graphErr) { res.status(500).json({ message: graphErr.message }); return; }
  if (!graphs?.length) { res.json({ proposals: [] }); return; }

  const ids = graphs.map((g: any) => g.proposal_id);
  const [{ data: proposals, error: propErr }, { data: recipients }] = await Promise.all([
    adminSupabase.from("proposals").select("*").in("id", ids),
    (adminSupabase as any)
      .from("proposal_recipients").select("proposal_id, token, email, first_opened_at, last_seen_at")
      .in("proposal_id", ids).is("invited_by", null),
  ]);
  if (propErr) { res.status(500).json({ message: propErr.message }); return; }

  const graphById = new Map(graphs.map((g: any) => [g.proposal_id, g]));
  const recipientById = new Map((recipients || []).map((r: any) => [r.proposal_id, r]));

  const list = (proposals || [])
    .map((p: any) => {
      const g: any = graphById.get(p.id);
      const r: any = recipientById.get(p.id);
      return {
        ...p,
        preset: g?.preset || "pipeline",
        node_count: Array.isArray(g?.nodes) ? g.nodes.length : 0,
        edge_count: Array.isArray(g?.edges) ? g.edges.length : 0,
        graph_updated_at: g?.updated_at || null,
        published_at: g?.published_at || null,
        link: r ? { token: r.token, url: `${SITE_URL}/p/${r.token}`, first_opened_at: r.first_opened_at, last_seen_at: r.last_seen_at } : null,
      };
    })
    .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  res.json({ proposals: list });
});

// POST /api/lp/admin/proposals — create a bare proposal row plus an empty
// graph in the same breath, so it appears in the list above immediately and
// the editor always has a graph row to PUT into rather than branching on
// "does one exist yet".
router.post("/admin/proposals", requireAdmin, async (req, res) => {
  const { name, client_name, client_contact_name, client_email } = req.body || {};
  if (!name?.trim()) { res.status(400).json({ message: "Proposal name is required" }); return; }

  const user = (req as any).adminUser;
  const { data: proposal, error } = await adminSupabase.from("proposals").insert({
    name: name.trim(),
    client_name: client_name?.trim() || name.trim(),
    client_contact_name: client_contact_name?.trim() || null,
    client_email: client_email?.trim() || null,
    token: makeToken(),          // legacy-shape fallback token; never surfaced — see resolveToken()
    status: "draft",
    state: "draft",
    ball_in_court: "lexops",
    created_by: user?.id || null,
  }).select().single();
  if (error) { res.status(500).json({ message: error.message }); return; }

  const { error: graphErr } = await (adminSupabase as any).from("proposal_graphs").insert({
    proposal_id: proposal.id,
    version: GRAPH_VERSION,
    preset: "pipeline",
    nodes: [],
    edges: [],
  });
  if (graphErr) {
    console.error("[lp] initial graph insert:", graphErr.message);
    res.status(500).json({ message: graphErr.message }); return;
  }

  res.json({ proposal });
});

// PATCH /api/lp/admin/proposals/:id — proposal meta. Separate from the graph
// PUT because it writes a different table (`proposals`, not `proposal_graphs`)
// — the editor calls both on save, but this is also how "mark won/lost"
// updates `state` without touching the graph at all.
router.patch("/admin/proposals/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, client_name, client_contact_name, client_email, state } = req.body || {};

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name != null) patch.name = String(name).trim();
  if (client_name != null) patch.client_name = String(client_name).trim();
  if (client_contact_name != null) patch.client_contact_name = String(client_contact_name).trim() || null;
  if (client_email != null) patch.client_email = String(client_email).trim() || null;
  if (state != null) {
    if (!["draft", "sent", "feedback_shared", "revised", "won", "lost"].includes(state)) {
      res.status(400).json({ message: "Invalid state" }); return;
    }
    patch.state = state;
  }

  const { data, error } = await adminSupabase.from("proposals").update(patch).eq("id", id).select().single();
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ proposal: data });
});

// GET /api/lp/admin/proposals/:id — proposal meta + graph in one call. The
// editor's load path: everything the two save calls (PATCH meta, PUT graph)
// will later write, read back in the same shape.
router.get("/admin/proposals/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [{ data: proposal, error }, graph] = await Promise.all([
    adminSupabase.from("proposals").select("*").eq("id", id).single(),
    getGraph(id),
  ]);
  if (error || !proposal) { res.status(404).json({ message: "Proposal not found" }); return; }
  res.json({ proposal, graph });
});

// GET /api/lp/admin/proposals/:id/graph
router.get("/admin/proposals/:id/graph", requireAdmin, async (req, res) => {
  const graph = await getGraph(String(req.params.id));
  res.json({ graph });
});

// PUT /api/lp/admin/proposals/:id/graph — author or replace the live graph
router.put("/admin/proposals/:id/graph", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { preset, headline, headline_metric, nodes, edges, deliverables, scenarios, explainers, sections } = req.body || {};
  if (!Array.isArray(nodes)) { res.status(400).json({ message: "nodes must be an array" }); return; }

  const { data, error } = await (adminSupabase as any).from("proposal_graphs").upsert({
    proposal_id: id,
    version: GRAPH_VERSION,
    preset: ["pipeline", "topology", "program"].includes(preset) ? preset : "pipeline",
    headline: headline || null,
    headline_metric: headline_metric || null,
    nodes,
    edges: Array.isArray(edges) ? edges : [],
    deliverables: Array.isArray(deliverables) ? deliverables : [],
    scenarios: Array.isArray(scenarios) ? scenarios : [],
    // Stored only when hand-authored. Left empty, the client compiles films
    // from the stages at read time (shared/explainerScript.ts) — so an author
    // gets explainers for free, and storing a compiled copy here would just
    // freeze a derivation that should track the graph it came from.
    explainers: Array.isArray(explainers) ? explainers : [],
    sections: sections && typeof sections === "object" ? sections : {},
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "proposal_id,version" }).select().single();

  if (error) {
    console.error("[lp] graph upsert:", error.message);
    const hint = /relation .* does not exist/i.test(error.message)
      ? "The proposal_graphs table is missing — run supabase/living_proposal.sql."
      : error.message;
    res.status(500).json({ message: hint }); return;
  }
  res.json({ graph: data });
});

// GET /api/lp/admin/proposals/:id/session — everything the client did
router.get("/admin/proposals/:id/session", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const [graph, inputs, notes, recipients, events] = await Promise.all([
    getGraph(id),
    (adminSupabase as any).from("proposal_inputs").select("*").eq("proposal_id", id),
    (adminSupabase as any).from("proposal_notes").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    (adminSupabase as any).from("proposal_recipients").select("*").eq("proposal_id", id).order("created_at"),
    (adminSupabase as any).from("proposal_events").select("*").eq("proposal_id", id).order("created_at", { ascending: false }).limit(500),
  ]);
  res.json({
    graph,
    inputs: inputs.data || [],
    notes: notes.data || [],
    recipients: recipients.data || [],
    events: events.data || [],
    progress: countNeeds(graph, inputs.data || []),
  });
});

// POST /api/lp/admin/proposals/:id/recipients — get or mint *the* link, and
// optionally send it.
//
// One proposal, one tracked link — deliberately, not as a current limitation.
// Per-person forwarding tracking is real complexity (LIVING-PROPOSAL-PLAN.md's
// `invited_by` chain) for a pilot that doesn't need it: edit state belongs to
// the proposal, not to whoever happens to have the link open. So this is now
// idempotent for the primary recipient (`invited_by is null`) — the first call
// mints it, every call after that reuses the same row and token. Without this,
// clicking "Preview" twice minted two tracked links for one proposal, and the
// second silently orphaned the first.
//
// `invited_by` is still accepted and still always mints fresh: a genuine
// forward is a deliberate exception to "one link", not the default path, and
// nothing in this admin's UI calls it that way today.
router.post("/admin/proposals/:id/recipients", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, name, invited_by, send, note } = req.body || {};
  if (!email) { res.status(400).json({ message: "email is required" }); return; }

  const { data: proposal } = await adminSupabase.from("proposals").select("*").eq("id", id).single();
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  let recipient: any = null;

  if (!invited_by) {
    const { data: existing } = await (adminSupabase as any)
      .from("proposal_recipients").select("*").eq("proposal_id", id).is("invited_by", null).maybeSingle();
    if (existing) {
      // Reused, not re-minted. Email/name can still drift (the admin corrected
      // a typo, say) without changing the token a client already has bookmarked.
      const patch: Record<string, any> = {};
      if (email && email !== existing.email) patch.email = email;
      if (name != null && name !== existing.name) patch.name = name || null;
      recipient = Object.keys(patch).length
        ? (await (adminSupabase as any).from("proposal_recipients").update(patch).eq("id", existing.id).select().single()).data
        : existing;
    }
  }

  if (!recipient) {
    const token = makeToken();
    const { data: created, error } = await (adminSupabase as any).from("proposal_recipients").insert({
      proposal_id: id,
      email,
      name: name || null,
      token,
      invited_by: invited_by || null,
    }).select().single();
    if (error) { res.status(500).json({ message: error.message }); return; }
    recipient = created;
  }

  const url = `${SITE_URL}/p/${recipient.token}`;
  let emailed = false;

  if (send !== false) {
    const result = await sendLivingProposalReady(
      email, name || proposal.client_name, proposal.name || "your proposal", url, note
    );
    emailed = result.ok;
    if (!result.ok) console.error("[lp] ready email:", result.error);

    // Sending is the deliberate act that starts the turn engine.
    await adminSupabase.from("proposals").update({
      state: "sent",
      ball_in_court: "client",
      current_version: GRAPH_VERSION,
    }).eq("id", id);
  }

  res.json({ recipient, url, emailed });
});

// ---------------------------------------------------------------------------
// The proposal PDF — the file the client's Download button serves.
// ---------------------------------------------------------------------------
// `pdf_url` was read-only here until now: it could only be set by running
// scripts/attach-proposal-pdfs.mjs with the service-role key, which put the
// one remaining piece of proposal authoring back in a developer's hands. These
// two routes close that.
//
// The object path is keyed by the proposal's uuid and is fixed, so re-uploading
// replaces in place rather than orphaning the previous file. It is deliberately
// *not* keyed by firm name: `proposal-assets` is a public bucket, and a
// guessable path would let anyone holding one firm's URL construct another's.
// ---------------------------------------------------------------------------
const pdfPath = (id: string) => `living-proposals/${id}/proposal.pdf`;

// POST /api/lp/admin/proposals/:id/pdf — attach or replace it.
router.post("/admin/proposals/:id/pdf", requireAdmin, upload.single("file"), async (req: any, res) => {
  const { id } = req.params;
  const file = req.file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ message: "No file uploaded" }); return; }

  // Trust the bytes, not the extension or the browser-supplied mime type —
  // this URL is handed to a client, so a mislabelled file is a broken download
  // discovered by the wrong person.
  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    res.status(400).json({ message: "That file isn't a PDF." }); return;
  }

  const { data: proposal } = await adminSupabase
    .from("proposals").select("id").eq("id", id).single();
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const path = pdfPath(id);
  const { error: upErr } = await (adminSupabase as any).storage
    .from("proposal-assets")
    .upload(path, file.buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) {
    console.error("[lp] pdf upload:", upErr.message);
    res.status(500).json({ message: `Upload failed: ${upErr.message}` }); return;
  }

  const { data: { publicUrl } } = (adminSupabase as any).storage
    .from("proposal-assets").getPublicUrl(path);

  const { error } = await adminSupabase
    .from("proposals").update({ pdf_url: publicUrl }).eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }

  res.json({ pdf_url: publicUrl, size: file.buffer.length });
});

// DELETE /api/lp/admin/proposals/:id/pdf — detach it.
router.delete("/admin/proposals/:id/pdf", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await (adminSupabase as any).storage
    .from("proposal-assets").remove([pdfPath(String(id))]).catch(() => {});
  const { error } = await adminSupabase
    .from("proposals").update({ pdf_url: null }).eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// DELETE /api/lp/admin/proposals/:id — delete a living proposal outright.
// ---------------------------------------------------------------------------
// The list page used to call the archived v2 product's DELETE for this. That
// worked only by accident: every living-proposal child table declares
// `on delete cascade` (supabase/living_proposal.sql), so the rows went. What
// did *not* go was the PDF — v2 only clears paths recorded in
// proposal_client_files, and this one isn't — leaving a deleted proposal's
// pricing publicly downloadable forever in a public bucket.
//
// Owning the route here also removes a live dependency on a product that is
// archived and expected to be deleted eventually.
// ---------------------------------------------------------------------------
router.delete("/admin/proposals/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Client-uploaded files answering `file` needs live under a different prefix
  // and are not covered by the row cascade either.
  const { data: inputs } = await (adminSupabase as any)
    .from("proposal_inputs").select("file_path").eq("proposal_id", id);
  const paths = [pdfPath(String(id)), ...(inputs || []).map((i: any) => i.file_path).filter(Boolean)];
  await (adminSupabase as any).storage.from("proposal-assets").remove(paths).catch(() => {});

  // proposal_graphs, _inputs, _notes, _recipients and _events all cascade.
  const { error } = await adminSupabase.from("proposals").delete().eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true });
});

// GET /api/lp/admin/stalled — the three buckets, computed on load
router.get("/admin/stalled", requireAdmin, async (_req, res) => {
  const { data, error } = await (adminSupabase as any)
    .from("stalled_proposals").select("*");
  if (error) {
    const hint = /relation .* does not exist/i.test(error.message)
      ? "The stalled_proposals view is missing — run supabase/living_proposal.sql."
      : error.message;
    res.status(500).json({ message: hint }); return;
  }
  res.json({ stalled: data || [] });
});

export default router;
