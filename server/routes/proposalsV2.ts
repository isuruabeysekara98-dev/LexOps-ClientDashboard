import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendV2ProposalInvite } from "../email";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);

// Robust PDF text extraction using pdfjs-dist (handles browser-printed PDFs, design-tool PDFs, etc.)
async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist ships only ESM builds — must use dynamic import
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Disable web worker — not available in Node.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: "",
  });

  const pdf: any = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: any[] = content.items;
    // Reconstruct reading order: sort by descending Y then ascending X
    items.sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      if (Math.abs(dy) > 3) return dy;
      return a.transform[4] - b.transform[4];
    });
    let prev: any = null;
    const parts: string[] = [];
    for (const item of items) {
      if (prev && Math.abs(item.transform[5] - prev.transform[5]) > 8) {
        parts.push("\n");
      } else if (prev && item.transform[4] - (prev.transform[4] + (prev.width || 0)) > 10) {
        parts.push(" ");
      }
      parts.push(item.str);
      prev = item;
    }
    pages.push(parts.join(""));
  }
  return pages.join("\n\n").trim();
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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
  return crypto.randomUUID();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
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
  const { id: rawId, name, client_name, client_contact_name, client_email, pain_points, objectives, workflows } = req.body;
  const user = (req as any).adminUser;

  if (!name?.trim()) { res.status(400).json({ message: "Proposal name is required" }); return; }

  // Guard: only treat id as an existing proposal if it is a valid UUID.
  // Non-UUID strings (e.g. old p2-... tokens) must never be forwarded to Postgres.
  let proposalId = isUUID(rawId) ? rawId : null;

  if (proposalId) {
    const { error } = await adminSupabase.from("proposals").update({
      name: name.trim(),
      client_name: client_name?.trim() || null,
      client_contact_name: client_contact_name?.trim() || null,
      client_email: client_email?.trim() || null,
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
      ? adminSupabase.from("workflow_runs").select("id, workflow_id, output_json, created_at").in("workflow_id", workflowIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    workflowIds.length
      ? adminSupabase.from("workflow_submissions").select("*").in("workflow_id", workflowIds)
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

  // Fetch workflow completion summary for the email
  let workflowSummaryRows = "";
  if (wfIds.length > 0) {
    const { data: wfRows } = await adminSupabase
      .from("workflows")
      .select("name, emoji")
      .in("id", wfIds)
      .order("order_index");
    const { data: subRows } = await adminSupabase
      .from("workflow_submissions")
      .select("workflow_id, feedback_text, proceeded")
      .in("workflow_id", wfIds);
    const { data: runRows } = await adminSupabase
      .from("workflow_runs")
      .select("workflow_id")
      .in("workflow_id", wfIds);

    workflowSummaryRows = (wfRows || []).map((wf: any) => {
      const sub = (subRows || []).find((s: any) => s.workflow_id === wf.id);
      const runCount = (runRows || []).filter((r: any) => r.workflow_id === wf.id).length;
      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E3DC;font-size:14px;color:#1A1A18;">
            ${wf.emoji || "🔷"} ${wf.name}
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E3DC;font-size:13px;color:#6B6B5F;text-align:center;">${runCount}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #E5E3DC;font-size:13px;color:${sub?.proceeded ? "#059669" : "#D97706"};text-align:center;font-weight:600;">
            ${sub?.proceeded ? "✓ Complete" : "Pending"}
          </td>
        </tr>
        ${sub?.feedback_text ? `<tr><td colspan="3" style="padding:6px 14px 12px;border-bottom:1px solid #E5E3DC;font-size:12px;color:#6B6B5F;font-style:italic;">💬 "${sub.feedback_text}"</td></tr>` : ""}
      `;
    }).join("");
  }

  const baseUrl = process.env.SITE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const adminLink = `${baseUrl}/admin/proposals/${id}`;

  const submitEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F3EF;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E3DC;">

        <!-- Header -->
        <tr>
          <td style="background:#0B4F4F;padding:28px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;font-family:Georgia,serif;">
                  LexOps
                </td>
                <td style="padding-left:10px;">
                  <span style="background:rgba(255,255,255,0.15);color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:4px;padding:2px 8px;">
                    Portal
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Badge -->
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;border-radius:99px;padding:4px 14px;font-size:12px;font-weight:600;">
              📬 Proposal submitted
            </span>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:16px 36px 8px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1A18;letter-spacing:-0.02em;font-family:Georgia,serif;line-height:1.3;">
              ${proposal.name || "Proposal"}
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:#6B6B5F;">
              <strong style="color:#1A1A18;">${proposal.client_name || proposal.client_email}</strong> has submitted their final review.
              This proposal is now ready for your decision.
            </p>
          </td>
        </tr>

        ${workflowSummaryRows ? `
        <!-- Workflow summary -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9B8F;">
              Workflow summary
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E3DC;border-radius:8px;overflow:hidden;">
              <tr style="background:#F4F3EF;">
                <th style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9B9B8F;text-align:left;">Workflow</th>
                <th style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9B9B8F;text-align:center;">Runs</th>
                <th style="padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9B9B8F;text-align:center;">Status</th>
              </tr>
              ${workflowSummaryRows}
            </table>
          </td>
        </tr>
        ` : ""}

        <!-- CTA -->
        <tr>
          <td style="padding:28px 36px;">
            <a href="${adminLink}" style="display:inline-block;background:#0B4F4F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;">
              Review proposal &amp; decide →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E5E3DC;">
            <p style="margin:0;font-size:12px;color:#9B9B8F;">
              LexOps · A Teams Squared Company · <a href="${adminLink}" style="color:#0B4F4F;text-decoration:none;">View in portal</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "LexOps Portal <isuru@lex-ops.io>",
      to: "isuru@lex-ops.io",
      subject: `📬 ${proposal.client_name || proposal.client_email} submitted "${proposal.name}"`,
      html: submitEmailHtml,
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

  const baseUrl = process.env.SITE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const adminLink = `${baseUrl}/admin/proposals/${id}`;

  const changeRequestHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F3EF;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E3DC;">

        <!-- Header -->
        <tr>
          <td style="background:#0B4F4F;padding:28px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;font-family:Georgia,serif;">
                  LexOps
                </td>
                <td style="padding-left:10px;">
                  <span style="background:rgba(255,255,255,0.15);color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:4px;padding:2px 8px;">
                    Portal
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Badge -->
        <tr>
          <td style="padding:32px 36px 0;">
            <span style="background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;border-radius:99px;padding:4px 14px;font-size:12px;font-weight:600;">
              ↩️ Changes requested
            </span>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:16px 36px 8px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1A18;letter-spacing:-0.02em;font-family:Georgia,serif;line-height:1.3;">
              ${proposal.name || "Proposal"}
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:#6B6B5F;">
              <strong style="color:#1A1A18;">${proposal.client_name || proposal.client_email}</strong> has reviewed the proposal and is requesting changes before they proceed.
            </p>
          </td>
        </tr>

        ${note ? `
        <!-- Client note -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9B8F;">
              Client's note
            </p>
            <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 18px;">
              <p style="margin:0;font-size:14px;color:#5C4A1A;line-height:1.7;white-space:pre-wrap;">${note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
          </td>
        </tr>
        ` : ""}

        <!-- What to do -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9B8F;">
              Next steps
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              ${["Review the client's note above", "Edit the proposal — update workflows, stages, or context as needed", "Re-send the updated proposal to the client"].map((step, i) => `
              <tr>
                <td style="padding:6px 0;vertical-align:top;width:28px;">
                  <span style="display:inline-block;width:20px;height:20px;background:#0B4F4F;color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:20px;">${i + 1}</span>
                </td>
                <td style="padding:6px 0;font-size:14px;color:#1A1A18;line-height:1.5;">${step}</td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 36px;">
            <a href="${adminLink}" style="display:inline-block;background:#0B4F4F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;margin-right:12px;">
              Open proposal →
            </a>
            <a href="${adminLink}/edit" style="display:inline-block;background:transparent;color:#0B4F4F;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;border:1.5px solid #0B4F4F;">
              Edit proposal
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E5E3DC;">
            <p style="margin:0;font-size:12px;color:#9B9B8F;">
              LexOps · A Teams Squared Company · <a href="${adminLink}" style="color:#0B4F4F;text-decoration:none;">View in portal</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "LexOps Portal <isuru@lex-ops.io>",
      to: "isuru@lex-ops.io",
      subject: `↩️ ${proposal.client_name || proposal.client_email} requested changes — "${proposal.name}"`,
      html: changeRequestHtml,
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
// POST /api/proposals/v2/import-pdf — upload PDF, AI-extract, create draft
// ---------------------------------------------------------------------------
router.post("/import-pdf", requireAdmin, upload.single("file"), async (req: any, res) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ message: "No file uploaded" }); return; }
  if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
    res.status(400).json({ message: "Only PDF files are supported" }); return;
  }

  let rawText = "";
  try {
    rawText = await extractPdfText(file.buffer);
  } catch (e) {
    console.error("[import-pdf] extraction error:", (e as any).message);
    res.status(422).json({ message: "Could not read PDF. If this was printed from a browser, try saving it as a PDF from the print dialog instead of 'Save as PDF'." }); return;
  }

  if (!rawText || rawText.length < 30) {
    res.status(422).json({ message: "PDF appears to contain no extractable text. Scanned image PDFs are not supported — try the Transcript tab and paste the text directly." }); return;
  }

  const truncated = rawText.slice(0, 16000);

  let extracted: any = { pain_points: [], objectives: [], workflows: [] };
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: "You are a sales development representative that works for Lex Ops. A legal AI and automations integrator for small to mid sized law firms. You must read through this proposal and extract any information and map it to the new proposal form. Use the deliverables to generate a first stab of what the automation workflow should look like step by step.",
      messages: [{
        role: "user",
        content: `Read the proposal PDF text below and return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:

{
  "name": "engagement or project title",
  "client_name": "client company or law firm name",
  "client_contact_name": "client contact person full name or null",
  "client_email": "client email address or null",
  "pain_points": ["concise pain point or challenge the client faces", "..."],
  "objectives": ["goal or desired outcome from the engagement", "..."],
  "workflows": [
    {
      "name": "Workflow name (e.g. Matter Intake Automation)",
      "emoji": "⚙️",
      "stages": [
        {
          "title": "Step title",
          "emoji": "📋",
          "description": "One or two sentences describing what this automation step does and why"
        }
      ]
    }
  ]
}

Rules:
- pain_points: up to 6 items, each a single concise sentence. Extract only what is explicitly stated.
- objectives: up to 6 items, each a single concise sentence.
- workflows: create 1–3 workflows based on the deliverables/scope of work described. Each workflow represents a distinct automation area (e.g. intake, document generation, reporting).
- stages: 3–7 steps per workflow, ordered logically as the automation would run. Make each step concrete and specific to the client's described work.
- Choose fitting emojis for workflows (⚙️ 🤖 📊 📋 🔄 📝 ✅) and stages (🔍 📥 📤 🗂️ ✉️ 📄 🧠 ✅ 🔔 📊).
- If a field cannot be found in the text, use null for strings or [] for arrays. Do not invent client details.
- Return only the JSON object — no preamble, no markdown.

PDF TEXT:
${truncated}`,
      }],
    });

    const content = msg.content[0];
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn("[import-pdf] AI extraction failed:", (e as any).message);
    extracted = { name: file.originalname.replace(/\.pdf$/i, ""), pain_points: [], objectives: [], workflows: [] };
  }

  const user = (req as any).adminUser;
  const token = makeToken();
  const { data: row, error } = await adminSupabase.from("proposals").insert({
    name: extracted.name || file.originalname.replace(/\.pdf$/i, ""),
    client_name: extracted.client_name || null,
    client_contact_name: extracted.client_contact_name || null,
    client_email: extracted.client_email || null,
    pain_points: Array.isArray(extracted.pain_points) ? extracted.pain_points : [],
    objectives: Array.isArray(extracted.objectives) ? extracted.objectives : [],
    token,
    status: "draft",
    created_by: user.id,
  }).select("id").single();

  if (error) { res.status(500).json({ message: error.message }); return; }
  const proposalId = row!.id;

  // Insert AI-generated workflows + stages
  const aiWorkflows = Array.isArray(extracted.workflows) ? extracted.workflows : [];
  for (let wi = 0; wi < aiWorkflows.length; wi++) {
    const wf = aiWorkflows[wi];
    const { data: wfRow } = await adminSupabase.from("workflows").insert({
      proposal_id: proposalId,
      name: wf.name || `Workflow ${wi + 1}`,
      emoji: wf.emoji || "⚙️",
      order_index: wi,
    }).select("id").single();
    if (!wfRow) continue;

    const aiStages = Array.isArray(wf.stages) ? wf.stages : [];
    if (aiStages.length > 0) {
      await adminSupabase.from("workflow_stages").insert(
        aiStages.map((s: any, si: number) => ({
          workflow_id: wfRow.id,
          order_index: si,
          title: s.title || `Step ${si + 1}`,
          emoji: s.emoji || "📋",
          description: s.description || "",
          stats: [],
          inputs: [],
          outputs: [],
        }))
      );
    }
  }

  res.json({ id: proposalId, extracted });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/import-transcript — paste/upload text transcript, AI-extract, create draft
// ---------------------------------------------------------------------------
router.post("/import-transcript", requireAdmin, async (req: any, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    res.status(400).json({ message: "Please provide a transcript with at least a few sentences." }); return;
  }

  const truncated = text.trim().slice(0, 16000);

  let extracted: any = { pain_points: [], objectives: [], workflows: [] };
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: "You are a sales development representative that works for Lex Ops. A legal AI and automations integrator for small to mid sized law firms. You must read through this transcript or meeting notes and extract any information and map it to a new proposal form. Use the deliverables, scope, and client pain points discussed to generate a first stab of what the automation workflow should look like step by step.",
      messages: [{
        role: "user",
        content: `Read the transcript or meeting notes below and return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:

{
  "name": "engagement or project title derived from the discussion",
  "client_name": "client company or law firm name",
  "client_contact_name": "client contact person full name or null",
  "client_email": "client email address or null",
  "pain_points": ["concise pain point or challenge the client faces", "..."],
  "objectives": ["goal or desired outcome from the engagement", "..."],
  "workflows": [
    {
      "name": "Workflow name (e.g. Matter Intake Automation)",
      "emoji": "⚙️",
      "stages": [
        {
          "title": "Step title",
          "emoji": "📋",
          "description": "One or two sentences describing what this automation step does and why"
        }
      ]
    }
  ]
}

Rules:
- pain_points: up to 6 items, each a single concise sentence. Extract only what is explicitly stated or implied.
- objectives: up to 6 items, each a single concise sentence.
- workflows: create 1–3 workflows based on the deliverables/scope discussed. Each workflow represents a distinct automation area (e.g. intake, document generation, reporting).
- stages: 3–7 steps per workflow, ordered logically as the automation would run. Make each step concrete and specific to the client's described work.
- Choose fitting emojis for workflows (⚙️ 🤖 📊 📋 🔄 📝 ✅) and stages (🔍 📥 📤 🗂️ ✉️ 📄 🧠 ✅ 🔔 📊).
- If a field cannot be found in the text, use null for strings or [] for arrays. Do not invent client details.
- Return only the JSON object — no preamble, no markdown.

TRANSCRIPT:
${truncated}`,
      }],
    });

    const content = msg.content[0];
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn("[import-transcript] AI extraction failed:", (e as any).message);
    extracted = { name: "Imported from transcript", pain_points: [], objectives: [], workflows: [] };
  }

  const user = (req as any).adminUser;
  const token = makeToken();
  const { data: row, error } = await adminSupabase.from("proposals").insert({
    name: extracted.name || "Imported from transcript",
    client_name: extracted.client_name || null,
    client_contact_name: extracted.client_contact_name || null,
    client_email: extracted.client_email || null,
    pain_points: Array.isArray(extracted.pain_points) ? extracted.pain_points : [],
    objectives: Array.isArray(extracted.objectives) ? extracted.objectives : [],
    token,
    status: "draft",
    created_by: user.id,
  }).select("id").single();

  if (error) { res.status(500).json({ message: error.message }); return; }
  const proposalId = row!.id;

  // Insert AI-generated workflows + stages
  const aiWorkflows = Array.isArray(extracted.workflows) ? extracted.workflows : [];
  for (let wi = 0; wi < aiWorkflows.length; wi++) {
    const wf = aiWorkflows[wi];
    const { data: wfRow } = await adminSupabase.from("workflows").insert({
      proposal_id: proposalId,
      name: wf.name || `Workflow ${wi + 1}`,
      emoji: wf.emoji || "⚙️",
      order_index: wi,
    }).select("id").single();
    if (!wfRow) continue;

    const aiStages = Array.isArray(wf.stages) ? wf.stages : [];
    if (aiStages.length > 0) {
      await adminSupabase.from("workflow_stages").insert(
        aiStages.map((s: any, si: number) => ({
          workflow_id: wfRow.id,
          order_index: si,
          title: s.title || `Step ${si + 1}`,
          emoji: s.emoji || "📋",
          description: s.description || "",
          stats: [],
          inputs: [],
          outputs: [],
        }))
      );
    }
  }

  res.json({ id: proposalId, extracted });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/duplicate — copy a proposal as a new draft
