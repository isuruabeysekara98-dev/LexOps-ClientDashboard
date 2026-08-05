// ---------------------------------------------------------------------------
// Seed a living-proposal graph + recipient against an existing proposal.
//
//   node scripts/seed-living-proposal.mjs                  # first 'sent' proposal
//   node scripts/seed-living-proposal.mjs <proposal-id>
//
// Prints the /p/:token link to open. Hand-written fixture — day 4 replaces this
// with graphs authored from the two real stuck proposals.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || "http://localhost:5000";

const GRAPH = {
  preset: "pipeline",
  headline: "Estate matters move from intake to engagement without anyone retyping a thing.",
  headline_metric: { unit: "hrs_month", amount: 31, basis: "across 4 fee earners at current matter volume" },
  nodes: [
    {
      id: "intake-form",
      kind: "trigger",
      actor: "system",
      cluster: "intake",
      label: "Enquiry lands",
      description: "A new estate enquiry arrives from your website form or an inbound email, and opens a matter record automatically.",
      value: { unit: "hrs_month", amount: 4 },
      confidence: "committed",
      needs: [
        { id: "form-url", type: "text", required: true, prompt: "Where do estate enquiries come in today? (form URL or inbox)" },
        { id: "intake-owner", type: "contact", required: false, prompt: "Who currently picks these up first?" },
      ],
      gives: [{ label: "Matter opened automatically", detail: "No one rekeys the enquiry into Smokeball." }],
      assumptions: ["Assumes enquiries arrive in one of two places, not five"],
    },
    {
      id: "conflict-check",
      kind: "step",
      actor: "system",
      cluster: "intake",
      label: "Conflict check",
      description: "Cross-references the parties against your existing matter list before anyone spends time on the file.",
      value: { unit: "hrs_month", amount: 3 },
      confidence: "committed",
      needs: [
        { id: "conflict-source", type: "choice", required: true, prompt: "Where does the conflict list live?", options: ["Smokeball", "Spreadsheet", "Both", "Somewhere else"] },
      ],
      gives: [{ label: "Conflict result on the file", detail: "Logged with a timestamp, so it's auditable." }],
      assumptions: [],
    },
    {
      id: "precedent-coding",
      kind: "ai",
      actor: "ai",
      cluster: "build",
      label: "Precedent coding",
      description: "Your wills precedent is turned into a fillable template so matter data populates it directly. The model drafts; it does not decide what the clause should say.",
      value: { unit: "hrs_month", amount: 11 },
      confidence: "committed",
      needs: [
        { id: "wills-precedent", type: "file", required: true, prompt: "Your current wills precedent (.docx)" },
        { id: "trust-exception", type: "longtext", required: true, prompt: "What changes when there's a testamentary trust?" },
        { id: "sb-admin", type: "contact", required: false, prompt: "Who administers your Smokeball instance?" },
      ],
      gives: [{ label: "Auto-populated will + schedule", detail: "Drafted from matter data in under a minute." }],
      assumptions: ["Assumes precedents are Word, not scanned PDF"],
    },
    {
      id: "fee-earner-review",
      kind: "hitl",
      actor: "human_lexops",
      cluster: "build",
      label: "Fee earner review",
      description: "Nothing generated reaches a client until one of your fee earners has read it and approved it.",
      value: { unit: "hrs_month", amount: 2 },
      confidence: "committed",
      needs: [
        { id: "reviewer", type: "text", required: true, prompt: "Who signs off drafts before they leave the firm?" },
        { id: "review-sla", type: "choice", required: false, prompt: "How quickly should a draft reach the reviewer?", options: ["Same day", "Within 24 hours", "Within 48 hours"] },
      ],
      gives: [{ label: "A human signature on every draft", detail: "Nothing leaves your firm unreviewed." }],
      assumptions: [],
    },
    {
      id: "engagement-gate",
      kind: "gate",
      actor: "human_client",
      cluster: "engage",
      label: "Client accepts engagement",
      description: "The client signs, and the matter moves into active work. If they don't, the file parks without anyone chasing it manually.",
      value: { unit: "hrs_month", amount: 5 },
      confidence: "scoped",
      needs: [
        { id: "esign-tool", type: "choice", required: true, prompt: "What do you use for signatures today?", options: ["DocuSign", "Adobe Sign", "Smokeball", "Wet ink", "Nothing consistent"] },
        { id: "chase-rule", type: "confirm", required: false, prompt: "Should unsigned engagements chase themselves after 5 days?", confirm_label: "Yes, chase automatically" },
      ],
      gives: [{ label: "Signed engagement on file", detail: "Filed against the matter without a manual upload." }],
      assumptions: [],
    },
    {
      id: "matter-pack",
      kind: "artifact",
      actor: "system",
      cluster: "engage",
      label: "Matter pack",
      description: "The finished bundle — will, schedule, engagement letter, and file note — assembled and filed.",
      value: { unit: "hrs_month", amount: 6 },
      confidence: "committed",
      needs: [
        { id: "pack-contents", type: "longtext", required: false, prompt: "Anything else that belongs in a completed estate pack?" },
      ],
      gives: [{ label: "One bundle, correctly filed", detail: "Named to your convention, in the right matter folder." }],
      assumptions: [],
    },
    {
      id: "smokeball",
      kind: "system",
      actor: "system",
      cluster: "engage",
      label: "Smokeball",
      description: "Your practice management system stays the source of truth throughout. We write to it; we don't replace it.",
      confidence: "committed",
      needs: [
        { id: "sb-access", type: "confirm", required: true, prompt: "Can you give us API access to Smokeball during the build?", confirm_label: "Yes, we can arrange that" },
      ],
      gives: [{ label: "No second system to keep in sync", detail: "" }],
      assumptions: ["Assumes your Smokeball plan includes API access"],
    },
  ],
  edges: [
    { from: "intake-form", to: "conflict-check", kind: "triggers" },
    { from: "conflict-check", to: "precedent-coding", kind: "depends" },
    { from: "precedent-coding", to: "fee-earner-review", kind: "data" },
    { from: "fee-earner-review", to: "engagement-gate", kind: "triggers" },
    { from: "engagement-gate", to: "matter-pack", kind: "triggers" },
    { from: "matter-pack", to: "smokeball", kind: "data" },
  ],
};

