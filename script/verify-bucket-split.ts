// Read-only verification of the proposal bucket split. Writes nothing.
//   npx tsx script/verify-bucket-split.ts

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function bucketInfo(id: string) {
  const { data } = await supabase.storage.getBucket(id);
  return data ? `public=${data.public}` : "NOT FOUND";
}

// Does the object actually exist at this path in the bucket?
async function exists(bucket: string, path: string): Promise<boolean> {
  const { data } = await supabase.storage.from(bucket).download(path);
  return !!data;
}

(async () => {
  console.log("\n=== Buckets ===");
  console.log("project-documents:", await bucketInfo("project-documents"));
  console.log("proposal-assets:  ", await bucketInfo("proposal-assets"));

  console.log("\n=== proposals (pdf) ===");
  const { data: props } = await supabase
    .from("proposals").select("id, storage_path, pdf_url").not("storage_path", "is", null);
  let pOk = 0, pBad = 0, pMissing = 0;
  for (const p of props || []) {
    const onNew = (p.pdf_url || "").includes("/proposal-assets/");
    const present = await exists("proposal-assets", p.storage_path);
    if (onNew && present) pOk++;
    else if (!present) { pMissing++; console.log(`  MISSING in proposal-assets: ${p.storage_path} (id=${p.id})`); }
    else { pBad++; console.log(`  URL not repointed: id=${p.id} pdf_url=${p.pdf_url}`); }
  }
  console.log(`proposals: ok=${pOk} url_not_repointed=${pBad} missing_file=${pMissing} (of ${props?.length || 0})`);

  console.log("\n=== proposal_client_files ===");
  const { data: files, error: fErr } = await supabase
    .from("proposal_client_files").select("id, storage_path, file_url");
  if (fErr && /relation .* does not exist/i.test(fErr.message)) {
    console.log("table absent — skipping");
  } else {
    let ok = 0, bad = 0, missing = 0;
    for (const f of files || []) {
      if (!f.storage_path) continue;
      const onNew = (f.file_url || "").includes("/proposal-assets/");
      const present = await exists("proposal-assets", f.storage_path);
      if (onNew && present) ok++;
      else if (!present) { missing++; console.log(`  MISSING in proposal-assets: ${f.storage_path} (id=${f.id})`); }
      else { bad++; console.log(`  URL not repointed: id=${f.id} file_url=${f.file_url}`); }
    }
    console.log(`proposal_client_files: ok=${ok} url_not_repointed=${bad} missing_file=${missing} (of ${files?.length || 0})`);
  }

  console.log("\n=== Sanity: any document/invoice URLs still public? (informational) ===");
  const { count: docCount } = await supabase
    .from("documents").select("id", { count: "exact", head: true });
  const { count: invCount } = await supabase
    .from("invoices").select("id", { count: "exact", head: true });
  console.log(`documents rows=${docCount ?? "?"}, invoices rows=${invCount ?? "?"} (these download via signed URLs now)`);
  console.log("");
})().catch((e) => { console.error("Verify failed:", e.message); process.exit(1); });