// ---------------------------------------------------------------------------
router.post("/:id/duplicate", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).adminUser;

  const { data: src } = await adminSupabase.from("proposals").select("*").eq("id", id).single();
  if (!src) { res.status(404).json({ message: "Proposal not found" }); return; }

  const { data: srcWorkflows } = await adminSupabase
    .from("workflows").select("*").eq("proposal_id", id).order("order_index");

  const workflowIds = (srcWorkflows || []).map((w: any) => w.id);
  const [stagesRes, docReqsRes] = await Promise.all([
    workflowIds.length
      ? adminSupabase.from("workflow_stages").select("*").in("workflow_id", workflowIds).order("order_index")
      : Promise.resolve({ data: [] as any[] }),
    workflowIds.length
      ? adminSupabase.from("workflow_document_requirements").select("*").in("workflow_id", workflowIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const token = makeToken();
  const { data: newProposal, error } = await adminSupabase.from("proposals").insert({
    name: `Copy of ${src.name || "Untitled"}`,
    client_name: src.client_name,
    client_contact_name: src.client_contact_name,
    client_email: src.client_email,
    client_company_name: src.client_company_name,
    pain_points: src.pain_points || [],
    objectives: src.objectives || [],
    persona: src.persona || {},
    stages: src.stages || [],
    token,
    status: "draft",
    created_by: user.id,
  }).select("id").single();

  if (error) { res.status(500).json({ message: error.message }); return; }
  const newId = newProposal!.id;

  for (const wf of (srcWorkflows || []) as any[]) {
    const { data: newWf } = await adminSupabase.from("workflows").insert({
      proposal_id: newId,
      name: wf.name,
      emoji: wf.emoji,
      order_index: wf.order_index,
    }).select("id").single();
    if (!newWf) continue;

    const wfStages = ((stagesRes as any).data || []).filter((s: any) => s.workflow_id === wf.id);
    if (wfStages.length) {
      await adminSupabase.from("workflow_stages").insert(
        wfStages.map(({ id: _sid, workflow_id: _wid, ...rest }: any) => ({ ...rest, workflow_id: newWf.id }))
      );
    }

    const wfDocReqs = ((docReqsRes as any).data || []).filter((d: any) => d.workflow_id === wf.id);
    if (wfDocReqs.length) {
      await adminSupabase.from("workflow_document_requirements").insert(
        wfDocReqs.map(({ id: _did, workflow_id: _wid, ...rest }: any) => ({ ...rest, workflow_id: newWf.id }))
      );
    }
  }

  res.json({ id: newId });
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
      ? adminSupabase.from("workflow_runs").select("id, workflow_id, output_json, created_at").in("workflow_id", workflowIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    workflowIds.length
      ? adminSupabase.from("workflow_submissions").select("*").in("workflow_id", workflowIds)
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
// POST /api/proposals/v2/:id/send — send proposal link to client
// ---------------------------------------------------------------------------
router.post("/:id/send", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: proposal } = await adminSupabase.from("proposals").select("*").eq("id", id).single();
  if (!proposal) { res.status(404).json({ message: "Proposal not found" }); return; }

  const email = proposal.client_email?.trim();
  if (!email) { res.status(400).json({ message: "Client email is required before sending" }); return; }

  const proposalUrl = `${SITE_URL}/proposal/${proposal.token}`;
  const result = await sendV2ProposalInvite(email, proposal.name || "Proposal", proposalUrl);

  if (!result.ok) {
    res.status(500).json({ message: result.error || "Failed to send email" });
    return;
  }

  await adminSupabase.from("proposals").update({
    status: "sent",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/proposals/v2/:id/accept — client accepts proposal (no-auth, token-gated)
// ---------------------------------------------------------------------------
router.post("/:id/accept", async (req, res) => {
  const { id } = req.params;
  const { token, signer_name, note } = req.body;

  const proposal = await getProposalByToken(token);
  if (!proposal || proposal.id !== id) { res.status(403).json({ message: "Forbidden" }); return; }

  const frozen = ["feedback_received", "won", "lost", "converted"];
  if (frozen.includes(proposal.status)) {
    res.json({ success: true, alreadyAccepted: true }); return;
  }

  await adminSupabase.from("proposals").update({
    status: "feedback_received",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  // Notify LexOps team
  const baseUrl = process.env.SITE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const adminLink = `${baseUrl}/admin/proposals/${id}`;
  const clientName = proposal.client_contact_name || proposal.client_name || proposal.client_email || "the client";

  try {
    const { send } = await import("../email.js");
    await send({
      to: "isuru@lex-ops.io",
      subject: `✅ Proposal accepted: ${proposal.name || "Untitled"}`,
      html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F3EF;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E3DC;">
<tr><td style="background:#0B4F4F;padding:28px 36px;font-size:22px;font-weight:700;color:#FFFFFF;font-family:Georgia,serif;">LexOps Portal</td></tr>
<tr><td style="padding:32px 36px 8px;"><span style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;border-radius:99px;padding:4px 14px;font-size:12px;font-weight:600;">✅ Proposal Accepted</span></td></tr>
<tr><td style="padding:16px 36px 8px;font-size:22px;font-weight:700;color:#1A1A18;font-family:Georgia,serif;">${proposal.name || "Proposal"}</td></tr>
<tr><td style="padding:0 36px 20px;font-size:14px;color:#6B6B5F;line-height:1.7;">
  <strong style="color:#1A1A18;">${clientName}</strong> has accepted this proposal.
  ${signer_name ? `<br>Signed by: <strong style="color:#1A1A18;">${signer_name}</strong>` : ""}
  ${note ? `<br><br><em style="color:#6B6B5F;">"${note}"</em>` : ""}
</td></tr>
<tr><td style="padding:0 36px 36px;">
  <a href="${adminLink}" style="background:#0B4F4F;color:#FFFFFF;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">View Proposal →</a>
</td></tr>
</table></td></tr></table>
</body></html>`,
    });
  } catch (e) {
    console.warn("[accept] email failed:", (e as any).message);
  }

  res.json({ success: true });
});

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
