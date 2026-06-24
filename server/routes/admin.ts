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
// Middleware: any authenticated Supabase user
// ---------------------------------------------------------------------------
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ message: "Unauthorized" }); return; }
  const token = auth.slice(7);
  try {
    const { data: { user }, error } = await Promise.race([
      adminSupabase.auth.getUser(token),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("auth_timeout")), 5000)),
    ]);
    if (error || !user) { res.status(401).json({ message: "Unauthorized" }); return; }
    next();
  } catch (e: any) {
    const msg = e?.message === "auth_timeout" ? "Auth timeout — please retry" : "Unauthorized";
    const status = e?.message === "auth_timeout" ? 503 : 401;
    res.status(status).json({ message: msg }); return;
  }
}

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
  let user: any;
  try {
    const { data, error } = await Promise.race([
      adminSupabase.auth.getUser(token),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("auth_timeout")), 5000)),
    ]);
    if (error || !data?.user) { res.status(401).json({ message: "Unauthorized" }); return; }
    user = data.user;
  } catch (e: any) {
    const msg = e?.message === "auth_timeout" ? "Auth timeout — please retry" : "Unauthorized";
    const status = e?.message === "auth_timeout" ? 503 : 401;
    res.status(status).json({ message: msg }); return;
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

// ---------------------------------------------------------------------------
// POST /api/admin/bulk-rename-phases
// Renames every phase whose name starts with "Phase " → "Milestone "
// ---------------------------------------------------------------------------
router.post("/bulk-rename-phases", requireAdmin, async (req, res) => {
  try {
    const { data: phases, error: fetchErr } = await adminSupabase
      .from("phases")
      .select("id, name")
      .ilike("name", "Phase %");

    if (fetchErr) { res.status(500).json({ message: fetchErr.message }); return; }
    if (!phases || phases.length === 0) { res.json({ updated: 0 }); return; }

    let updated = 0;
    for (const phase of phases) {
      const newName = phase.name.replace(/^Phase /i, "Milestone ");
      const { error } = await adminSupabase.from("phases").update({ name: newName }).eq("id", phase.id);
      if (!error) updated++;
    }
    res.json({ updated, total: phases.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Task CRUD — all bypass RLS via service-role key
// ---------------------------------------------------------------------------

// POST /api/admin/tasks — create a task
router.post("/tasks", requireAuth, async (req: Request, res: Response) => {
  const { project_id, title, status, is_internal, is_deliverable, due_date, phase_id, description, assignee, owner } = req.body;
  if (!project_id || !title) { res.status(400).json({ message: "project_id and title are required" }); return; }
  const { data, error } = await adminSupabase.from("tasks").insert({
    project_id, title,
    status: status || "pending",
    is_internal: is_internal ?? false,
    is_deliverable: is_deliverable ?? false,
    due_date: due_date || null,
    phase_id: phase_id || null,
    description: description || null,
    assignee: assignee || null,
    owner: owner || null,
  }).select().single();
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true, data });
});

// PATCH /api/admin/tasks/:id — full task update
router.patch("/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const allowed = ["title", "status", "due_date", "phase_id", "is_internal", "is_deliverable", "description", "assignee"];
  const payload = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (Object.keys(payload).length === 0) { res.status(400).json({ message: "No valid fields to update" }); return; }
  const { error } = await adminSupabase.from("tasks").update(payload).eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true });
});

// PATCH /api/admin/tasks/:id/owner — update owner field separately (column may need manual creation)
router.patch("/tasks/:id/owner", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { owner } = req.body;
  if (owner !== null && owner !== undefined && owner !== "client" && owner !== "lexops" && owner !== "") {
    res.status(400).json({ message: "owner must be null, 'client', or 'lexops'" }); return;
  }
  const { error } = await adminSupabase.from("tasks").update({ owner: owner || null }).eq("id", id);
  if (error) {
    if (error.message?.includes("owner")) {
      res.status(409).json({ message: "owner_column_missing", sql: "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner text;" }); return;
    }
    res.status(500).json({ message: error.message }); return;
  }
  res.json({ ok: true });
});

