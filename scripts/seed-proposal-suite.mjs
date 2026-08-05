// ---------------------------------------------------------------------------
// Seed the proposal suite — proposals + graphs + recipient tokens.
//
//   node --env-file=.env scripts/seed-proposal-suite.mjs           # all
//   node --env-file=.env scripts/seed-proposal-suite.mjs br-legal  # one
//   node --env-file=.env scripts/seed-proposal-suite.mjs --links   # print links only
//
// Idempotent: matches an existing proposal on `name` and updates it rather than
// creating duplicates, and reuses an existing primary recipient token so links
// already opened stay valid.
//
// Recipient email defaults to LP_SEED_EMAIL (or isuru@lex-ops.io) rather than
// the real client contact — a live token bound to a client's address is one
// mis-click away from sending a test proposal to a real firm.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SUITE } from "./proposal-suite.mjs";

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || "http://localhost:5000";
const SEED_EMAIL = process.env.LP_SEED_EMAIL || "isuru@lex-ops.io";

function newToken() {
  return randomUUID().replace(/-/g, "");
}

// Set when proposal_graphs is missing the deliverables/scenarios columns.
let missingColumns = false;
let missingSections = false;

/** Every node id referenced by an edge must exist, or the canvas draws into space. */
function validate(entry) {
  const { slug, graph } = entry;
  const ids = new Set(graph.nodes.map((n) => n.id));
  const problems = [];

  if (ids.size !== graph.nodes.length) problems.push("duplicate node ids");

  for (const e of graph.edges) {
    if (!ids.has(e.from)) problems.push(`edge from unknown node "${e.from}"`);
    if (!ids.has(e.to)) problems.push(`edge to unknown node "${e.to}"`);
  }

  const deliverableIds = new Set((graph.deliverables || []).map((d) => d.id));
  const scenarioIds = new Set((graph.scenarios || []).map((s) => s.id));
  for (const n of graph.nodes) {
    if (n.deliverable && !deliverableIds.has(n.deliverable)) {
      problems.push(`node "${n.id}" references unknown deliverable "${n.deliverable}"`);
    }
    for (const s of n.scenarios || []) {
      if (!scenarioIds.has(s)) problems.push(`node "${n.id}" references unknown scenario "${s}"`);
    }
    const needIds = new Set();
    for (const need of n.needs || []) {
      if (needIds.has(need.id)) problems.push(`node "${n.id}" has duplicate need "${need.id}"`);
      needIds.add(need.id);
      if (!need.prompt) problems.push(`node "${n.id}" need "${need.id}" has no prompt`);
    }
  }

  if (problems.length) {
    console.error(`\n  ✗ ${slug} failed validation:`);
    for (const p of problems) console.error(`      ${p}`);
    return false;
  }
  return true;
}

async function seedOne(entry) {
  const { name, client_name, client_contact_name, pain_points, objectives, graph } = entry;

  // --- proposal row -------------------------------------------------------
  const { data: existing } = await sb
    .from("proposals").select("id, token").eq("name", name).maybeSingle();

  let proposalId = existing?.id;

  const fields = {
    name,
    client_name,
    client_contact_name: client_contact_name || null,
    client_email: SEED_EMAIL,
    pain_points: pain_points || [],
    objectives: objectives || [],
    status: "sent",
    state: "sent",
    ball_in_court: "client",
    current_version: 1,
    updated_at: new Date().toISOString(),
  };

  if (proposalId) {
    const { error } = await sb.from("proposals").update(fields).eq("id", proposalId);
    if (error) throw new Error(`proposal update: ${error.message}`);
  } else {
    const { data, error } = await sb.from("proposals")
      .insert({ ...fields, token: randomUUID() }).select("id").single();
    if (error) throw new Error(`proposal insert: ${error.message}`);
    proposalId = data.id;
  }

  // --- graph --------------------------------------------------------------
  const { error: graphErr } = await sb.from("proposal_graphs").upsert({
    proposal_id: proposalId,
    version: 1,
    preset: graph.preset,
    headline: graph.headline,
    headline_metric: graph.headline_metric,
    nodes: graph.nodes,
    // deliverables and scenarios ride along on the edges payload's sibling —
    // stored on the graph row so one fetch returns everything the rail needs.
    edges: graph.edges,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "proposal_id,version" });
  if (graphErr) throw new Error(`graph upsert: ${graphErr.message}`);

  // deliverables + scenarios live in their own columns. If living_proposal.sql
  // hasn't been re-run since they were added, seed the graph anyway and say so —
  // a missing rail is a degraded page, not a failed seed.
  const { error: metaErr } = await sb.from("proposal_graphs").update({
    deliverables: graph.deliverables || [],
    scenarios: graph.scenarios || [],
    explainers: graph.explainers || [],
  }).eq("proposal_id", proposalId).eq("version", 1);
  if (metaErr) {
    if (/column .* does not exist|Could not find the '/i.test(metaErr.message)) {
      missingColumns = true;
    } else {
      throw new Error(`graph meta update: ${metaErr.message}`);
    }
  }

  // `sections` goes in its own statement, not bundled with the three above.
  // Bundled, a missing `sections` column would fail the whole update and take
  // deliverables, scenarios and explainers down with it — a migration nobody
  // has run yet would silently un-seed three things that were working.
  const { error: sectionsErr } = await sb.from("proposal_graphs").update({
    sections: graph.sections || {},
  }).eq("proposal_id", proposalId).eq("version", 1);
  if (sectionsErr) {
    if (/column .* does not exist|Could not find the '/i.test(sectionsErr.message)) {
      missingSections = true;
    } else {
      throw new Error(`graph sections update: ${sectionsErr.message}`);
    }
  }

  // --- recipient ----------------------------------------------------------
  let { data: recipient } = await sb
    .from("proposal_recipients").select("*")
    .eq("proposal_id", proposalId).is("invited_by", null).maybeSingle();

  if (!recipient) {
    const { data, error } = await sb.from("proposal_recipients").insert({
      proposal_id: proposalId,
      email: SEED_EMAIL,
      name: client_contact_name || client_name,
      token: newToken(),
      invited_by: null,
    }).select().single();
    if (error) throw new Error(`recipient insert: ${error.message}`);
    recipient = data;
  }

  const required = graph.nodes.reduce(
    (n, node) => n + (node.needs || []).filter((x) => x.required !== false).length, 0);
  const optional = graph.nodes.reduce(
    (n, node) => n + (node.needs || []).filter((x) => x.required === false).length, 0);

  return { proposalId, token: recipient.token, nodes: graph.nodes.length,
           edges: graph.edges.length, deliverables: (graph.deliverables || []).length,
           scenarios: (graph.scenarios || []).length, required, optional };
}

