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

  // Assign project membership if proposal has a project_id
  if (proposal.project_id) {
    await adminSupabase.from("project_members").upsert(
      { project_id: proposal.project_id, user_id: newUserId, role: "member" },
      { onConflict: "project_id,user_id" }
    );
  }

  res.json({ success: true, user_id: newUserId });
});

export default router;