// PATCH /api/admin/tasks/:id/status — update status only (kept for compatibility)
router.patch("/tasks/:id/status", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ["pending", "in_progress", "done", "todo", "in-progress"];
  if (!valid.includes(status)) { res.status(400).json({ message: "Invalid status" }); return; }
  const { error } = await adminSupabase.from("tasks").update({ status }).eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true });
});

// DELETE /api/admin/tasks/:id — delete a task
router.delete("/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await adminSupabase.from("tasks").delete().eq("id", id);
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json({ ok: true });
});

// POST /api/admin/phases/:id/auto-complete — mark phase complete if all tasks done
router.post("/phases/:id/auto-complete", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { project_id } = req.body;
  if (!project_id) { res.status(400).json({ message: "project_id required" }); return; }
  const { data: phaseTasks, error: fetchErr } = await adminSupabase
    .from("tasks").select("status").eq("project_id", project_id).eq("phase_id", id);
  if (fetchErr) { res.status(500).json({ message: fetchErr.message }); return; }
  if (phaseTasks && phaseTasks.length > 0 && phaseTasks.every((t: any) => t.status === "done")) {
    await adminSupabase.from("phases").update({ status: "complete", progress: 100 }).eq("id", id);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/admin/upload-document — upload a file via service-role key
// Accepts: multipart/form-data with field "file", plus body fields:
//   project_id (required), phase_name (optional)
// Uploads to Supabase Storage using service-role key (bypasses RLS).
// Inserts a documents row; auto-falls-back without phase_name if column missing.
// ---------------------------------------------------------------------------
router.post("/upload-document", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  const file = req.file;
  const { project_id, phase_name } = req.body as { project_id?: string; phase_name?: string };

  if (!file) { res.status(400).json({ message: "No file provided" }); return; }
  if (!project_id) { res.status(400).json({ message: "project_id required" }); return; }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const storagePath = `${project_id}/${Date.now()}_${safeName}`;

  // Upload to storage using service-role key (no RLS restrictions)
  const { error: storageErr } = await (adminSupabase as any).storage
    .from("project-documents")
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: true });

  if (storageErr) {
    console.error("[admin/upload-document] storage error:", storageErr.message);
    res.status(500).json({ message: `Storage upload failed: ${storageErr.message}` });
    return;
  }

  const { data: { publicUrl } } = (adminSupabase as any).storage
    .from("project-documents").getPublicUrl(storagePath);

  const ext = (file.originalname.split(".").pop() || "FILE").toUpperCase();
  const docBase: Record<string, any> = {
    project_id,
    name: file.originalname,
    file_type: ext,
    file_size: file.size,
    file_url: publicUrl,
    storage_path: storagePath,
    uploaded_at: new Date().toISOString(),
  };

  // Try with phase_name first; if that column is missing, fall back without it
  const payloads = phase_name
    ? [{ ...docBase, phase_name }, docBase]
    : [docBase];

  let doc: any = null;
  let lastErr: any = null;
  for (const payload of payloads) {
    const { data, error } = await (adminSupabase as any)
      .from("documents").insert(payload).select().single();
    if (!error) { doc = data; break; }
    lastErr = error;
    const msg = (error.message || "").toLowerCase();
    if (!msg.includes("phase_name") && !msg.includes("column")) break; // not a schema issue — stop
  }

  if (!doc) {
    // Clean up the stored file so we don't leave orphans
    await (adminSupabase as any).storage.from("project-documents").remove([storagePath]).catch(() => {});
    console.error("[admin/upload-document] insert error:", lastErr?.message);
    res.status(500).json({ message: lastErr?.message || "Failed to create document record" });
    return;
  }

  res.json({ ok: true, data: doc });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/documents/:id/phase — update phase_name with auto-fallback
// ---------------------------------------------------------------------------
router.patch("/documents/:id/phase", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { phase_name, name } = req.body as { phase_name?: string | null; name?: string };
  if (!id) { res.status(400).json({ message: "id required" }); return; }

  // Build update payload
  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (phase_name !== undefined) updateData.phase_name = phase_name;

  // Try full update; if phase_name column missing, retry with only name
  let err: any = null;
  const { error: e1 } = await (adminSupabase as any).from("documents").update(updateData).eq("id", id);
  if (e1) {
    err = e1;
    const msg = (e1.message || "").toLowerCase();
    if ((msg.includes("phase_name") || msg.includes("column")) && name !== undefined) {
      const { error: e2 } = await (adminSupabase as any).from("documents").update({ name }).eq("id", id);
      if (!e2) {
        res.json({ ok: true, phase_saved: false }); // name saved, phase skipped
        return;
      }
      err = e2;
    }
    console.error("[admin/documents/phase]", err.message);
    res.status(500).json({ message: err.message });
    return;
  }
  res.json({ ok: true, phase_saved: true });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/documents/:id — delete storage file + DB record server-side
// ---------------------------------------------------------------------------
router.delete("/documents/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) { res.status(400).json({ message: "id required" }); return; }

  // Fetch the storage_path so we can delete the file
  const { data: doc, error: fetchErr } = await (adminSupabase as any)
    .from("documents").select("storage_path").eq("id", id).single();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    console.error("[admin/documents/delete] fetch:", fetchErr.message);
    res.status(500).json({ message: fetchErr.message }); return;
  }

  // Remove from storage (best-effort — don't fail if file missing)
  if (doc?.storage_path) {
    const { error: storageErr } = await (adminSupabase as any).storage
      .from("project-documents").remove([doc.storage_path]);
    if (storageErr) console.warn("[admin/documents/delete] storage:", storageErr.message);
  }

  // Delete the DB record
  const { error: deleteErr } = await (adminSupabase as any)
    .from("documents").delete().eq("id", id);
  if (deleteErr) {
    console.error("[admin/documents/delete] db:", deleteErr.message);
    res.status(500).json({ message: deleteErr.message }); return;
  }

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/admin/db — generic service-role database write proxy
// Body: { table, operation: "insert"|"update"|"delete"|"upsert", data, match? }
// ---------------------------------------------------------------------------
const ALLOWED_TABLES = [
  "tasks","phases","projects","documents","document_requests",
  "support_tickets","invoices","project_tools","software","maintenance",
  "project_members","proposals","profiles","project_setup_flags",
  "flowchart_nodes","flowchart_arrows","flowchart_comments","flowchart_templates",
];

router.post("/db", requireAuth, async (req: Request, res: Response) => {
  const { table, operation, data, match } = req.body;
  if (!ALLOWED_TABLES.includes(table)) {
    res.status(400).json({ message: `Table "${table}" not allowed` }); return;
  }
  if (!["insert","update","delete","upsert"].includes(operation)) {
    res.status(400).json({ message: `Invalid operation "${operation}"` }); return;
  }
  try {
    const tbl = (adminSupabase as any).from(table);
    let result: any = null;
    if (operation === "insert") {
      const q = Array.isArray(data) ? tbl.insert(data) : tbl.insert(data).select().single();
      const r = await q;
      if (r.error) throw r.error;
      result = r.data;
    } else if (operation === "update") {
      let q = tbl.update(data);
      if (match) for (const [k, v] of Object.entries(match as Record<string,any>)) q = q.eq(k, v);
      const r = await q;
      if (r.error) throw r.error;
    } else if (operation === "delete") {
      let q = tbl.delete();
      if (match) for (const [k, v] of Object.entries(match as Record<string,any>)) q = q.eq(k, v);
      const r = await q;
      if (r.error) throw r.error;
    } else if (operation === "upsert") {
      const opts = match ? { onConflict: Object.keys(match).join(",") } : {};
      const r = await tbl.upsert(data, opts);
      if (r.error) throw r.error;
      result = r.data;
    }
    res.json({ ok: true, data: result });
  } catch (err: any) {
    console.error(`[admin/db] ${operation} ${table}:`, err.message);
    res.status(500).json({ message: err.message || "Database write failed" });
  }
});

export default router;
