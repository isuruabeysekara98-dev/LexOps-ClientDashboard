// ---------------------------------------------------------------------------
// The review harness — /review
// ---------------------------------------------------------------------------
// An internal index of every seeded living proposal, so the graphs can be read
// one after another before any of them is bound to a client's address.
//
// DEV ONLY, and deliberately so. This page prints recipient tokens, and a token
// is the entire credential for the proposal it belongs to — there is no second
// factor behind it. A public listing of every client's token would hand out the
// whole set. The guard below is the only thing standing between those two
// states, so don't relax it to "check a header" or "check an env var I set on
// Render". It stays off in production.
//
// Server-rendered on purpose: no client bundle, no build step, and it can be
// deleted in one file when the real admin surface exists.
// ---------------------------------------------------------------------------
import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function devOnly(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "production") { res.status(404).send("Not found"); return; }
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
}

const esc = (v: any) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// The client page humanises exactly one unit (`hrs_month`); everything else
// prints its raw key on screen. Worth flagging per graph rather than finding it
// in front of a partner.
const HUMANISED_UNITS = new Set(["hrs_month"]);

// Parked, not deleted — matched on `proposals.client_name`.
//
// These are the three graphs that aren't the `pipeline` preset (Automation Lab
// is `program`, the other two are `topology`), so they're the least-scrutinised
// thing in the set and the least like the design the week was built around.
// Hiding them keeps the review list to the shape being designed for.
//
// Nothing is destroyed by being in here: the proposal, the graph and the token
// all stay exactly as they are, `/review?all=1` still lists them, and their
// `/p/:token` links keep working. Take a name out and it comes straight back.
const PARKED = new Set(["Automation Lab", "Enable College", "Foyle Legal"]);

type Entry = {
  index: number;
  proposalId: string;
  name: string;
  clientName: string;
  state: string | null;
  ballInCourt: string | null;
  token: string | null;
  recipientEmail: string | null;
  firstOpenedAt: string | null;
  preset: string;
  headline: string | null;
  metricUnit: string | null;
  metricAmount: number | null;
  nodes: number;
  edges: number;
  needs: number;
  needsRequired: number;
  kinds: string[];
  scenarioNodes: number;
  deliverableNodes: number;
  valued: number;
  flags: string[];
};

