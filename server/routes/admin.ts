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
  console.log("[invite-user] Sending invite to:", email, "redirectTo:", SITE_URL);
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: SITE_URL,
    data: { full_name, role },
  });

  console.log("[invite-user] inviteUserByEmail response:", {
    userId: data?.user?.id,
    email: data?.user?.email,
    confirmationUrl: (data?.user as any)?.confirmation_sent_at ? "sent" : "not sent",
    actionLink: (data?.user as any)?.action_link || null,
    error: error?.message || null,
  });

  if (error) {
    console.error("[invite-user] Invite failed:", error.message);
    res.status(400).json({ message: error.message });
    return;
  }

  const newUserId = data.user.id;

  // Log the action link as fallback if email delivery fails
  const actionLink = (data.user as any).action_link;
  if (actionLink) {
    console.log("[invite-user] Confirmation URL (fallback):", actionLink);
  }

  // Upsert profile row with the supplied name and role
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .upsert(
      { id: newUserId, email, full_name: full_name || null, role },
      { onConflict: "id" }
    );

  if (profileError) {
    console.error("[invite-user] Profile upsert error:", profileError.message);
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
// DELETE /api/admin/cancel-invite
// Body: { email }
// ---------------------------------------------------------------------------
router.delete("/cancel-invite", requireAdmin, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "email is required" });
    return;
  }

  // Look up the user in Supabase auth by email
  const { data: { users }, error: listErr } = await adminSupabase.auth.admin.listUsers();
  if (!listErr && users) {
    const authUser = users.find((u: any) => u.email === email);
    if (authUser) {
      const { error: delErr } = await adminSupabase.auth.admin.deleteUser(authUser.id);
      if (delErr) {
        console.log("[cancel-invite] Failed to delete auth user:", delErr.message);
      }
      // Also remove profile row if it exists
      await adminSupabase.from("profiles").delete().eq("id", authUser.id);
    }
  }

  // Delete invite_log rows for this email
  await adminSupabase.from("invite_log").delete().eq("email", email);

  res.json({ success: true });
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
