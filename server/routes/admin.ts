import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { generateProjectStructure } from "../lib/generateProject";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = auth.slice(7);
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "lexops_admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  (req as any).adminUser = user;
  next();
}

// ---------------------------------------------------------------------------
// GET /api/admin/users
// Returns all profiles (bypasses RLS via service role key)
// ---------------------------------------------------------------------------
router.get("/users", requireAdmin, async (_req: Request, res: Response) => {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(data || []);
});

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
    console.error("[invite-user] Invite failed:", error.message);
    res.status(400).json({ message: error.message });
    return;
  }

  const newUserId = data.user.id;

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
// POST /api/admin/resend-invite
// Body: { email, full_name, role, project_ids? }
// Deletes existing unconfirmed auth user, re-invites via Supabase Auth
// ---------------------------------------------------------------------------
router.post("/resend-invite", requireAdmin, async (req: Request, res: Response) => {
  const { email, full_name, role } = req.body;

  if (!email || !role) {
    res.status(400).json({ message: "email and role are required" });
    return;
  }

  try {
    // Find existing unconfirmed auth user by email and delete them
    const { data: { users }, error: listErr } = await adminSupabase.auth.admin.listUsers();
    if (!listErr && users) {
      const existing = users.find((u: any) => u.email === email);
      if (existing && !existing.email_confirmed_at) {
        const { error: delErr } = await adminSupabase.auth.admin.deleteUser(existing.id);
        if (delErr) {
          console.error("[resend-invite] Failed to delete old auth user:", delErr.message);
        }
        // Also clean up the profile row so the re-invite can create a fresh one
        await adminSupabase.from("profiles").delete().eq("id", existing.id);
      }
    }

    // Re-invite via Supabase Auth (sends the invite email)
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: SITE_URL,
      data: { full_name, role },
    });

    if (error) {
      console.error("[resend-invite] Invite failed:", error.message);
      res.status(400).json({ message: error.message });
      return;
    }

    // Upsert profile for the new auth user
    const newUserId = data.user.id;
    await adminSupabase
      .from("profiles")
      .upsert(
        { id: newUserId, email, full_name: full_name || null, role },
        { onConflict: "id" }
      );

    // Update invite_log: set status back to pending with fresh timestamp
    await adminSupabase
      .from("invite_log")
      .update({ status: "pending", invited_at: new Date().toISOString() })
      .eq("email", email)
      .eq("status", "pending");

    res.json({ success: true });
  } catch (err: any) {
    console.error("[resend-invite] Error:", err.message);
    res.status(500).json({ message: err.message || "Resend failed" });
  }
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
        console.error("[cancel-invite] Failed to delete auth user:", delErr.message);
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

// ---------------------------------------------------------------------------
// POST /api/admin/generate-project
// Accepts multipart form data: project_id (field) + pdf (file)
// Uploads PDF to Supabase storage, then runs AI generation
// ---------------------------------------------------------------------------
router.post("/generate-project", requireAdmin, upload.single("pdf"), async (req: Request, res: Response) => {
  console.log('[admin] generate-project hit, project_id:', req.body?.project_id);
  const { project_id } = req.body;
  const file = req.file;

  if (!project_id || !file) {
    res.status(400).json({ message: "project_id and pdf file are required" });
    return;
  }

  try {
    const filename = file.originalname || "brief.pdf";
    const storagePath = `projects/${project_id}/${filename}`;

    // Upload to Supabase storage
    const { error: upErr } = await adminSupabase.storage
      .from("project-documents")
      .upload(storagePath, file.buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      res.status(500).json({ message: `PDF upload failed: ${upErr.message}` });
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from("project-documents")
      .getPublicUrl(storagePath);

    // Run AI generation with the buffer directly (avoids re-fetching from public URL)
    await generateProjectStructure(project_id, file.buffer, adminSupabase);

    res.json({ success: true });
  } catch (err: any) {
    console.error("[generate-project] Error:", err.message);
    res.status(500).json({ message: err.message || "AI generation failed" });
  }
});

export default router;
