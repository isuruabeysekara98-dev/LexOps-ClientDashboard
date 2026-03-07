import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { sendClientProposalInvite, sendProposalAccepted, sendProposalLink, sendProposalViewed } from "../email";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";

// ---------------------------------------------------------------------------
// AI project structure generation
// ---------------------------------------------------------------------------
async function generateProjectStructure(projectId: number, proposalStoragePath: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-structure] ANTHROPIC_API_KEY not set, inserting setup flags");
    await insertFallbackFlags(projectId, "API key not configured");
    return;
  }

  // Fetch PDF from Supabase Storage
  const { data: fileData, error: fileErr } = await adminSupabase
    .storage
    .from("proposals")
    .download(proposalStoragePath);

  if (fileErr || !fileData) {
    console.error("[ai-structure] Failed to download PDF:", fileErr?.message);
    await insertFallbackFlags(projectId, "Could not download proposal PDF");
    return;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const base64Pdf = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a legal operations project manager. Analyze the attached proposal PDF and generate a structured project plan.

Return a JSON object with this exact schema:
{
  "confidence": "high" | "medium" | "low",
  "client_summary": "2-3 sentence plain English description of what will be delivered, written for a non-technical client. Example: 'We are streamlining your client intake process and connecting it directly to Smokeball, so new matters are created automatically. This will save your team approximately 3 hours per week on manual data entry.'",
  "phases": [
    {
      "name": "Phase name",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "status": "pending",
      "progress": 0
    }
  ],
  "tasks": [
    {
      "title": "Task title",
      "assignee": "",
      "due": "YYYY-MM-DD",
      "status": "todo",
      "is_internal": true
    }
  ],
  "deliverables": [
    {
      "label": "Short deliverable name",
      "description": "One sentence describing the outcome in client-friendly language"
    }
  ],
  "flags": [
    "Question about something unclear in the proposal that needs human input"
  ]
}

Rules:
- Extract phases from the proposal scope, timeline, or deliverables sections
- Generate actionable tasks for each phase (set is_internal: true for internal work tasks)
- Generate deliverables as high-level outcome statements written in client language (e.g. "Intake form automation", "Call transcript sync to Smokeball")
- The client_summary should be warm, professional, and avoid jargon — it will be shown to the client on their first login
- Set realistic date ranges based on any timelines mentioned (if none, use 30-day increments starting from today)
- If the proposal is unclear or missing key information, set confidence to "low" and add questions to the flags array
- If you cannot extract meaningful structure, set confidence to "low" and include flags explaining what information is needed
- Always return valid JSON only, no markdown fences or extra text`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: "Analyze this proposal and generate the project structure JSON.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      await insertFallbackFlags(projectId, "AI returned no text response");
      return;
    }

    // Parse JSON — strip markdown fences if present
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    // If confidence is low, only insert flags
    if (result.confidence === "low") {
      const flags = result.flags?.length
        ? result.flags
        : ["AI could not confidently extract project structure from the proposal. Manual setup required."];
      await insertFlags(projectId, flags);
      return;
    }

    // Save client_summary on the project
    if (result.client_summary) {
      const { error: sumErr } = await adminSupabase
        .from("projects")
        .update({ client_summary: result.client_summary })
        .eq("id", projectId);
      if (sumErr) console.error("[ai-structure] client_summary update error:", sumErr.message);
    }

    // Insert phases
    if (result.phases?.length) {
      const phaseRows = result.phases.map((p: any) => ({
        project_id: projectId,
        name: p.name,
        start: p.start || null,
        end: p.end || null,
        status: p.status || "pending",
        progress: p.progress || 0,
      }));
      const { error: phaseErr } = await adminSupabase.from("phases").insert(phaseRows);
      if (phaseErr) console.error("[ai-structure] Phase insert error:", phaseErr.message);
    }

    // Insert tasks (internal work tasks)
    if (result.tasks?.length) {
      const taskRows = result.tasks.map((tk: any) => ({
        project_id: projectId,
        title: tk.title,
        assignee: tk.assignee || "",
        due: tk.due || null,
        status: tk.status || "todo",
        is_internal: tk.is_internal !== false,
        is_deliverable: false,
      }));
      const { error: taskErr } = await adminSupabase.from("tasks").insert(taskRows);
      if (taskErr) console.error("[ai-structure] Task insert error:", taskErr.message);
    }

    // Insert deliverables as tasks with is_deliverable: true, is_internal: false
    if (result.deliverables?.length) {
      const deliverableRows = result.deliverables.map((d: any) => ({
        project_id: projectId,
        title: d.label,
        assignee: "",
        due: null,
        status: "todo",
        is_internal: false,
        is_deliverable: true,
      }));
      const { error: delErr } = await adminSupabase.from("tasks").insert(deliverableRows);
      if (delErr) console.error("[ai-structure] Deliverable insert error:", delErr.message);
    }

    // Insert any flags even for medium/high confidence
    if (result.flags?.length) {
      await insertFlags(projectId, result.flags);
    }
  } catch (err: any) {
    console.error("[ai-structure] AI call failed:", err.message);
    await insertFallbackFlags(projectId, `AI call failed: ${err.message}`);
  }
}

async function insertFlags(projectId: number, flags: string[]) {
  const rows = flags.map((q) => ({
    project_id: projectId,
    question: q,
    resolved: false,
  }));
  const { error } = await adminSupabase.from("project_setup_flags").insert(rows);
  if (error) console.error("[ai-structure] Flag insert error:", error.message);
}

async function insertFallbackFlags(projectId: number, reason: string) {
  await insertFlags(projectId, [
    reason,
    "What are the key deliverables for this project?",
    "What is the expected timeline?",
    "Who are the primary stakeholders?",
  ]);
}

// Helper: get all admin emails for notifications
async function getAdminEmails(): Promise<string[]> {
  const { data } = await adminSupabase
    .from("profiles")
    .select("email")
    .eq("role", "lexops_admin");
  return (data || []).map((p: any) => p.email).filter(Boolean);
}

// ---------------------------------------------------------------------------
// POST /api/proposal/send-link
// Public endpoint — sends the proposal link email via Resend
// ---------------------------------------------------------------------------
router.post("/send-link", async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ message: "token is required" });
    return;
  }

  const { data: proposal, error: pErr } = await adminSupabase
    .from("proposals")
    .select("*, projects(name)")
    .eq("token", token)
    .single();

  if (pErr || !proposal) {
    res.status(404).json({ message: "Proposal not found" });
    return;
  }

  const proposalUrl = `${SITE_URL}/proposal/${proposal.token}`;
  const projectName = proposal.projects?.name || proposal.client_name || "your project";

  try {
    await sendProposalLink(
      proposal.client_email,
      proposal.client_name || "there",
      projectName,
      proposalUrl
    );
  } catch (err: any) {
    console.error("[send-link] Email failed:", err.message);
    res.status(500).json({ message: "Failed to send email" });
    return;
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/proposal/accept
// Public endpoint — called when a client signs a proposal.
// Looks up the proposal by token, then sends the Supabase invite email.
// ---------------------------------------------------------------------------
router.post("/accept", async (req: Request, res: Response) => {
  const { token, signer_name } = req.body;

  if (!token) {
    res.status(400).json({ message: "token is required" });
    return;
  }

  // Look up the proposal
  const { data: proposal, error: pErr } = await adminSupabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .single();

  if (pErr || !proposal) {
    res.status(404).json({ message: "Proposal not found" });
    return;
  }

  const email = proposal.client_email;
  const fullName = signer_name || proposal.client_name;

  // Update proposal status to accepted (service role bypasses RLS)
  const { error: statusErr } = await adminSupabase
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposal.id);
  if (statusErr) console.error("[accept] Proposal status update error:", statusErr.message);
  else console.log("[accept] Proposal", proposal.id, "marked as accepted");

  // Insert signature record (service role bypasses RLS)
  if (signer_name) {
    const { error: sigErr } = await adminSupabase
      .from("proposal_signatures")
      .insert({
        proposal_id: proposal.id,
        signer_name: signer_name,
        signer_email: email,
      });
    if (sigErr) console.error("[accept] Signature insert error:", sigErr.message);
    else console.log("[accept] Signature recorded for", signer_name);
  }

  // Send the invite email via Supabase Auth
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: SITE_URL,
    data: { full_name: fullName, role: "client" },
  });

  if (error) {
    // User may already exist — that's ok
    if (error.message?.includes("already been registered")) {
      res.json({ success: true, existing: true });
      return;
    }
    res.status(400).json({ message: error.message });
    return;
  }

  const newUserId = data.user.id;

  // Upsert profile row
  await adminSupabase
    .from("profiles")
    .upsert({ id: newUserId, email, full_name: fullName, role: "client" });

  let projectId = proposal.project_id;

  // Auto-create a project if the proposal doesn't have one
  if (!projectId) {
    const { data: newProject } = await adminSupabase
      .from("projects")
      .insert({
        name: `${fullName} Project`,
        client_name: proposal.client_name,
        status: "active",
        progress: 0,
      })
      .select("id")
      .single();

    if (newProject) {
      projectId = newProject.id;
      // Link proposal to the new project
      await adminSupabase
        .from("proposals")
        .update({ project_id: projectId })
        .eq("id", proposal.id);
    }
  }

  // Ensure project membership exists
  if (projectId) {
    console.log("[accept] Linking project_members:", { project_id: projectId, user_id: newUserId });
    const { error: memberErr } = await adminSupabase.from("project_members").upsert(
      { project_id: projectId, user_id: newUserId, role: "member" },
      { onConflict: "project_id,user_id" }
    );
    if (memberErr) console.error("[accept] project_members upsert error:", memberErr.message);

    // Fire-and-forget: generate project structure from proposal PDF
    if (proposal.storage_path) {
      generateProjectStructure(projectId, proposal.storage_path).catch((err) =>
        console.error("[ai-structure] Unhandled error:", err.message)
      );
    }
  }

  // Send branded invite email to the client
  const actionLink = (data.user as any).action_link || SITE_URL;
  const projectName = proposal.client_name ? `${proposal.client_name} Project` : "your project";
  try {
    await sendClientProposalInvite(email, fullName, projectName, actionLink);
  } catch (emailErr: any) {
    console.error("[accept] Client invite email failed:", emailErr.message);
  }

  // Notify all admins that proposal was accepted
  getAdminEmails().then(async (admins) => {
    for (const adminEmail of admins) {
      sendProposalAccepted(adminEmail, fullName, projectName).catch(() => {});
    }
  }).catch(() => {});

  res.json({ success: true, user_id: newUserId });
});

// ---------------------------------------------------------------------------
// POST /api/proposal/viewed
// Public endpoint — marks proposal as viewed and notifies admins
// ---------------------------------------------------------------------------
router.post("/viewed", async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ message: "token is required" });
    return;
  }

  const { data: proposal } = await adminSupabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .single();

  if (!proposal) {
    res.status(404).json({ message: "Proposal not found" });
    return;
  }

  // Update status to viewed if currently sent
  if (proposal.status === "sent") {
    await adminSupabase.from("proposals").update({ status: "viewed" }).eq("id", proposal.id);
  }

  // Notify admins
  const projectName = proposal.client_name ? `${proposal.client_name} Project` : "a project";
  getAdminEmails().then(async (admins) => {
    for (const adminEmail of admins) {
      sendProposalViewed(adminEmail, proposal.client_name || "A client", projectName).catch(() => {});
    }
  }).catch(() => {});

  res.json({ success: true });
});

export default router;
