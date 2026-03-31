// Module Library routes
// Optional env vars: N8N_BASE_URL, N8N_API_KEY — if not set, deployment records in DB but skips n8n API call

import { Router, Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const adminSupabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Middleware: require lexops_admin or lexops_member
// ---------------------------------------------------------------------------
async function requireStaff(req: Request, res: Response, next: NextFunction) {
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

  if (!profile || !["lexops_admin", "lexops_member"].includes(profile.role)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  (req as any).staffUser = user;
  next();
}

// ---------------------------------------------------------------------------
// GET /api/modules — list all modules with steps count
// ---------------------------------------------------------------------------
router.get("/", requireStaff, async (_req: Request, res: Response) => {
  const { data, error } = await adminSupabase
    .from("modules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(data || []);
});

// ---------------------------------------------------------------------------
// POST /api/modules — create module with steps + workflow definition
// ---------------------------------------------------------------------------
router.post("/", requireStaff, async (req: Request, res: Response) => {
  const { steps, workflow, ...moduleData } = req.body;
  const user = (req as any).staffUser;

  const { data: mod, error } = await adminSupabase
    .from("modules")
    .insert({ ...moduleData, created_by: user.id })
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  // Insert steps
  if (steps?.length) {
    const stepRows = steps.map((s: any, i: number) => ({
      module_id: mod.id,
      order_index: i,
      title: s.title,
      description: s.description || null,
      tool: s.tool || null,
      notes: s.notes || null,
    }));
    await adminSupabase.from("module_steps").insert(stepRows);
  }

  // Insert workflow definition
  if (workflow) {
    await adminSupabase.from("module_workflow_definitions").insert({
      module_id: mod.id,
      workflow_json: workflow.workflow_json || null,
      variables: workflow.variables || [],
      n8n_workflow_id: workflow.n8n_workflow_id || null,
    });
  }

  res.json({ success: true, module: mod });
});

// ---------------------------------------------------------------------------
// PUT /api/modules/:id — update module with steps + workflow definition
// ---------------------------------------------------------------------------
router.put("/:id", requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { steps, workflow, ...moduleData } = req.body;

  // Remove fields that shouldn't be updated directly
  delete moduleData.id;
  delete moduleData.created_at;
  delete moduleData.created_by;

  const { data: mod, error } = await adminSupabase
    .from("modules")
    .update(moduleData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  // Replace steps
  if (steps !== undefined) {
    await adminSupabase.from("module_steps").delete().eq("module_id", id);
    if (steps.length) {
      const stepRows = steps.map((s: any, i: number) => ({
        module_id: id,
        order_index: i,
        title: s.title,
        description: s.description || null,
        tool: s.tool || null,
        notes: s.notes || null,
      }));
      await adminSupabase.from("module_steps").insert(stepRows);
    }
  }

  // Replace workflow definition
  if (workflow !== undefined) {
    await adminSupabase.from("module_workflow_definitions").delete().eq("module_id", id);
    if (workflow) {
      await adminSupabase.from("module_workflow_definitions").insert({
        module_id: id,
        workflow_json: workflow.workflow_json || null,
        variables: workflow.variables || [],
        n8n_workflow_id: workflow.n8n_workflow_id || null,
      });
    }
  }

  res.json({ success: true, module: mod });
});

// ---------------------------------------------------------------------------
// GET /api/modules/:id — get single module with steps + workflow
// ---------------------------------------------------------------------------
router.get("/:id", requireStaff, async (req: Request, res: Response) => {
  const { id } = req.params;

  const [{ data: mod }, { data: steps }, { data: workflow }] = await Promise.all([
    adminSupabase.from("modules").select("*").eq("id", id).single(),
    adminSupabase.from("module_steps").select("*").eq("module_id", id).order("order_index"),
    adminSupabase.from("module_workflow_definitions").select("*").eq("module_id", id).single(),
  ]);

  if (!mod) {
    res.status(404).json({ message: "Module not found" });
    return;
  }

  res.json({ ...mod, steps: steps || [], workflow: workflow || null });
});

// ---------------------------------------------------------------------------
// POST /api/modules/match — AI brief matcher
// ---------------------------------------------------------------------------
router.post("/match", requireStaff, async (req: Request, res: Response) => {
  const { project_id, brief_text } = req.body;

  if (!brief_text) {
    res.status(400).json({ message: "brief_text is required" });
    return;
  }

  // Fetch all active modules
  const { data: modules } = await adminSupabase
    .from("modules")
    .select("id, name, description, practice_areas, tools, workflow_stage")
    .eq("status", "active");

  if (!modules || modules.length === 0) {
    res.json({ matches: [] });
    return;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ message: "ANTHROPIC_API_KEY not configured" });
      return;
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a legal operations expert specialising in law firm automation. Analyse project briefs and match them to implementation modules.",
      messages: [
        {
          role: "user",
          content: `Given this project brief, rank these modules by relevance. Return ONLY valid JSON with no markdown, no explanation: { "matches": [{ "module_id": "uuid", "score": 0-100, "reasoning": "one sentence" }] } sorted by score descending, top 5 only.\n\nBrief: ${brief_text}\n\nModules: ${JSON.stringify(modules)}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);
    const matchedIds = (parsed.matches || []).map((m: any) => m.module_id);

    // Fetch full module data for matched IDs
    const { data: fullModules } = await adminSupabase
      .from("modules")
      .select("*")
      .in("id", matchedIds);

    const moduleMap = new Map((fullModules || []).map((m: any) => [m.id, m]));
    const matches = (parsed.matches || [])
      .filter((m: any) => moduleMap.has(m.module_id))
      .map((m: any) => ({
        module: moduleMap.get(m.module_id),
        score: m.score,
        reasoning: m.reasoning,
      }));

    res.json({ matches });
  } catch (err: any) {
    console.error("[modules/match] Error:", err.message);
    res.status(500).json({ message: "AI matching failed: " + err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/modules/deploy — deploy module to project
// ---------------------------------------------------------------------------
router.post("/deploy", requireStaff, async (req: Request, res: Response) => {
  const { module_id, project_id, connector_config, status } = req.body;
  const user = (req as any).staffUser;

  if (!module_id || !project_id) {
    res.status(400).json({ message: "module_id and project_id are required" });
    return;
  }

  // Fetch module workflow definition
  const { data: workflowDef } = await adminSupabase
    .from("module_workflow_definitions")
    .select("*")
    .eq("module_id", module_id)
    .single();

  let n8nWorkflowId: string | null = null;

  // If workflow exists and n8n is configured, push to n8n
  if (workflowDef?.workflow_json && process.env.N8N_BASE_URL && process.env.N8N_API_KEY) {
    try {
      let workflowJson = workflowDef.workflow_json;

      // Substitute connector_config values into workflow JSON
      if (connector_config) {
        for (const [key, value] of Object.entries(connector_config)) {
          workflowJson = workflowJson.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            String(value)
          );
        }
      }

      const n8nResponse = await fetch(`${process.env.N8N_BASE_URL}/api/v1/workflows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.N8N_API_KEY}`,
        },
        body: workflowJson,
      });

      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.json();
        n8nWorkflowId = n8nData.id || null;
      } else {
        console.error("[modules/deploy] n8n API error:", await n8nResponse.text());
      }
    } catch (err: any) {
      console.error("[modules/deploy] n8n push failed:", err.message);
    }
  }

  // Insert deployment record
  const { data: deployment, error } = await adminSupabase
    .from("module_deployments")
    .insert({
      module_id,
      project_id,
      status: status || "pending",
      connector_config: connector_config || {},
      n8n_workflow_id: n8nWorkflowId,
      deployed_at: status === "active" ? new Date().toISOString() : null,
      deployed_by: user.id,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  // Increment times_used
  try {
    await adminSupabase.rpc("increment_module_times_used", { mod_id: module_id });
  } catch {
    // Fallback if RPC doesn't exist — direct update
    const { data: mod } = await adminSupabase.from("modules").select("times_used").eq("id", module_id).single();
    if (mod) {
      await adminSupabase.from("modules").update({ times_used: (mod.times_used || 0) + 1 }).eq("id", module_id);
    }
  }

  res.json({ success: true, deployment_id: deployment.id });
});

// ---------------------------------------------------------------------------
// GET /api/modules/deployments — list all deployments
// ---------------------------------------------------------------------------
router.get("/deployments/list", requireStaff, async (_req: Request, res: Response) => {
  const { data, error } = await adminSupabase
    .from("module_deployments")
    .select("*, modules(name), projects(name)")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json(data || []);
});

// ---------------------------------------------------------------------------
// POST /api/modules/outcomes — add outcome to a module
// ---------------------------------------------------------------------------
router.post("/outcomes", requireStaff, async (req: Request, res: Response) => {
  const { module_id, project_id, hours_saved, rating, notes } = req.body;
  const user = (req as any).staffUser;

  if (!module_id) {
    res.status(400).json({ message: "module_id is required" });
    return;
  }

  const { data, error } = await adminSupabase
    .from("module_outcomes")
    .insert({
      module_id,
      project_id: project_id || null,
      hours_saved: hours_saved || null,
      rating: rating || null,
      notes: notes || null,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.json({ success: true, outcome: data });
});

export default router;
