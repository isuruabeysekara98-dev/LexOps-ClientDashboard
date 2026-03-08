import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function generateProjectStructure(
  projectId: number | string,
  pdfUrl: string,
  adminSupabase: SupabaseClient
): Promise<void> {
  console.log('[proposal] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai-structure] ANTHROPIC_API_KEY not set, inserting setup flags");
    await adminSupabase.from('project_setup_flags').insert([
      { project_id: projectId, question: 'PDF fetch error', answer: 'ANTHROPIC_API_KEY is not set in environment' },
      { project_id: projectId, question: 'PDF URL attempted', answer: pdfUrl },
      { project_id: projectId, question: 'PDF fetch status', answer: 'no API key' }
    ]);
    return;
  }

  // Fetch PDF directly from public Supabase Storage URL
  console.log("[ai-structure] Fetching PDF from public URL:", pdfUrl);
  let pdfResponse: globalThis.Response | undefined;
  try {
    pdfResponse = await fetch(pdfUrl, { signal: AbortSignal.timeout(10000) });
  } catch (err: any) {
    console.error("[ai-structure] PDF fetch error (timeout or network):", err.message);
    await adminSupabase.from('project_setup_flags').insert([
      { project_id: projectId, question: 'PDF fetch error', answer: err.message || String(err) },
      { project_id: projectId, question: 'PDF URL attempted', answer: pdfUrl },
      { project_id: projectId, question: 'PDF fetch status', answer: String(pdfResponse?.status || 'no response') }
    ]);
    return;
  }
  console.log("[ai-structure] PDF fetch status:", pdfResponse.status, pdfResponse.statusText);
  if (!pdfResponse.ok) {
    const body = await pdfResponse.text().catch(() => "");
    console.error("[ai-structure] PDF fetch failed:", pdfResponse.status, pdfResponse.statusText, body);
    await adminSupabase.from('project_setup_flags').insert([
      { project_id: projectId, question: 'PDF fetch error', answer: `HTTP ${pdfResponse.status} ${pdfResponse.statusText}` },
      { project_id: projectId, question: 'PDF URL attempted', answer: pdfUrl },
      { project_id: projectId, question: 'PDF fetch status', answer: String(pdfResponse.status) }
    ]);
    return;
  }

  const buffer = Buffer.from(await pdfResponse.arrayBuffer());
  console.log('[PDF] fetch status:', pdfResponse.status, 'size:', buffer.length);
  const base64Pdf = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a legal operations project manager. Analyze the attached proposal PDF and generate a structured project plan.

Return a JSON object with this exact schema:
{
  "confidence": "high" | "medium" | "low",
  "client_summary": "2-3 sentence plain English description of what will be delivered, written for a non-technical client. Example: 'We are streamlining your client intake process and connecting it directly to Smokeball, so new matters are created automatically. This will save your team approximately 3 hours per week on manual data entry.'",
  "phases": [
    {
      "name": "Phase name",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "status": "pending",
      "progress": 0
    }
  ],
  "tasks": [
    {
      "title": "Task title",
      "assignee": "",
      "due": "YYYY-MM-DD",
      "status": "todo",
      "is_internal": true
    }
  ],
  "deliverables": [
    {
      "label": "Short deliverable name",
      "description": "One sentence describing the outcome in client-friendly language"
    }
  ],
  "flags": [
    "Question about something unclear in the proposal that needs human input"
  ]
}

Rules:
- Extract phases from the proposal scope, timeline, or deliverables sections
- Generate actionable tasks for each phase (set is_internal: true for internal work tasks)
- Generate deliverables as high-level outcome statements written in client language (e.g. "Intake form automation", "Call transcript sync to Smokeball")
- The client_summary should be warm, professional, and avoid jargon — it will be shown to the client on their first login
- Set realistic date ranges based on any timelines mentioned (if none, use 30-day increments starting from today)
- If the proposal is unclear or missing key information, set confidence to "low" and add questions to the flags array
- If you cannot extract meaningful structure, set confidence to "low" and include flags explaining what information is needed
- Always return valid JSON only, no markdown fences or extra text`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: "Analyze this proposal and generate the project structure JSON.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const responseText = textBlock && textBlock.type === "text" ? textBlock.text : null;

    console.log('[AI] raw response length:', responseText?.length);
    console.log('[AI] raw response preview:', responseText?.substring(0, 500));

    if (!responseText) {
      await adminSupabase.from('project_setup_flags').insert([
        { project_id: projectId, question: 'PDF fetch error', answer: 'AI returned empty response' }
      ]);
      return;
    }

    // Parse JSON — strip markdown fences if present
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let result: any;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError: any) {
      console.error('[AI] JSON parse failed:', parseError.message);
      await adminSupabase.from('project_setup_flags').insert([
        { project_id: projectId, question: 'AI parse error', answer: parseError.message },
        { project_id: projectId, question: 'AI response preview', answer: responseText.substring(0, 200) }
      ]);
      return;
    }

    // If confidence is low, only insert flags
    if (result.confidence === "low") {
      const flags = result.flags?.length
        ? result.flags
        : ["AI could not confidently extract project structure from the proposal. Manual setup required."];
      await insertFlags(projectId, flags, adminSupabase);
      return;
    }

    // Save client_summary on the project
    if (result.client_summary) {
      const { error: sumErr } = await adminSupabase
        .from("projects")
        .update({ client_summary: result.client_summary })
        .eq("id", projectId);
      if (sumErr) console.error("[ai-structure] client_summary update error:", sumErr.message);
    }

    // Insert phases
    if (result.phases?.length) {
      const phaseRows = result.phases.map((p: any) => ({
        project_id: projectId,
        name: p.name,
        start: p.start || null,
        end: p.end || null,
        status: p.status || "pending",
        progress: p.progress || 0,
      }));
      const { error: phaseErr } = await adminSupabase.from("phases").insert(phaseRows);
      if (phaseErr) console.error("[ai-structure] Phase insert error:", phaseErr.message);
    }

    // Insert tasks (internal work tasks)
    if (result.tasks?.length) {
      const taskRows = result.tasks.map((tk: any) => ({
        project_id: projectId,
        title: tk.title,
        assignee: tk.assignee || "",
        due: tk.due || null,
        status: tk.status || "todo",
        is_internal: tk.is_internal !== false,
        is_deliverable: false,
      }));
      const { error: taskErr } = await adminSupabase.from("tasks").insert(taskRows);
      if (taskErr) console.error("[ai-structure] Task insert error:", taskErr.message);
    }

    // Insert deliverables as tasks with is_deliverable: true, is_internal: false
    if (result.deliverables?.length) {
      const deliverableRows = result.deliverables.map((d: any) => ({
        project_id: projectId,
        title: d.label,
        assignee: "",
        due: null,
        status: "todo",
        is_internal: false,
        is_deliverable: true,
      }));
      const { error: delErr } = await adminSupabase.from("tasks").insert(deliverableRows);
      if (delErr) console.error("[ai-structure] Deliverable insert error:", delErr.message);
    }

    // Insert any flags even for medium/high confidence
    if (result.flags?.length) {
      await insertFlags(projectId, result.flags, adminSupabase);
    }
  } catch (err: any) {
    console.error("[ai-structure] AI call failed:", err.message);
    await adminSupabase.from('project_setup_flags').insert([
      { project_id: projectId, question: 'PDF fetch error', answer: err.message || String(err) },
      { project_id: projectId, question: 'PDF URL attempted', answer: pdfUrl },
      { project_id: projectId, question: 'PDF fetch status', answer: 'AI call failed' }
    ]);
  }
}

async function insertFlags(projectId: number | string, flags: string[], adminSupabase: SupabaseClient) {
  const rows = flags.map((q) => ({
    project_id: projectId,
    question: q,
    resolved: false,
  }));
  const { error } = await adminSupabase.from("project_setup_flags").insert(rows);
  if (error) console.error("[ai-structure] Flag insert error:", error.message);
}
