import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendV2ProposalInvite } from "../email";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";
const RUN_CAP = 10;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function getProposalByToken(token: string) {
  const { data } = await adminSupabase.from("proposals").select("*").eq("token", token).single();
  return data as any | null;
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

      await adminSupabase.from("workflow_stages").delete().eq("workflow_id", workflowId);
      if (Array.isArray(wf.stages) && wf.stages.length) {
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
          await adminSupabase.from("workflow_stages").insert(
            stageRows.map(({ stats, inputs, outputs, ...rest }: any) => rest)
          );
        }
      }

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
// GET /api/proposals/v2/by-token/:token — public (token = identity)
// Enriched with per-workflow review state (run_count, latest_run, feedback)
// ---------------------------------------------------------------------------
router.get("/by-token/:token", async (req, res) => {
  const { token } = req.params;
  const { data: proposal } = await adminSupabase
    .from("proposals").select("*").eq("token", token).single();
  if (!proposal) { res.status(404).json({ message: "Not found" }); return; }

  const { data: workflows } = await adminSupabase
    .from("workflows").select("*").eq("proposal_id", proposal.id).order("order_index");

  const workflowIds = (workflows || []).map((w: any) => w.id);

  const [{ data: stages }, { data: docReqs }, runsResult, subsResult] = await Promise.all([
    workflowIds.length
      ? adminSupabase.from("workflow_stages").select("*").in("workflow_id", workflowIds).order("order_index")
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_document_requirements").select("*").in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_runs").select("id, workflow_id, output_json, created_at").in("workflow_id", workflowIds).order("created_at", { ascending: false }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
    workflowIds.length
      ? adminSupabase.from("workflow_submissions").select("*").in("workflow_id", workflowIds).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ]);

  const runs = (runsResult as any).data || [];
  const subs = (subsResult as any).data || [];

  const enriched = (workflows || []).map((wf: any) => {
    const wfRuns = runs.filter((r: any) => r.workflow_id === wf.id);
    const sub = subs.find((s: any) => s.workflow_id === wf.id);
    return {
      ...wf,
      stages: (stages || [])
        .filter((s: any) => s.workflow_id === wf.id)
        .map((s: any) => ({ ...s, stats: s.stats || [], inputs: s.inputs || [], outputs: s.outputs || [] })),
      doc_requirements: (docReqs || []).filter((d: any) => d.workflow_id === wf.id),
      run_count: wfRuns.length,
      latest_run: wfRuns[0] || null,
      feedback_text: sub?.feedback_text || null,
      has_proceeded: sub?.proceeded || false,
    };
  });

  if (proposal.status === "sent") {
    await adminSupabase.from("proposals").update({ status: "viewed", updated_at: new Date().toISOString() }).eq("id", proposal.id);
  }

  res.json({ ...proposal, workflows: enriched });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/demo/run — call Claude, save run result
// ---------------------------------------------------------------------------
router.post("/demo/run", async (req, res) => {
  const { token, workflow_id, input_text, pasted_text, file_content } = req.body;
  if (!token || !workflow_id) { res.status(400).json({ message: "token and workflow_id are required" }); return; }

  const proposal = await getProposalByToken(token);
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const { data: workflow } = await adminSupabase.from("workflows").select("*").eq("id", workflow_id).single();
  if (!workflow || workflow.proposal_id !== proposal.id) { res.status(404).json({ message: "Workflow not found" }); return; }

  const { data: stages } = await adminSupabase
    .from("workflow_stages").select("*").eq("workflow_id", workflow_id).order("order_index");

  const { count } = await adminSupabase
    .from("workflow_runs").select("*", { count: "exact", head: true }).eq("workflow_id", workflow_id);
  if ((count || 0) >= RUN_CAP) {
    res.status(429).json({ message: `You've reached the ${RUN_CAP}-run limit for this workflow.` }); return;
  }

  const stageList = (stages || []) as any[];
  const frameworkText = stageList.map((s: any, i: number) =>
    `Stage ${i + 1}: ${s.emoji} ${s.title}\n${s.description}`
  ).join("\n\n");

  const painPoints = Array.isArray(proposal.pain_points) ? proposal.pain_points.join("; ") : (proposal.pain_points || "");
  const objectives = Array.isArray(proposal.objectives) ? proposal.objectives.join("; ") : (proposal.objectives || "");
  const clientInput = [input_text, pasted_text, file_content].filter(Boolean).join("\n\n---\n\n") || "No specific input provided — generate a representative example based on the client context.";

  const stageCount = stageList.length;
  const outputSchema = stageList.map((s: any, i: number) => `{"stage_index":${i},"emoji":"${s.emoji}","title":"${s.title}","content":"..."}`).join(",\n  ");

  const systemPrompt = `You are a legal operations expert demonstrating how a structured workflow framework applies to a client's specific situation. Your outputs are professional, concrete, and directly useful. Always respond ONLY with valid JSON — no markdown, no preamble.`;

  const userPrompt = `WORKFLOW: ${workflow.emoji} ${workflow.name}

FRAMEWORK (apply these stages in order):
${frameworkText}

CLIENT CONTEXT:
Pain points: ${painPoints || "Not specified"}
Objectives: ${objectives || "Not specified"}

CLIENT INPUT:
${clientInput}

INSTRUCTION: Process the client's input through each of the ${stageCount} framework stages above, producing detailed and actionable output for each stage as it would apply to this specific client.

Return ONLY a JSON array with exactly ${stageCount} objects:
[
  ${outputSchema}
]

Each "content" field should be 2–5 paragraphs of professional, specific analysis for that stage. Do NOT wrap in markdown code blocks.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0]?.type === "text" ? (response.content[0] as any).text : "";
    let outputJson: any[] = [];
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      outputJson = JSON.parse(cleaned);
      if (!Array.isArray(outputJson)) throw new Error("Not an array");
    } catch {
      outputJson = stageList.map((s: any, i: number) => ({
        stage_index: i, emoji: s.emoji, title: s.title, content: rawText,
      }));
    }

    const { data: runRow } = await adminSupabase.from("workflow_runs").insert({
      workflow_id,
      proposal_id: proposal.id,
      input_text: input_text || null,
      pasted_text: pasted_text || null,
      file_content: file_content || null,
      output_json: outputJson,
    }).select("id").single();

    const newCount = (count || 0) + 1;
    res.json({ run_id: runRow?.id, output_json: outputJson, run_number: newCount, runs_remaining: RUN_CAP - newCount });

  } catch (err: any) {
    console.error("[demo/run] Anthropic error:", err.message);
    res.status(500).json({ message: "Demo generation failed. Please try again in a moment." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/workflow/:wfId/feedback — save or update feedback
// ---------------------------------------------------------------------------
router.post("/workflow/:wfId/feedback", async (req, res) => {
  const { wfId } = req.params;
  const { token, feedback_text, final_run_id } = req.body;

  const proposal = await getProposalByToken(token);
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const { data: wf } = await adminSupabase.from("workflows").select("id, proposal_id").eq("id", wfId).single();
  if (!wf || wf.proposal_id !== proposal.id) { res.status(403).json({ message: "Forbidden" }); return; }

  const { error } = await adminSupabase.from("workflow_submissions").upsert({
    workflow_id: wfId,
    proposal_id: proposal.id,
    feedback_text: feedback_text?.trim() || null,
    final_run_id: final_run_id || null,
    proceeded: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workflow_id" });

  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/workflow/:wfId/proceed — mark workflow complete
// ---------------------------------------------------------------------------
router.post("/workflow/:wfId/proceed", async (req, res) => {
  const { wfId } = req.params;
  const { token } = req.body;

  const proposal = await getProposalByToken(token);
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const { data: wf } = await adminSupabase.from("workflows").select("id, proposal_id").eq("id", wfId).single();
  if (!wf || wf.proposal_id !== proposal.id) { res.status(403).json({ message: "Forbidden" }); return; }

  const [{ count: runCount }, { data: sub }] = await Promise.all([
    adminSupabase.from("workflow_runs").select("*", { count: "exact", head: true }).eq("workflow_id", wfId),
    adminSupabase.from("workflow_submissions").select("feedback_text").eq("workflow_id", wfId).maybeSingle(),
  ]);

  if (!runCount || runCount < 1) {
    res.status(400).json({ message: "Please run the demo at least once before proceeding." }); return;
  }
  if (!sub?.feedback_text?.trim()) {
    res.status(400).json({ message: "Please save your feedback before proceeding." }); return;
  }

  const { error } = await adminSupabase.from("workflow_submissions").upsert({
    workflow_id: wfId,
    proposal_id: proposal.id,
    feedback_text: sub.feedback_text,
    proceeded: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workflow_id" });

  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/submit-final — client submits final review
// ---------------------------------------------------------------------------
router.post("/:id/submit-final", async (req, res) => {
  const { id } = req.params;
  const { token } = req.body;

  const proposal = await getProposalByToken(token);
  if (!proposal || proposal.id !== id) { res.status(403).json({ message: "Forbidden" }); return; }

  const { data: workflows } = await adminSupabase.from("workflows").select("id").eq("proposal_id", id);
  const wfIds = (workflows || []).map((w: any) => w.id);

  if (wfIds.length > 0) {
    const { data: subs } = await adminSupabase.from("workflow_submissions").select("proceeded").in("workflow_id", wfIds);
    const proceededCount = (subs || []).filter((s: any) => s.proceeded).length;
    if (proceededCount < wfIds.length) {
      res.status(400).json({ message: "Please complete all workflows before submitting." }); return;
    }
  }

  await adminSupabase.from("proposals").update({
    status: "feedback_received",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "LexOps Portal <isuru@lex-ops.io>",
      to: "isuru@lex-ops.io",
      subject: `[Proposal submitted] ${proposal.name}`,
      html: `<p><strong>${proposal.client_name || proposal.client_email}</strong> has submitted their final review for <strong>${proposal.name}</strong>.</p><p>Log in to the portal to review and mark as Won or Lost.</p>`,
    });
  } catch (e) {
    console.warn("[submit-final] email failed:", (e as any).message);
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/request-changes — client requests changes
// ---------------------------------------------------------------------------
router.post("/:id/request-changes", async (req, res) => {
  const { id } = req.params;
  const { token, note } = req.body;

  const proposal = await getProposalByToken(token);
  if (!proposal || proposal.id !== id) { res.status(403).json({ message: "Forbidden" }); return; }

  await adminSupabase.from("proposals").update({
    status: "sent",
    change_request_note: note?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "LexOps Portal <isuru@lex-ops.io>",
      to: "isuru@lex-ops.io",
      subject: `[Change request] ${proposal.name}`,
      html: `<p><strong>${proposal.client_name || proposal.client_email}</strong> has requested changes to <strong>${proposal.name}</strong>.</p>${note ? `<p><em>Note:</em> ${note}</p>` : ""}`,
    });
  } catch (e) {
    console.warn("[request-changes] email failed:", (e as any).message);
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /api/proposals/v2/runs/:runId/pdf — download PDF for a run
// ---------------------------------------------------------------------------
router.get("/runs/:runId/pdf", async (req, res) => {
  const { runId } = req.params;
  const { data: run } = await adminSupabase
    .from("workflow_runs").select("id, output_json, workflow_id").eq("id", runId).single();
  if (!run) { res.status(404).json({ message: "Run not found" }); return; }

  const { data: wf } = await adminSupabase
    .from("workflows").select("name, emoji").eq("id", run.workflow_id).single();

  const output: any[] = (run as any).output_json || [];

  try {
    const PDFDocument = require("pdfkit") as any;
    const doc = new PDFDocument({ margin: 56, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="workflow-results.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#0B4F4F")
      .text(`${(wf as any)?.emoji || ""} ${(wf as any)?.name || "Workflow Results"}`, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#6B6B5F")
      .text(`LexOps · Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { align: "left" });
    doc.moveDown(1.5);
    doc.moveTo(56, doc.y).lineTo(doc.page.width - 56, doc.y).strokeColor("#E5E3DC").lineWidth(1).stroke();
    doc.moveDown(1.5);

    output.forEach((stage: any, i: number) => {
      const stageTitle = `${stage.emoji || ""} ${stage.title || `Stage ${i + 1}`}`.trim();
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#0B4F4F").text(stageTitle);
      doc.moveDown(0.4);
      const content = (stage.content || "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      doc.fontSize(10.5).font("Helvetica").fillColor("#1A1A18").text(content, { lineGap: 3 });
      doc.moveDown(1.5);
      if (i < output.length - 1) {
        doc.moveTo(56, doc.y).lineTo(doc.page.width - 56, doc.y).strokeColor("#E8E6DF").lineWidth(0.5).stroke();
        doc.moveDown(1.5);
      }
    });

    doc.end();
  } catch (err: any) {
    console.error("[pdf] generation error:", err.message);
    res.status(500).json({ message: "PDF generation failed." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/proposals/v2/:id — load one proposal with all nested data + run state
// ---------------------------------------------------------------------------
router.get("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [{ data: proposal }, { data: workflows }] = await Promise.all([
    adminSupabase.from("proposals").select("*").eq("id", id).single(),
    adminSupabase.from("workflows").select("*").eq("proposal_id", id).order("order_index"),
  ]);
  if (!proposal) { res.status(404).json({ message: "Not found" }); return; }

  const workflowIds = (workflows || []).map((w: any) => w.id);

  const [{ data: stages }, { data: docReqs }, runsResult, subsResult] = await Promise.all([
    workflowIds.length
      ? adminSupabase.from("workflow_stages").select("*").in("workflow_id", workflowIds).order("order_index")
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_document_requirements").select("*").in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_runs").select("id, workflow_id, output_json, created_at").in("workflow_id", workflowIds).order("created_at", { ascending: false }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
    workflowIds.length
      ? adminSupabase.from("workflow_submissions").select("*").in("workflow_id", workflowIds).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ]);

  const runs = (runsResult as any).data || [];
  const subs = (subsResult as any).data || [];

  const enriched = (workflows || []).map((wf: any) => {
    const wfRuns = runs.filter((r: any) => r.workflow_id === wf.id);
    const sub = subs.find((s: any) => s.workflow_id === wf.id);
    return {
      ...wf,
      stages: (stages || [])
        .filter((s: any) => s.workflow_id === wf.id)
        .map((s: any) => ({ ...s, stats: s.stats || [], inputs: s.inputs || [], outputs: s.outputs || [] })),
      doc_requirements: (docReqs || []).filter((d: any) => d.workflow_id === wf.id),
      run_count: wfRuns.length,
      latest_run: wfRuns[0] || null,
      feedback_text: sub?.feedback_text || null,
      has_proceeded: sub?.proceeded || false,
    };
  });

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
// POST /api/proposals/v2/:id/status — update proposal status (admin)
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
