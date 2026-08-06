// ---------------------------------------------------------------------------
// Attach each firm's shared proposal PDF to its living proposal.
// ---------------------------------------------------------------------------
//   node --env-file=.env scripts/attach-proposal-pdfs.mjs            # dry run
//   node --env-file=.env scripts/attach-proposal-pdfs.mjs --apply    # writes
//   ... --dir "C:/path/to/pdfs"                                      # source
//
// Uploads to the public `proposal-assets` bucket and sets `proposals.pdf_url`,
// which is what `GET /api/lp/p/:token` serves (livingProposal.ts) and what the
// client's Download button reads (ProposalActs.jsx). The admin list and editor
// read the same field, so one write lights up all three.
//
// The object path is keyed by the proposal's uuid, not by firm name — the
// bucket is public, so a guessable path would let anyone who knows one firm's
// URL construct another's. Idempotent: fixed paths plus `upsert: true`, so
// re-running replaces in place rather than orphaning an old object.
//
// MAP is keyed by `proposals.client_name` and is deliberately explicit. Fuzzy
// matching a firm to a filename is exactly the kind of cleverness that ends
// with one client receiving another's pricing.
// ---------------------------------------------------------------------------
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const dirFlag = process.argv.indexOf("--dir");
const DIR = (dirFlag > -1 ? process.argv[dirFlag + 1] : process.env.PDF_DIR || "C:/Users/YOGA/Downloads")
  .replace(/[\\/]+$/, "") + "/";
const BUCKET = "proposal-assets";

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Automation Lab and Nautilus Law are intentionally absent — no current shared
// PDF exists for either. Marwick Legal LLP is test data and never gets one.
const MAP = {
  "Beena Rezaee Legal & Migration": "BR Legal Proposal vShared.pdf",
  "Creative Family Law Solutions":  "Creative Family Law Solutions 2nd Proposal vShared.pdf",
  "Minerva Law":                    "Minerva Law Proposal vShared.pdf",
  "St Ives Law":                    "St Ives Law Proposal vShared.pdf",
  "Land Law":                       "Land Law Proposal vShared.pdf",
  "Foyle Legal":                    "Foyle Legal Proposal vShared.pdf",
  "Enable College":                 "Enable College Proposal vShared.pdf",
  "Dziura Compliance Consulting":   "20260803 Dziura Compliance Consulting Proposal vShared.pdf",
};

const { data: graphs } = await sb.from("proposal_graphs").select("proposal_id");
const ids = new Set((graphs || []).map((g) => g.proposal_id));
const { data: rows } = await sb.from("proposals").select("id, client_name, pdf_url");
const live = (rows || []).filter((r) => ids.has(r.id));

console.log(APPLY ? "=== APPLY ===" : "=== DRY RUN (no writes) ===");
console.log(`source: ${DIR}\n`);

for (const [client, file] of Object.entries(MAP)) {
  const matches = live.filter((r) => r.client_name === client);
  if (matches.length !== 1) {
    console.log(`SKIP  ${client.padEnd(32)} matched ${matches.length} rows`);
    continue;
  }
  const row = matches[0];

  let buf;
  try { buf = await readFile(DIR + file); }
  catch { console.log(`SKIP  ${client.padEnd(32)} file not found: ${file}`); continue; }

  if (buf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    console.log(`SKIP  ${client.padEnd(32)} not a PDF: ${file}`);
    continue;
  }

  const path = `living-proposals/${row.id}/proposal.pdf`;
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  const size = (buf.length / 1048576).toFixed(1);

  if (!APPLY) { console.log(`WOULD ${client.padEnd(32)} ${size}MB -> ${path}`); continue; }

  const { error: upErr } = await sb.storage.from(BUCKET)
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (upErr) { console.log(`ERR   ${client.padEnd(32)} upload: ${upErr.message}`); continue; }

  const { error: dbErr } = await sb.from("proposals").update({ pdf_url: pub.publicUrl }).eq("id", row.id);
  if (dbErr) { console.log(`ERR   ${client.padEnd(32)} db: ${dbErr.message}`); continue; }

  console.log(`OK    ${client.padEnd(32)} ${size}MB -> ${path}`);
}