async function main() {
  let proposalId = process.argv[2];

  if (!proposalId) {
    const { data } = await sb
      .from("proposals")
      .select("id, name, client_name, status")
      .order("created_at", { ascending: false })
      .limit(20);
    const target = (data || []).find((p) => p.status === "sent") || (data || [])[0];
    if (!target) {
      console.error("No proposals found. Pass a proposal id explicitly.");
      process.exit(1);
    }
    proposalId = target.id;
    console.log(`Using proposal: ${target.name} (${target.client_name})`);
  }

  const { data: graph, error: graphErr } = await sb
    .from("proposal_graphs")
    .upsert({ proposal_id: proposalId, version: 1, ...GRAPH, published_at: new Date().toISOString() },
            { onConflict: "proposal_id,version" })
    .select().single();
  if (graphErr) {
    console.error("Graph upsert failed:", graphErr.message);
    console.error("Have you run supabase/living_proposal.sql?");
    process.exit(1);
  }
  console.log(`Graph saved — ${graph.nodes.length} nodes, ${graph.edges.length} edges.`);

  const { data: proposal } = await sb.from("proposals").select("*").eq("id", proposalId).single();

  let { data: recipient } = await sb
    .from("proposal_recipients")
    .select("*").eq("proposal_id", proposalId).is("invited_by", null).maybeSingle();

  if (!recipient) {
    const token = randomUUID().replace(/-/g, "");
    const { data: created, error: recErr } = await sb.from("proposal_recipients").insert({
      proposal_id: proposalId,
      email: proposal.client_email,
      name: proposal.client_contact_name || proposal.client_name,
      token,
      invited_by: null,
    }).select().single();
    if (recErr) { console.error("Recipient insert failed:", recErr.message); process.exit(1); }
    recipient = created;
  }

  await sb.from("proposals")
    .update({ state: "sent", ball_in_court: "client", current_version: 1 })
    .eq("id", proposalId);

  console.log(`\nOpen this:\n  ${SITE_URL}/p/${recipient.token}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