/** Everything the harness needs, in one pass. */
async function collect(includeParked = false): Promise<{
  entries: Entry[];
  columnsMissing: boolean;
  parked: number;
}> {
  // The `deliverables` / `scenarios` columns were added to the migration after
  // it was applied, so they may not exist yet. Probe rather than assume.
  let columnsMissing = false;
  let graphs: any[] = [];

  const rich = await (adminSupabase as any)
    .from("proposal_graphs")
    .select("proposal_id,preset,headline,headline_metric,nodes,edges,deliverables,scenarios");

  if (rich.error) {
    columnsMissing = true;
    const plain = await (adminSupabase as any)
      .from("proposal_graphs")
      .select("proposal_id,preset,headline,headline_metric,nodes,edges");
    graphs = plain.data || [];
  } else {
    graphs = rich.data || [];
  }

  const ids = graphs.map((g: any) => g.proposal_id);
  if (!ids.length) return { entries: [], columnsMissing, parked: 0 };

  const [{ data: proposals }, { data: recipients }] = await Promise.all([
    adminSupabase.from("proposals").select("*").in("id", ids),
    (adminSupabase as any)
      .from("proposal_recipients")
      .select("proposal_id,token,email,first_opened_at")
      .in("proposal_id", ids),
  ]);

  const proposalById = new Map((proposals || []).map((p: any) => [p.id, p]));
  const recipientByProposal = new Map<string, any>();
  for (const r of recipients || []) {
    if (!recipientByProposal.has(r.proposal_id)) recipientByProposal.set(r.proposal_id, r);
  }

  const entries: Entry[] = graphs.map((g: any, i: number) => {
    const p: any = proposalById.get(g.proposal_id) || {};
    const r = recipientByProposal.get(g.proposal_id);
    const nodes: any[] = Array.isArray(g.nodes) ? g.nodes : [];
    const edges: any[] = Array.isArray(g.edges) ? g.edges : [];

    const allNeeds = nodes.flatMap((n) => n.needs || []);
    const metric = g.headline_metric || {};
    const flags: string[] = [];

    if (!r?.token) flags.push("no token — can't be opened");
    if (metric.unit && !HUMANISED_UNITS.has(metric.unit)) {
      flags.push(`headline prints raw: "${metric.amount} ${metric.unit}"`);
    }
    if (!nodes.length) flags.push("no nodes");
    if (!edges.length && nodes.length > 1) flags.push("no edges — every node lands in column 1");

    const nodeIds = new Set(nodes.map((n) => n.id));
    const orphan = edges.filter((e: any) => !nodeIds.has(e.from) || !nodeIds.has(e.to)).length;
    if (orphan) flags.push(`${orphan} edge(s) point at a missing node`);

    if (r?.email && !/@lex-ops\.io$/i.test(r.email)) {
      flags.push(`token is bound to ${r.email} — this one is live to a client`);
    }

    return {
      index: i,
      proposalId: g.proposal_id,
      name: p.name || "(unnamed)",
      clientName: p.client_name || "",
      state: p.state ?? null,
      ballInCourt: p.ball_in_court ?? null,
      token: r?.token ?? null,
      recipientEmail: r?.email ?? null,
      firstOpenedAt: r?.first_opened_at ?? null,
      preset: g.preset || "pipeline",
      headline: g.headline ?? null,
      metricUnit: metric.unit ?? null,
      metricAmount: metric.amount ?? null,
      nodes: nodes.length,
      edges: edges.length,
      needs: allNeeds.length,
      needsRequired: allNeeds.filter((n: any) => n.required !== false).length,
      kinds: [...new Set(nodes.map((n) => n.kind).filter(Boolean))].sort(),
      scenarioNodes: nodes.filter((n) => (n.scenarios || []).length).length,
      deliverableNodes: nodes.filter((n) => n.deliverable).length,
      valued: nodes.filter((n) => n.value?.amount != null).length,
      flags,
    };
  });

  entries.sort((a, b) => a.clientName.localeCompare(b.clientName));

  // Filter before re-indexing, so the indices in the URLs match the list the
  // rail and the prev/next arrows are walking.
  const visible = includeParked ? entries : entries.filter((e) => !PARKED.has(e.clientName));
  visible.forEach((e, i) => { e.index = i; });

  return { entries: visible, columnsMissing, parked: entries.length - visible.length };
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------
const CSS = `
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#232A34;background:#FAFBFC}
  a{color:#633dc0}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 24px 60px}
  h1{font-size:24px;margin:0 0 4px}
  .sub{color:#616568;margin:0 0 22px;font-size:14px}
  .banner{border-left:4px solid #e08a00;background:#fff8ec;padding:12px 14px;margin:0 0 20px;font-size:14px}
  .banner strong{color:#b06f00}
  .banner code{background:#fff;padding:1px 5px;border:1px solid #f0dfc0;font-size:13px}
  table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #E4E6EA}
  th,td{text-align:left;padding:9px 11px;border-bottom:1px solid #EEF0F3;vertical-align:top}
  th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#616568;font-weight:600;background:#F6F7F9}
  td.num{text-align:right;font-variant-numeric:tabular-nums;color:#41474f}
  tr:last-child td{border-bottom:none}
  .name{font-weight:600}
  .client{color:#616568;font-size:13px}
  .pill{display:inline-block;padding:1px 8px;border-radius:20px;font-size:12px;border:1px solid #d8dbe0;color:#41474f;background:#fff}
  .pill.pipeline{border-color:#c9bce6;color:#4e2f99;background:#f6f2ff}
  .pill.topology{border-color:#bcd9e6;color:#1f6b8a;background:#f0f9fd}
  .pill.program{border-color:#f0d9a8;color:#8a6100;background:#fffaf0}
  .flag{display:block;color:#b06f00;font-size:12px;margin-top:3px}
  .flag.live{color:#b3261e;font-weight:600}
  .go{display:inline-block;padding:5px 12px;border:1px solid #633dc0;color:#633dc0;text-decoration:none;font-size:13px;white-space:nowrap}
  .go:hover{background:#633dc0;color:#fff}
  /* reviewer */
  .rv{display:grid;grid-template-columns:270px 1fr;height:100vh}
  .rail{border-right:1px solid #E4E6EA;background:#fff;overflow-y:auto}
  .rail a{display:block;padding:10px 14px;border-bottom:1px solid #EEF0F3;text-decoration:none;color:#232A34;font-size:13px}
  .rail a:hover{background:#F6F7F9}
  .rail a.on{background:#633dc0;color:#fff}
  .rail a.on .client,.rail a.on .meta{color:rgba(255,255,255,.8)}
  .rail .meta{font-size:11px;color:#616568;margin-top:2px}
  .rail h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#616568;margin:0;padding:14px 14px 8px}
  .stage{display:flex;flex-direction:column;min-width:0}
  .bar{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid #E4E6EA;background:#fff;flex-wrap:wrap}
  .bar .t{font-weight:600}
  .bar .m{color:#616568;font-size:13px}
  .bar .sp{margin-left:auto;display:flex;gap:8px}
  .nav{padding:5px 12px;border:1px solid #d8dbe0;text-decoration:none;color:#232A34;font-size:13px;background:#fff}
  .nav:hover{border-color:#633dc0;color:#633dc0}
  .nav.off{opacity:.35;pointer-events:none}
  .warn{padding:8px 16px;background:#fff8ec;border-bottom:1px solid #f0dfc0;font-size:13px;color:#b06f00}
  iframe{flex:1;width:100%;border:0;background:#fff}
`;

const page = (title: string, body: string, bare = false) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body>${bare ? body : `<div class="wrap">${body}</div>`}</body></html>`;

const migrationBanner = `
  <div class="banner">
    <strong>The deliverables / scenarios columns are missing.</strong>
    <code>supabase/living_proposal.sql</code> gained them after it was last applied, so every graph
    lost its deliverable labels on seed — the rail renders on no proposal. Re-run the migration in
    the Supabase SQL editor (idempotent), then re-seed with
    <code>node --env-file=.env scripts/seed-proposal-suite.mjs</code>.
  </div>`;

// ---------------------------------------------------------------------------
// GET /review — the collection
// ---------------------------------------------------------------------------
router.get("/", devOnly, async (req, res) => {
  const showAll = req.query.all === "1";
  const { entries, columnsMissing, parked } = await collect(showAll);

  const rows = entries.map((e) => `
    <tr>
      <td>
        <div class="name">${esc(e.name)}</div>
        <div class="client">${esc(e.clientName)}</div>
        ${e.flags.map((f) => `<span class="flag${/live to a client/.test(f) ? " live" : ""}">${esc(f)}</span>`).join("")}
      </td>
      <td><span class="pill ${esc(e.preset)}">${esc(e.preset)}</span></td>
      <td class="num">${e.nodes}</td>
      <td class="num">${e.edges}</td>
      <td class="num">${e.needsRequired} / ${e.needs}</td>
      <td class="num">${e.scenarioNodes}</td>
      <td class="num">${e.valued}</td>
      <td>${e.firstOpenedAt ? esc(e.firstOpenedAt.slice(0, 10)) : "<span style='color:#9aa0a8'>never</span>"}</td>
      <td>${e.token ? `<a class="go" href="/review/${e.index}">Review →</a>` : ""}</td>
    </tr>`).join("");

  res.send(page("Proposal review", `
    <h1>Proposal review</h1>
    <p class="sub">
      ${entries.length} seeded graph${entries.length === 1 ? "" : "s"}. Dev only — this page prints
      recipient tokens, and a token is the whole credential for the proposal behind it.
    </p>
    ${columnsMissing ? migrationBanner : ""}
    <table>
      <thead><tr>
        <th>Proposal</th><th>Preset</th><th>Nodes</th><th>Edges</th>
        <th>Needs<br>req / all</th><th>Nodes w/<br>scenarios</th><th>Sized on<br>a number</th>
        <th>First opened</th><th></th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="9">Nothing seeded yet.</td></tr>`}</tbody>
    </table>
    ${parked > 0 ? `
      <p class="sub" style="margin-top:16px">
        ${parked} parked and hidden from this list — ${[...PARKED].map(esc).join(", ")}.
        Nothing was deleted; their graphs and links still work.
        <a href="/review?all=1">Show them anyway</a>.
      </p>` : ""}
    ${showAll ? `<p class="sub" style="margin-top:16px"><a href="/review">Back to the working list</a></p>` : ""}
  `));
});

