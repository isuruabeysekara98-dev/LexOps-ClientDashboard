import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendV2ProposalInvite } from "../email";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ message: "Unauthorized" }); return; }
  const token = auth.slice(7);
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ message: "Unauthorized" }); return; }
  const { data: profile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["lexops_admin", "lexops_member"].includes(profile?.role)) { res.status(403).json({ message: "Forbidden" }); return; }
  (req as any).adminUser = user;
  next();
}

function makeToken(): string {
  return `p2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ---------------------------------------------------------------------------
// GET /api/proposals/v2 — list all v2 proposals with stage counts
// ---------------------------------------------------------------------------
router.get("/", requireAdmin, async (_req, res) => {
  const { data: proposals, error } = await adminSupabase
    .from("proposals")
    .select("id, name, client_name, client_contact_name, client_email, status, created_at, updated_at, token")
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ message: error.message }); return; }
  if (!proposals || proposals.length === 0) { res.json([]); return; }

  // Compute stage counts via workflows → workflow_stages join
  const ids = proposals.map((p: any) => p.id);
  const { data: workflows } = await adminSupabase
    .from("workflows").select("id, proposal_id").in("proposal_id", ids);

  let stageCounts: Record<string, number> = {};
  if (workflows && workflows.length > 0) {
    const wfIds = workflows.map((w: any) => w.id);
    const { data: stages } = await adminSupabase
      .from("workflow_stages").select("workflow_id").in("workflow_id", wfIds);

    const wfToProposal: Record<string, string> = {};
    for (const w of workflows as any[]) wfToProposal[w.id] = w.proposal_id;

    for (const s of (stages || []) as any[]) {
      const pid = wfToProposal[s.workflow_id];
      if (pid) stageCounts[pid] = (stageCounts[pid] || 0) + 1;
    }
  }

  const result = proposals.map((p: any) => ({ ...p, stage_count: stageCounts[p.id] || 0 }));
  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2 — create or update a draft
// ---------------------------------------------------------------------------
router.post("/", requireAdmin, async (req, res) => {
  const { id, name, client_name, client_contact_name, client_email, description, pain_points, objectives, workflows } = req.body;
  const user = (req as any).adminUser;

  if (!name?.trim()) { res.status(400).json({ message: "Proposal name is required" }); return; }

  let proposalId = id || null;

  if (proposalId) {
    const { error } = await adminSupabase.from("proposals").update({
      name: name.trim(),
      client_name: client_name?.trim() || null,
      client_contact_name: client_contact_name?.trim() || null,
      client_email: client_email?.trim() || null,
      description: description || null,
      pain_points: pain_points || [],
      objectives: objectives || [],
      updated_at: new Date().toISOString(),
    }).eq("id", proposalId);
    if (error) { res.status(500).json({ message: error.message }); return; }
  } else {
    const token = makeToken();
    const { data: row, error } = await adminSupabase.from("proposals").insert({
      name: name.trim(),
      client_name: client_name?.trim() || name.trim(),
      client_contact_name: client_contact_name?.trim() || null,
      token,
      client_email: client_email?.trim() || null,
      description: description || null,
      pain_points: pain_points || [],
      objectives: objectives || [],
      status: "draft",
      created_by: user.id,
    }).select("id").single();
    if (error) { res.status(500).json({ message: error.message }); return; }
    proposalId = row!.id;
  }

  // Persist workflows
  if (Array.isArray(workflows)) {
    for (let wi = 0; wi < workflows.length; wi++) {
      const wf = workflows[wi];
      let workflowId: string | null = wf.id || null;

      if (workflowId) {
        await adminSupabase.from("workflows")
          .update({ name: wf.name || "Workflow", emoji: wf.emoji || "⚙️", order_index: wi })
          .eq("id", workflowId);
      } else {
        const { data: wfRow } = await adminSupabase.from("workflows")
          .insert({ proposal_id: proposalId, name: wf.name || "Workflow", emoji: wf.emoji || "⚙️", order_index: wi })
          .select("id").single();
        workflowId = wfRow?.id || null;
      }
      if (!workflowId) continue;

      // Stages — delete all and re-insert to preserve order cleanly
      await adminSupabase.from("workflow_stages").delete().eq("workflow_id", workflowId);
      if (Array.isArray(wf.stages) && wf.stages.length) {
        // Try inserting with stats/inputs/outputs; fall back without if columns missing
        const stageRows = wf.stages.map((s: any, si: number) => ({
          workflow_id: workflowId,
          order_index: si,
          title: s.title || "Stage",
          emoji: s.emoji || "📋",
          description: s.description || "",
          stats: s.stats || [],
          inputs: s.inputs || [],
          outputs: s.outputs || [],
        }));
        const { error: stageErr } = await adminSupabase.from("workflow_stages").insert(stageRows);
        if (stageErr) {
          // Columns may not exist yet — retry without extra JSONB columns
          await adminSupabase.from("workflow_stages").insert(
            stageRows.map(({ stats, inputs, outputs, ...rest }: any) => rest)
          );
        }
      }

      // Doc requirements — keep backward compat
      await adminSupabase.from("workflow_document_requirements").delete().eq("workflow_id", workflowId);
      if (Array.isArray(wf.doc_requirements) && wf.doc_requirements.length) {
        await adminSupabase.from("workflow_document_requirements").insert(
          wf.doc_requirements.map((d: any) => ({
            workflow_id: workflowId,
            label: d.label || "Document",
            type: ["file", "text"].includes(d.type) ? d.type : "file",
            required: d.required !== false,
          }))
        );
      }
    }
  }

  res.json({ id: proposalId });
});

// ---------------------------------------------------------------------------
// GET /api/proposals/v2/:id — load one proposal with all nested data
// ---------------------------------------------------------------------------
router.get("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [{ data: proposal }, { data: workflows }] = await Promise.all([
    adminSupabase.from("proposals").select("*").eq("id", id).single(),
    adminSupabase.from("workflows").select("*").eq("proposal_id", id).order("order_index"),
  ]);
  if (!proposal) { res.status(404).json({ message: "Not found" }); return; }

  const workflowIds = (workflows || []).map((w: any) => w.id);
  const [{ data: stages }, { data: docReqs }] = await Promise.all([
    workflowIds.length
      ? adminSupabase.from("workflow_stages").select("*").in("workflow_id", workflowIds).order("order_index")
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_document_requirements").select("*").in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const enriched = (workflows || []).map((wf: any) => ({
    ...wf,
    stages: (stages || [])
      .filter((s: any) => s.workflow_id === wf.id)
      .map((s: any) => ({
        ...s,
        stats: s.stats || [],
        inputs: s.inputs || [],
        outputs: s.outputs || [],
      })),
    doc_requirements: (docReqs || []).filter((d: any) => d.workflow_id === wf.id),
  }));

  res.json({ ...proposal, workflows: enriched });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/send — provision client account + send invite
// ---------------------------------------------------------------------------
router.post("/:id/send", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: proposal } = await adminSupabase.from("proposals").select("*").eq("id", id).single();
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const email = proposal.client_email?.trim();
  if (!email) { res.status(400).json({ message: "Client email is required before sending" }); return; }

  let clientUserId: string | null = proposal.client_user_id || null;
  let tempPassword: string | null = null;

  if (!clientUserId) {
    const { data: existing } = await adminSupabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) {
      clientUserId = existing.id;
    } else {
      tempPassword = generatePassword();
      const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createErr) { res.status(500).json({ message: `Could not create client account: ${createErr.message}` }); return; }
      clientUserId = created.user?.id || null;
      if (clientUserId) {
        await adminSupabase.from("profiles").upsert({ id: clientUserId, email, full_name: null, role: "client" });
      }
    }
  }

  await adminSupabase.from("proposals").update({
    status: "sent",
    client_user_id: clientUserId,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  await sendV2ProposalInvite(email, proposal.name || "your proposal", SITE_URL, email, tempPassword);

  await adminSupabase.from("emails_log").insert({
    proposal_id: id,
    type: "proposal_invite",
    to_email: email,
    status: "sent",
  }).catch(() => {});

  res.json({ success: true, client_user_id: clientUserId });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/status — update proposal status
// ---------------------------------------------------------------------------
router.post("/:id/status", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["draft", "sent", "viewed", "feedback_received", "won", "lost", "converted"];
  if (!allowed.includes(status)) { res.status(400).json({ message: "Invalid status" }); return; }
  const { error } = await adminSupabase.from("proposals").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ success: true, status });
});

export default router;