async function main() {
  const arg = process.argv[2];
  const linksOnly = arg === "--links";
  const targets = arg && !linksOnly ? SUITE.filter((e) => e.slug === arg) : SUITE;

  if (!targets.length) {
    console.error(`No proposal matching "${arg}". Available: ${SUITE.map((e) => e.slug).join(", ")}`);
    process.exit(1);
  }

  if (!linksOnly) {
    console.log(`Validating ${targets.length} graph${targets.length === 1 ? "" : "s"}…`);
    const ok = targets.map(validate);
    if (ok.includes(false)) { console.error("\nFix the above before seeding. Nothing was written."); process.exit(1); }
    console.log("  all valid\n");
  }

  const rows = [];
  for (const entry of targets) {
    if (linksOnly) {
      const { data: p } = await sb.from("proposals").select("id").eq("name", entry.name).maybeSingle();
      if (!p) { console.log(`  ${entry.slug.padEnd(30)} not seeded`); continue; }
      const { data: r } = await sb.from("proposal_recipients")
        .select("token").eq("proposal_id", p.id).is("invited_by", null).maybeSingle();
      console.log(`  ${entry.slug.padEnd(30)} ${SITE_URL}/p/${r?.token || "—"}`);
      continue;
    }
    try {
      const result = await seedOne(entry);
      rows.push({ slug: entry.slug, ...result });
      console.log(
        `  ✓ ${entry.slug.padEnd(30)} ${String(result.nodes).padStart(2)} nodes · ` +
        `${String(result.edges).padStart(2)} edges · ${result.deliverables} deliverable(s) · ` +
        `${result.scenarios} scenario(s) · ${result.required} required + ${result.optional} optional needs`
      );
    } catch (err) {
      console.error(`  ✗ ${entry.slug}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  if (linksOnly) return;

  console.log("\nLinks:");
  for (const r of rows) console.log(`  ${r.slug.padEnd(30)} ${SITE_URL}/p/${r.token}`);

  const totals = rows.reduce((a, r) => ({
    nodes: a.nodes + r.nodes, required: a.required + r.required, optional: a.optional + r.optional,
  }), { nodes: 0, required: 0, optional: 0 });
  console.log(`\n${rows.length} proposals · ${totals.nodes} nodes · ` +
              `${totals.required} required needs · ${totals.optional} optional`);
  console.log(`Recipient email on every token: ${SEED_EMAIL}`);

  if (missingColumns) {
    console.warn(
      "\n⚠  proposal_graphs has no `deliverables` / `scenarios` columns, so the\n" +
      "   deliverable rail won't render. Re-run supabase/living_proposal.sql\n" +
      "   (idempotent) in the Supabase SQL editor, then re-run this script."
    );
  }

  if (missingSections) {
    console.warn(
      "\n⚠  proposal_graphs has no `sections` column, so Acts III–V (roadmap,\n" +
      "   investment, UAT) have no data and the page will say so rather than\n" +
      "   guess. Paste supabase/proposal_sections.sql into the Supabase SQL\n" +
      "   editor (one ALTER TABLE, idempotent), then re-run this script."
    );
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
