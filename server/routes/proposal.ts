import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendClientProposalInvite, sendProposalAccepted, sendProposalLink, sendProposalViewed } from "../email";
import { generateProjectStructure } from "../lib/generateProject";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";

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
  console.log('[proposal] /accept hit', req.body);
  const { token, signer_name, signer_note } = req.body;

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

  // Update proposal status + persist the client note.
  // signer_note is stored in proposals.signer_note — requires the column to exist
  // (run: ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_note text;).
  // If the column is missing the update fails silently so acceptance still completes.
  const notePayload: Record<string, any> = { status: "accepted", updated_at: new Date().toISOString() };
  if (signer_note?.trim()) notePayload.signer_note = signer_note.trim();

  const { error: statusErr } = await adminSupabase
    .from("proposals")
    .update(notePayload)
    .eq("id", proposal.id);
  if (statusErr) {
    console.error("[accept] Proposal status update error:", statusErr.message);
    // If the column didn't exist, retry without it so acceptance still goes through
    if (signer_note && statusErr.message?.toLowerCase().includes("column")) {
      await adminSupabase.from("proposals")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", proposal.id);
    }
  } else {
    console.log("[accept] Proposal", proposal.id, "marked as accepted");
  }

  // Insert signature record (service role bypasses RLS)
  if (signer_name) {
    const sigRow: Record<string, any> = {
      proposal_id: proposal.id,
      signer_name: signer_name,
      signer_email: email,
    };
    if (signer_note?.trim()) sigRow.note = signer_note.trim();

    const { error: sigErr } = await adminSupabase
      .from("proposal_signatures")
      .insert(sigRow);
    if (sigErr) {
      console.error("[accept] Signature insert error:", sigErr.message);
      // Retry without note column if it doesn't exist yet
      if (signer_note && sigErr.message?.toLowerCase().includes("column")) {
        await adminSupabase.from("proposal_signatures").insert({
          proposal_id: proposal.id, signer_name, signer_email: email,
        });
      }
    } else {
      console.log("[accept] Signature recorded for", signer_name);
    }
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
    console.log("[accept] Linking project_members:", {
      project_id: projectId,
      project_id_type: typeof projectId,
      user_id: newUserId,
      user_id_type: typeof newUserId,
    });

    // Try upsert first
    const { error: memberErr } = await adminSupabase.from("project_members").upsert(
      { project_id: String(projectId), user_id: String(newUserId), role: "member" },
      { onConflict: "project_id,user_id" }
    );

    if (memberErr) {
      console.error("[accept] project_members upsert FAILED:", JSON.stringify(memberErr));
      // Fallback: try plain insert
      console.log("[accept] Attempting fallback insert...");
      const { error: insertErr } = await adminSupabase.from("project_members").insert({
        project_id: String(projectId),
        user_id: String(newUserId),
        role: "member",
      });
      if (insertErr) {
        console.error("[accept] project_members fallback insert FAILED:", JSON.stringify(insertErr));
      } else {
        console.log("[accept] Fallback insert succeeded");
      }
    } else {
      console.log("[accept] project_members upsert succeeded");
    }

    // Verify the row exists
    const { data: verifyRows, error: verifyErr } = await adminSupabase
      .from("project_members")
      .select("*")
      .eq("user_id", String(newUserId));
    console.log("[accept] Verification — project_members for user:", {
      rows: verifyRows,
      error: verifyErr ? JSON.stringify(verifyErr) : null,
    });

    // Fire-and-forget: generate project structure from proposal PDF
    if (proposal.pdf_url) {
      generateProjectStructure(projectId, proposal.pdf_url, adminSupabase).catch((err) =>
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
  console.log('[proposal] /viewed hit', req.body);
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
