import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.SITE_URL || "https://client-lexops.replit.app";

// ---------------------------------------------------------------------------
// Middleware: extract Bearer token, verify user, confirm lexops_admin role
// ---------------------------------------------------------------------------
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  console.log("[requireAdmin] Authorization header present:", !!auth, auth ? `${auth.slice(0, 15)}...` : "(none)");

  if (!auth?.startsWith("Bearer ")) {
    console.log("[requireAdmin] REJECTED: No Bearer token");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = auth.slice(7);
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  console.log("[requireAdmin] getUser result:", {
    userId: user?.id,
    email: user?.email,
    error: error?.message || null,
    supabaseUrl: process.env.VITE_SUPABASE_URL?.slice(0, 30),
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (error || !user) {
    console.log("[requireAdmin] REJECTED: JWT verification failed");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { data: profile, error: profileErr } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[requireAdmin] Profile lookup:", {
    userId: user.id,
    profile,
    error: profileErr?.message || null,
    code: profileErr?.code || null,
  });

  if (profile?.role !== "lexops_admin") {
    console.log("[requireAdmin] REJECTED: Role is", profile?.role, "not lexops_admin");
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  console.log("[requireAdmin] PASSED for", user.email);
  (req as any).adminUser = user;
  next();
}

// ---------------------------------------------------------------------------
// POST /api/admin/invite-user
// Body: { email, full_name, role, project_ids? }
// ---------------------------------------------------------------------------
router.post("/invite-user", requireAdmin, async (req: Request, res: Response) => {
  const { email, full_name, role, project_ids = [] } = req.body;

  if (!email || !role) {
    res.status(400).json({ message: "email and role are required" });
    return;
  }

  const validRoles = ["lexops_admin", "lexops_member", "client"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  // Send the invite email via Supabase Auth
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: SITE_URL,
    data: { full_name, role },
  });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const newUserId = data.user.id;

  // Upsert profile row with the supplied name and role
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .upsert({ id: newUserId, email, full_name: full_name || null, role });

  if (profileError) {
    res.status(500).json({ message: profileError.message });
    return;
  }

  // Assign project memberships for client users
  if (role === "client" && project_ids.length > 0) {
    const rows = (project_ids as number[]).map((pid) => ({
      project_id: pid,
      user_id: newUserId,
      role: "member",
    }));
    await adminSupabase.from("project_members").insert(rows);
  }

  // Log the invite
  const adminUser = (req as any).adminUser;
  await adminSupabase.from("invite_log").insert({
    email,
    full_name: full_name || null,
    role,
    invited_by: adminUser.id,
    status: "pending",
  });

  res.json({ success: true, user: data.user });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/remove-user/:userId
// ---------------------------------------------------------------------------
router.delete("/remove-user/:userId", requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.params;

  const { error } = await adminSupabase.auth.admin.deleteUser(userId);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.json({ success: true });
});

export default router;
