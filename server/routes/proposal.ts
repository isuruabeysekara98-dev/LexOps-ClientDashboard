import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";

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
    await adminSupabase.from("project_members").upsert(
      { project_id: projectId, user_id: newUserId, role: "member" },
      { onConflict: "project_id,user_id" }
    );
  }

  res.json({ success: true, user_id: newUserId });
});

export default router;