// ---------------------------------------------------------------------------
// GET /review/:index — one proposal, with the collection alongside it
// ---------------------------------------------------------------------------
router.get("/:index", devOnly, async (req, res) => {
  const showAll = req.query.all === "1";
  const { entries, columnsMissing } = await collect(showAll);
  const i = Number.parseInt(req.params.index, 10);

  if (!entries.length) { res.redirect("/review"); return; }
  if (!Number.isFinite(i) || i < 0 || i >= entries.length) { res.redirect("/review/0"); return; }

  const e = entries[i];
  // Carry the flag, or stepping through the full list would drop you back into
  // the working one halfway.
  const q = showAll ? "?all=1" : "";
  const prev = i > 0 ? `/review/${i - 1}${q}` : null;
  const next = i < entries.length - 1 ? `/review/${i + 1}${q}` : null;

  const rail = entries.map((x) => `
    <a class="${x.index === i ? "on" : ""}" href="/review/${x.index}${q}">
      <div>${esc(x.name)}</div>
      <div class="meta">${esc(x.preset)} · ${x.nodes} nodes · ${x.needsRequired} required</div>
    </a>`).join("");

  const warnings = [
    ...e.flags,
    ...(columnsMissing ? ["No deliverable rail on any graph until the migration is re-run."] : []),
  ];

  res.send(page(`${e.name} — review`, `
    <div class="rv">
      <nav class="rail">
        <h2>${entries.length} proposals</h2>
        ${rail}
      </nav>
      <div class="stage">
        <div class="bar">
          <span class="t">${esc(e.name)}</span>
          <span class="m">${esc(e.preset)} · ${e.nodes} nodes · ${e.edges} edges · ${e.needsRequired} required needs${
            e.metricAmount != null ? ` · headline ${esc(String(e.metricAmount))} ${esc(e.metricUnit || "")}` : ""
          }</span>
          <span class="sp">
            <a class="nav ${prev ? "" : "off"}" href="${prev || "#"}">← Previous</a>
            <a class="nav ${next ? "" : "off"}" href="${next || "#"}">Next →</a>
            <a class="nav" href="/p/${esc(e.token!)}" target="_blank" rel="noopener">Open on its own ↗</a>
            <a class="nav" href="/review">All ${entries.length}</a>
          </span>
        </div>
        ${warnings.length ? `<div class="warn">${warnings.map(esc).join(" · ")}</div>` : ""}
        <iframe src="/p/${esc(e.token!)}" title="${esc(e.name)}"></iframe>
      </div>
    </div>
  `, true));
});

export default router;
