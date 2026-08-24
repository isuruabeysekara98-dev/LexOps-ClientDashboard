import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import {
  sendDocumentRequest,
  sendDocumentUploaded,
  sendPhaseComplete,
  sendProjectComplete,
  sendTaskAssigned,
  sendPasswordReset,
} from "../email";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Any logged-in user (staff or client). Blocks anonymous curl/spam.
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ message: "Unauthorized" }); return; }

  const { data: { user }, error } = await adminSupabase.auth.getUser(auth.slice(7));
  if (error || !user) { res.status(401).json({ message: "Unauthorized" }); return; }

  next();
}

// Helper: get all admin emails
async function getAdminEmails(): Promise<string[]> {
  const { data } = await adminSupabase
    .from("profiles")
    .select("email")
    .in("role", ["lexops_admin"]);
  return (data || []).map((p: any) => p.email).filter(Boolean);
}

// Helper: get client info for a project
async function getProjectClients(projectId: number): Promise<{ email: string; full_name: string }[]> {
  const { data: members } = await adminSupabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);
  if (!members?.length) return [];

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await adminSupabase
    .from("profiles")
    .select("email, full_name")
    .in("id", userIds)
    .eq("role", "client");
  return profiles || [];
}

// Helper: get project name
async function getProjectName(projectId: number): Promise<string> {
  const { data } = await adminSupabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();
  return data?.name || "your project";
}

// ---------------------------------------------------------------------------
// POST /api/notify/document-request
// Body: { project_id, title, description }
// ---------------------------------------------------------------------------
router.post("/document-request", requireAuth, async (req: Request, res: Response) => {
  const { project_id, title, description } = req.body;
  if (!project_id || !title) {
    res.status(400).json({ message: "project_id and title required" });
    return;
  }

  const [clients, projectName] = await Promise.all([
    getProjectClients(project_id),
    getProjectName(project_id),
  ]);

  for (const c of clients) {
    sendDocumentRequest(c.email, c.full_name || "there", projectName, title, description || "").catch(() => {});
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/notify/document-uploaded
// Body: { project_id, document_name, client_name }
// ---------------------------------------------------------------------------
router.post("/document-uploaded", requireAuth, async (req: Request, res: Response) => {
  const { project_id, document_name, client_name } = req.body;
  if (!project_id) {
    res.status(400).json({ message: "project_id required" });
    return;
  }

  const [admins, projectName] = await Promise.all([
    getAdminEmails(),
    getProjectName(project_id),
  ]);

  for (const email of admins) {
    sendDocumentUploaded(email, client_name || "A client", projectName, document_name || "a document").catch(() => {});
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/notify/phase-complete
// Body: { project_id, phase_name, next_phase_name }
// ---------------------------------------------------------------------------
router.post("/phase-complete", requireAuth, async (req: Request, res: Response) => {
  const { project_id, phase_name, next_phase_name } = req.body;
  if (!project_id || !phase_name) {
    res.status(400).json({ message: "project_id and phase_name required" });
    return;
  }

  const [clients, projectName] = await Promise.all([
    getProjectClients(project_id),
    getProjectName(project_id),
  ]);

  for (const c of clients) {
    sendPhaseComplete(c.email, c.full_name || "there", projectName, phase_name, next_phase_name || null).catch(() => {});
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/notify/project-complete
// Body: { project_id }
// ---------------------------------------------------------------------------
router.post("/project-complete", requireAuth, async (req: Request, res: Response) => {
  const { project_id } = req.body;
  if (!project_id) {
    res.status(400).json({ message: "project_id required" });
    return;
  }

  const [clients, projectName] = await Promise.all([
    getProjectClients(project_id),
    getProjectName(project_id),
  ]);

  for (const c of clients) {
    sendProjectComplete(c.email, c.full_name || "there", projectName).catch(() => {});
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/notify/task-assigned
// Body: { project_id, task_title, task_description }
// ---------------------------------------------------------------------------
router.post("/task-assigned", requireAuth, async (req: Request, res: Response) => {
  const { project_id, task_title, task_description } = req.body;
  if (!project_id || !task_title) {
    res.status(400).json({ message: "project_id and task_title required" });
    return;
  }

  const [clients, projectName] = await Promise.all([
    getProjectClients(project_id),
    getProjectName(project_id),
  ]);

  for (const c of clients) {
    sendTaskAssigned(c.email, c.full_name || "there", projectName, task_title, task_description || "").catch(() => {});
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/send-password-reset
// Body: { email }
// Public endpoint — no auth required
// ---------------------------------------------------------------------------
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RESET_MAX = 3;

router.post("/send-password-reset", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "email is required" });
    return;
  }

  const now = Date.now();
  const key = email.toLowerCase();
  const entry = resetAttempts.get(key);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RESET_MAX) {
      res.status(429).json({ message: "Too many reset attempts. Please wait 15 minutes." });
      return;
    }
    entry.count++;
  } else {
    resetAttempts.set(key, { count: 1, resetAt: now + RESET_WINDOW_MS });
  }

  // Look up name
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name")
    .eq("email", email)
    .single();

  const fullName = profile?.full_name || "there";

  // Generate recovery link
  const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (linkErr || !linkData?.properties?.action_link) {
    // Don't reveal whether the email exists
    res.json({ success: true });
    return;
  }

  await sendPasswordReset(email, fullName, linkData.properties.action_link);
  res.json({ success: true });
});

export default router;
