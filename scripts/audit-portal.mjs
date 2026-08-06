// ---------------------------------------------------------------------------
// Portal audit — does the live database actually support the code?
// ---------------------------------------------------------------------------
//   node --env-file=.env scripts/audit-portal.mjs
//
// This exists because of a specific failure mode this project keeps hitting:
// the SQL is written as a file in `supabase/`, the routes are written against
// it, everything typechecks — and the script was never pasted into the Supabase
// SQL editor. Nothing catches that. The route only fails when a client clicks
// the button, in production, weeks later.
//
// That is exactly how `proposals.approved_at` shipped missing: the approve
// endpoint, the client button, the state machine and proposal_approval.sql were
// all correct and the migration had simply never been run.
//
// Read-only. It selects, it never writes, so it is safe against production —
// which this database is.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env");
  process.exit(1);
}
const sb = createClient(url, key);

let failures = 0;
const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;

function report(passed, label, detail) {
  if (!passed) failures++;
  console.log(`  ${passed ? ok("ok     ") : bad("MISSING")}  ${label}${detail ? `  — ${detail}` : ""}`);
}

// Every table the living-proposal routes touch, and which script creates it.
const TABLES = {
  proposals: "supabase/proposals.sql",
  proposal_graphs: "supabase/living_proposal.sql",
  proposal_inputs: "supabase/living_proposal.sql",
  proposal_notes: "supabase/living_proposal.sql",
  proposal_recipients: "supabase/living_proposal.sql",
  proposal_events: "supabase/living_proposal.sql",
};

// Columns the routes read or write, keyed by the script that adds them. A
// column missing here means a specific endpoint 500s at runtime.
const COLUMNS = {
  proposals: {
    "supabase/proposals.sql": ["name", "client_name", "client_contact_name", "client_email", "token", "pdf_url"],
    "supabase/living_proposal.sql": ["state", "ball_in_court", "current_version", "last_client_activity_at", "last_nudged_at"],
    "supabase/proposal_approval.sql": ["approved_at"],
  },
  proposal_graphs: {
    "supabase/living_proposal.sql": ["preset", "headline", "headline_metric", "nodes", "edges", "deliverables", "scenarios", "explainers", "published_at"],
    "supabase/proposal_sections.sql": ["sections"],
  },
};

console.log("\nTABLES");
for (const [table, script] of Object.entries(TABLES)) {
  const { error, count } = await sb.from(table).select("*", { count: "exact", head: true });
  report(!error, table, error ? `run ${script}` : `${count} rows`);
}

console.log("\nCOLUMNS");
for (const [table, byScript] of Object.entries(COLUMNS)) {
  for (const [script, cols] of Object.entries(byScript)) {
    for (const col of cols) {
      const { error } = await sb.from(table).select(col).limit(1);
      report(!error, `${table}.${col}`, error ? `run ${script}` : "");
    }
  }
}

console.log("\nVIEWS");
{
  const { error } = await sb.from("stalled_proposals").select("*").limit(1);
  report(!error, "stalled_proposals", error ? "run supabase/living_proposal.sql" : "");
}

// The state machine. The CHECK constraint can't be read through PostgREST, so
// this infers it from `approved_at`: both are added by the same script, so if
// the column is missing the constraint has not been widened either and
// POST /p/:token/approve will be rejected by the database.
console.log("\nSTATE MACHINE");
{
  const { error } = await sb.from("proposals").select("approved_at").limit(1);
  report(
    !error,
    "state allows 'approved'",
    error ? "proposal_approval.sql not applied — the client Approve button will 500" : "",
  );
}

console.log(
  failures === 0
    ? `\n${ok("All checks passed.")} The database supports every route.\n`
    : `\n${bad(`${failures} check(s) failed.`)} Paste the named scripts into the Supabase SQL editor.\n`,
);
process.exit(failures === 0 ? 0 : 1);
