// ---------------------------------------------------------------------------
// Synthetic 150-node graph for the canvas performance budget.
// ---------------------------------------------------------------------------
// LIVING-PROPOSAL-PLAN.md §2b: "60fps at 150 nodes on a mid-tier laptop, 30fps
// on a 3-year-old iPhone. Measure on day 2, not day 7."
//
//   node --env-file=.env scripts/seed-perf-fixture.mjs          # create + print link
//   node --env-file=.env scripts/seed-perf-fixture.mjs --drop   # remove it again
//
// Then open the link with ?perf=1 and run `__canvasBench(300)` in the console.
// The bench measures the cost of one frame synchronously, because rAF is
// throttled to nothing in a background tab and an fps counter there lies.
// Under 16.7ms median = 60fps. Under 33.3ms = 30fps.
//
// Kept as a draft-status proposal so it never appears in the proposals section.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SITE_URL = process.env.SITE_URL || "http://localhost:5000";
const NAME = "PERF FIXTURE — 150 nodes (delete me)";

const KINDS = ["trigger", "step", "ai", "hitl", "gate", "artifact", "system"];
const ACTORS = ["system", "ai", "human_client", "human_lexops"];
const CLUSTERS = ["intake", "match", "build", "review", "deliver", "close"];
const COUNT = Number(process.env.PERF_NODES || 150);

async function drop() {
  const { data: p } = await sb.from("proposals").select("id").eq("name", NAME).maybeSingle();
  if (!p) { console.log("Nothing to drop."); return; }
  for (const t of ["proposal_events", "proposal_inputs", "proposal_notes", "proposal_recipients", "proposal_graphs"]) {
    await sb.from(t).delete().eq("proposal_id", p.id);
  }
  await sb.from("proposals").delete().eq("id", p.id);
  console.log("Perf fixture removed.");
}

async function create() {
  let { data: p } = await sb.from("proposals").select("id").eq("name", NAME).maybeSingle();
  if (!p) {
    const { data, error } = await sb.from("proposals").insert({
      name: NAME, client_name: "Perf harness", client_email: "isuru@lex-ops.io",
      token: randomUUID(), status: "draft", state: "draft",
    }).select("id").single();
    if (error) throw error;
    p = data;
  }

  const nodes = [], edges = [];
  for (let i = 0; i < COUNT; i++) {
    nodes.push({
      id: `n${i}`,
      kind: KINDS[i % KINDS.length],
      actor: ACTORS[i % ACTORS.length],
      cluster: CLUSTERS[i % CLUSTERS.length],
      label: `Node ${i} — a realistic length label`,
      description: "Synthetic node for the day-2 performance budget.",
      value: { unit: "hrs_month", amount: 1 + (i % 14) },
      confidence: ["committed", "scoped", "exploratory"][i % 3],
      needs: i % 3 === 0 ? [{ id: `q${i}`, type: "text", required: i % 6 === 0, prompt: `Synthetic question ${i}` }] : [],
      gives: [{ label: `Output ${i}`, detail: "" }],
      assumptions: [],
    });
    if (i > 0) edges.push({ from: `n${i - 1}`, to: `n${i}`, kind: ["data", "depends", "triggers"][i % 3] });
    if (i > 6 && i % 5 === 0) edges.push({ from: `n${i - 6}`, to: `n${i}`, kind: "data", volume: 2 });
  }

  const { error } = await sb.from("proposal_graphs").upsert({
    proposal_id: p.id, version: 1, preset: process.env.PERF_PRESET || "pipeline",
    headline: "Performance fixture",
    headline_metric: { unit: "nodes", amount: COUNT, basis: "day-2 budget" },
    nodes, edges, published_at: new Date().toISOString(),
  }, { onConflict: "proposal_id,version" });
  if (error) throw error;

  let { data: r } = await sb.from("proposal_recipients")
    .select("token").eq("proposal_id", p.id).is("invited_by", null).maybeSingle();
  if (!r) {
    const token = randomUUID().replace(/-/g, "");
    await sb.from("proposal_recipients").insert({
      proposal_id: p.id, email: "isuru@lex-ops.io", name: "Perf", token, invited_by: null,
    });
    r = { token };
  }

  console.log(`${nodes.length} nodes · ${edges.length} edges`);
  console.log(`\n  ${SITE_URL}/p/${r.token}?perf=1\n`);
  console.log("In the console:  __canvasBench(300)");
}

(process.argv.includes("--drop") ? drop() : create()).catch((e) => { console.error(e); process.exit(1); });
