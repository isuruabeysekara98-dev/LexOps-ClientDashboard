import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendAdminInvite, sendMemberInvite, sendClientProjectInvite } from "../email";
import { generateProjectStructure } from "../lib/generateProject";

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

  // Send branded invite email via Resend
  const actionLink = (data.user as any).action_link || `${SITE_URL}`;
  const name = full_name || "there";
  try {
    if (role === "lexops_admin") {
      await sendAdminInvite(email, name, actionLink);
    } else if (role === "lexops_member") {
      await sendMemberInvite(email, name, actionLink);
    } else if (role === "client") {
      let projectName = "your project";
      if (project_ids.length > 0) {
        const { data: proj } = await adminSupabase
          .from("projects")
          .select("name")
          .eq("id", project_ids[0])
          .single();
        if (proj?.name) projectName = proj.name;
      }
      await sendClientProjectInvite(email, name, projectName, actionLink);
    }
  } catch (emailErr: any) {
    console.error("[invite-user] Email send failed:", emailErr.message);
  }

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
// Accepts JSON { project_id, pdf_base64, pdf_filename }
// Uploads PDF to Supabase storage, then runs AI generation
// ---------------------------------------------------------------------------
router.post("/generate-project", requireAdmin, async (req: Request, res: Response) => {
  const { project_id, pdf_base64, pdf_filename } = req.body;

  if (!project_id || !pdf_base64) {
    res.status(400).json({ message: "project_id and pdf_base64 are required" });
    return;
  }

  try {
    // Decode base64 to buffer
    const pdfBuffer = Buffer.from(pdf_base64, "base64");
    const filename = pdf_filename || "brief.pdf";
    const storagePath = `projects/${project_id}/${filename}`;

    // Upload to Supabase storage
    const { error: upErr } = await adminSupabase.storage
      .from("project-documents")
      .upload(storagePath, pdfBuffer, {
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

    // Run AI generation (awaited so we can return success/error)
    await generateProjectStructure(project_id, publicUrl, adminSupabase);

    res.json({ success: true });
  } catch (err: any) {
    console.error("[generate-project] Error:", err.message);
    res.status(500).json({ message: err.message || "AI generation failed" });
  }
});

export default router;
