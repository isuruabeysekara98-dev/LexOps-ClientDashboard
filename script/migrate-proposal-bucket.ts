// One-off migration: move proposal assets out of the private-bound "project-documents"
// bucket into a dedicated public "proposal-assets" bucket, and update stored URLs.
//
// Run AFTER creating the proposal-assets bucket (see docs/audit-fixes-2026-06-26.md),
// and BEFORE flipping project-documents to private.
//
//   npx tsx script/migrate-proposal-bucket.ts            # dry run (no writes)
//   npx tsx script/migrate-proposal-bucket.ts --apply    # perform the move + DB update
//   npx tsx script/migrate-proposal-bucket.ts --apply --delete-originals
//
// Idempotent: files already in proposal-assets are skipped; re-running is safe.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SRC = "project-documents";
const DEST = "proposal-assets";
const APPLY = process.argv.includes("--apply");
const DELETE_ORIGINALS = process.argv.includes("--delete-originals");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Copy one object from SRC→DEST at the same path. Returns "moved" | "skipped" | "missing".
async function moveObject(path: string): Promise<"moved" | "skipped" | "missing"> {
  // Already present in destination? skip the byte copy.
  const { data: existing } = await supabase.storage.from(DEST).download(path);
  if (existing) return "skipped";

  const { data: blob, error: dlErr } = await supabase.storage.from(SRC).download(path);
  if (dlErr || !blob) {
    console.warn(`  ! source missing: ${path} (${dlErr?.message || "no data"})`);
    return "missing";
  }
  if (!APPLY) return "moved";

  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(DEST)
    .upload(path, buf, { contentType: (blob as any).type || "application/octet-stream", upsert: true });
  if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);

  if (DELETE_ORIGINALS) {
    await supabase.storage.from(SRC).remove([path]).catch(() => {});
  }
  return "moved";
}

async function migrateProposals() {
  const { data: rows, error } = await supabase
    .from("proposals")
    .select("id, storage_path, pdf_url")
    .not("storage_path", "is", null);
  if (error) throw new Error(`load proposals: ${error.message}`);

  let moved = 0, skipped = 0, missing = 0;
  for (const p of rows || []) {
    const path: string = p.storage_path;
    if (!path?.startsWith("proposals/")) continue;
    const result = await moveObject(path);
    if (result === "missing") { missing++; continue; }
    result === "moved" ? moved++ : skipped++;
    const newUrl = publicUrl(DEST, path);
    if (APPLY && p.pdf_url !== newUrl) {
      const { error: updErr } = await supabase.from("proposals").update({ pdf_url: newUrl }).eq("id", p.id);
      if (updErr) console.warn(`  ! proposals.pdf_url update ${p.id}: ${updErr.message}`);
    }
  }
  console.log(`proposals: moved=${moved} skipped=${skipped} missing=${missing} (of ${rows?.length || 0})`);
}

async function migrateClientFiles() {
  const { data: rows, error } = await supabase
    .from("proposal_client_files")
    .select("id, storage_path, file_url");
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      console.log("proposal_client_files: table absent, skipping");
      return;
    }
    throw new Error(`load proposal_client_files: ${error.message}`);
  }

  let moved = 0, skipped = 0, missing = 0;
  for (const f of rows || []) {
    const path: string = f.storage_path;
    if (!path) continue;
    const result = await moveObject(path);
    if (result === "missing") { missing++; continue; }
    result === "moved" ? moved++ : skipped++;
    const newUrl = publicUrl(DEST, path);
    if (APPLY && f.file_url !== newUrl) {
      const { error: updErr } = await supabase.from("proposal_client_files").update({ file_url: newUrl }).eq("id", f.id);
      if (updErr) console.warn(`  ! proposal_client_files.file_url update ${f.id}: ${updErr.message}`);
    }
  }
  console.log(`proposal_client_files: moved=${moved} skipped=${skipped} missing=${missing} (of ${rows?.length || 0})`);
}

(async () => {
  console.log(`\nProposal bucket migration ${SRC} → ${DEST}`);
  console.log(APPLY ? (DELETE_ORIGINALS ? "MODE: apply + delete originals" : "MODE: apply (originals kept)") : "MODE: dry run (no writes)\n");
  await migrateProposals();
  await migrateClientFiles();
  console.log(APPLY ? "\nDone." : "\nDry run complete — re-run with --apply to perform the move.\n");
})().catch((e) => { console.error("\nMigration failed:", e.message); process.exit(1); });
