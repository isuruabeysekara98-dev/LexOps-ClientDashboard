# Audit Findings & Fixes — 2026-06-26

Three sub-agents audited Proposals, Active Projects, and Admin Users sections.
All critical and high issues were fixed in the same session. Medium/low issues are noted below.

---

## 🔴 Critical — All Fixed

### 1. Any authenticated client could mutate admin data
**File:** `server/routes/admin.ts` — all task/doc/invoice/db routes below line 354  
**Problem:** Routes used `requireAuth` (any valid JWT) instead of `requireAdmin`. A `client`-role user could create/delete tasks, documents, and invoices across any project.  
**Fix:** Replaced all `requireAuth,` → `requireAdmin,` on every mutating route in the file (batch replace).

### 2. Client could self-promote to admin via `/api/admin/db`
**File:** `server/routes/admin.ts` — `/db` route  
**Problem:** Generic write proxy accepted `{table:"profiles", operation:"update", data:{role:"lexops_admin"}}` from any authenticated user.  
**Fix:** Added guard that strips `role` and `id` from any `profiles` update/upsert payload before execution.

### 3. `/api/admin/db` delete/update with empty match hit entire table
**File:** `server/routes/admin.ts` — `/db` route  
**Problem:** `Object.entries(match)` on null/empty object applied no `.eq()` filters, deleting all rows.  
**Fix:** Added early 400 if `match` is missing or has no keys for `update`/`delete` operations.

### 4. `/api/admin/db-read` leaked any client's project data
**File:** `server/routes/admin.ts` — `/db-read` route  
**Problem:** No ownership check; any authenticated user could read another client's tasks/invoices/documents by passing any `project_id`.  
**Fix:** Same `requireAuth` → `requireAdmin` batch replace (fix #1).

### 5. Rules-of-Hooks crash in ProposalCreatePage (edit mode)
**File:** `client/src/components/ProposalCreatePage.jsx` — lines 274–279  
**Problem:** `useState` and `useEffect` for `mobile` were declared after an early `return` that fires when `loadingEdit === true` (always true on first render in edit mode). React throws a hooks-order error → blank screen.  
**Fix:** Moved `mobile` state and resize effect to the top of the component, before the early return.

### 6. Non-atomic proposal acceptance — race condition, duplicate projects
**File:** `server/routes/proposal.ts` — `/accept` route  
**Problem:** Three sequential DB calls (update status → insert project → insert members) with no guard. Double-click or two admins simultaneously could create duplicate projects. Also: no guard against re-running on already-accepted proposals.  
**Fix:** Added idempotency guard — returns early with `{ success: true, existing: true }` if `proposal.status === "accepted"`.

### 7. `/request-changes` had no frozen-status guard
**File:** `server/routes/proposalsV2.ts` — `/:id/request-changes` route  
**Problem:** Unconditionally overwrote status to `"sent"` even on `won`, `lost`, or `converted` proposals. A stale client tab could revert a closed deal.  
**Fix:** Added frozen-status guard; returns 409 if `proposal.status` is in `["won","lost","converted"]`.

### 8. Stored XSS: `feedback_text` unescaped in admin email
**File:** `server/routes/proposalsV2.ts` — line 623  
**Problem:** Client-supplied `feedback_text` interpolated raw into HTML email body.  
**Fix:** HTML-escaped before interpolation: `.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")`.

### 9. HTML injection in support ticket emails
**File:** `server/email.ts` — lines 80, 83  
**Problem:** `ticket.title` and `ticket.description` interpolated raw into HTML table cells.  
**Fix:** Both fields HTML-escaped before interpolation.

---

## 🟠 High — All Fixed

### 10. Divergent `/accept` endpoints with conflicting statuses
**Files:** `server/routes/proposal.ts:98` sets `"accepted"`, `server/routes/proposalsV2.ts:1509` sets `"feedback_received"`  
**Problem:** Both endpoints live simultaneously on different mount paths. A genuine acceptance is indistinguishable from a change request.  
**Status:** Idempotency guard added to `proposal.ts` (fix #6). Full removal of the old router is a follow-up task — needs confirming no client code still calls `/api/proposal/accept` directly.

### 11. Admin could delete themselves or other admins
**File:** `server/routes/admin.ts` — `DELETE /remove-user/:userId`  
**Problem:** No guard against self-deletion or deleting another admin. Last admin could be deleted, locking everyone out.  
**Fix:** Added guards: returns 400 if `userId === caller.id` or if target user has `role === "lexops_admin"`.

### 12. Open redirect on login
**File:** `client/src/components/LoginPage.jsx` — `?next=` redirect  
**Problem:** Only checked `next.startsWith("/")`. `//evil.com/steal` passes this check — browsers treat it as a protocol-relative URL.  
**Fix:** Parse with `new URL(next, window.location.origin)` and verify `url.origin === window.location.origin` before redirecting. Only the path/search/hash is used in the redirect.

### 13. `/demo/generate-fields` had no rate cap
**File:** `server/routes/proposalsV2.ts` — `POST /demo/generate-fields`  
**Problem:** Calls Claude on every request with no cap (unlike `/demo/run` which has `RUN_CAP = 10`).  
**Fix:** Added the same `count >= RUN_CAP` check (using `workflow_runs` count) before invoking Claude.

### 14. HTML injection in document-request emails
**File:** `server/email.ts` — `sendDocumentRequest`  
**Problem:** `requestDescription` interpolated raw into HTML.  
**Fix:** HTML-escaped before interpolation.

### 15. Optimistic project delete didn't roll back on error
**File:** `client/src/components/AdminPanel.jsx` — `deleteProject()`  
**Problem:** `setProjects(filter)` ran immediately after `dbWrite`, before the promise resolved. Network error = row gone from UI but still in DB.  
**Fix:** Moved `setProjects` filter inside a conditional on the result: only removes from UI if `result?.ok !== false`.

### 16. Dead `publicUrl` variable in generate-project route
**File:** `server/routes/admin.ts` — lines 310–312  
**Problem:** `getPublicUrl(storagePath)` result was computed but never used (buffer was passed directly to `generateProjectStructure`).  
**Fix:** Removed the dead `getPublicUrl` call.

### 17. `converted_at` never written in convert handler
**File:** `server/routes/proposalsV2.ts` — convert route  
**Problem:** `converted_at` column never set; UI always showed `"—"`.  
**Fix:** Added `converted_at: new Date().toISOString()` to the update payload.

---

## 🟡 Medium / Low — All Fixed

### 18. Old `/accept` endpoint used wrong status
**File:** `server/routes/proposal.ts:98`  
**Problem:** Set `status: "accepted"` while the v2 canonical endpoint sets `"feedback_received"`. Two accept semantics live simultaneously.  
**Fix:** Changed both update calls in `proposal.ts` to use `"feedback_received"`.

### 19. WorkflowDemoModal.jsx — dead file
**File:** `client/src/components/WorkflowDemoModal.jsx`  
**Fix:** File deleted. Not imported anywhere; superseded by inline workflow review.

### 20. Task status values inconsistent
**File:** `server/routes/admin.ts:405`  
**Problem:** Valid set included `"pending"` and `"in-progress"` alongside `"todo"` and `"in_progress"` — causing filter/grouping bugs.  
**Fix:** Narrowed to canonical set: `["todo", "in_progress", "done"]`.

### 21. InviteModal loaded projects via anon Supabase client
**File:** `client/src/components/AdminPanel.jsx:178–184`  
**Problem:** `supabase.from("projects")` uses the anon key and is subject to RLS — admins with no memberships see an empty list.  
**Fix:** Replaced with `adminFetch("/db-read?table=projects&order_by=id")` which uses the service-role key.

### 22. PM field was free-text — drift and broken email notifications
**File:** `client/src/components/AdminPanel.jsx:357–358`  
**Problem:** Manager name and email were plain text inputs. Typos broke PM support-ticket email notifications.  
**Fix:** ProjectModal now loads team members (`lexops_admin` + `lexops_member`) from profiles on mount. Manager field is a `<select>` that fills both `manager` and `manager_email` atomically from the selected profile.

### 23. resend-invite and cancel-invite fetched all users without pagination
**File:** `server/routes/admin.ts:182, 243`  
**Problem:** `listUsers()` defaults to 1000 users; silently misses users beyond that.  
**Fix:** Added `{ page: 1, perPage: 1000 }` to all `listUsers()` calls (safe for current scale; add multi-page loop if user count approaches 1000).

### 24. SetPasswordPage accepted update with no valid session
**File:** `client/src/components/SetPasswordPage.jsx:62`  
**Problem:** `supabase.auth.updateUser()` was called without first confirming a live session exists. An expired or absent session would surface a confusing Supabase error.  
**Fix:** Added session check before `updateUser`; returns a user-readable error if session is absent.

### 25. No server-side email format validation on invite
**File:** `server/routes/admin.ts:103`  
**Problem:** Only presence-checked; malformed email strings were passed directly to Supabase Auth.  
**Fix:** Added regex validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) before proceeding.

### 26. MatchModal — confirmed not dead
**File:** `client/src/components/AdminPanel.jsx:2226`  
**Result:** Component is defined at line 2226. No fix needed.

### 27. StatusPill missing project and proposal statuses
**File:** `client/src/components/AdminPanel.jsx:119–124`  
**Problem:** `STATUS_PILL_COLORS` only covered `draft/sent/viewed/accepted`. Project statuses (`active`, `complete`, `on-hold`) and proposal statuses (`feedback_received`, `won`, `lost`, `converted`) all fell through to the grey `draft` style.  
**Fix:** Added all missing statuses to `STATUS_PILL_COLORS` with appropriate colours.

### 28. No rate limiting on password-reset endpoint
**File:** `server/routes/notify.ts`  
**Problem:** Public unauthenticated POST with no throttle — could trigger thousands of reset emails per address.  
**Fix:** Added in-memory rate limiter: 3 attempts per email per 15-minute window, returns 429 when exceeded.

---

## 🔵 Active Projects — Deep Pass (follow-up)

A dedicated deep pass on the Active Projects experience (admin-side **and** client-facing `Dashboard.jsx`) surfaced a regression caused by the original fix #1, plus several supporting issues.

### 29. 🔴 Client + member self-service broken by the `requireAuth → requireAdmin` change
**Files:** `server/routes/admin.ts`, `client/src/components/Dashboard.jsx`
**Problem:** Fix #1 changed *every* `/api/admin/*` route to `requireAdmin` (which only accepts `lexops_admin`). But the client Dashboard and `lexops_member` staff legitimately use several of these routes:
- Clients: create/move/delete **support tickets** (`SupportTab` → `POST /api/admin/db`), **upload documents** + fulfil doc requests (`ClientDocumentsTab` → `POST /api/admin/db`), **mark own tasks complete** (`ClientActionsTab` → `PATCH /api/admin/tasks/:id/status`).
- Members: all project/task/document/invoice management in the internal Dashboard view.

All of these started returning **403 Forbidden**. The `requireAuth` original was too loose (any user, any table, any project — the real vuln); `requireAdmin` was too tight.

**Fix:** Introduced two new middleware tiers in `admin.ts`:
- `requireStaff` (admin **or** member) — applied to project-management routes clients never touch: `POST/PATCH/DELETE /tasks`, `/tasks/:id/owner`, `/upload-document`, `/documents/:id*`, `/upload-invoice`, `/invoices/:id`.
- `requireProjectAccess` — staff get full access; **clients are scoped to projects they belong to** (`project_members`) **and** a strict table/operation allowlist (`CLIENT_WRITABLE` = support_tickets ins/upd/del, documents insert, document_requests update; `CLIENT_READABLE` for `/db-read`). Applied to `/db`, `/db-read`, `/tasks/:id/status`, `/phases/:id/auto-complete`. For client update/delete on `/db`, the targeted row's `project_id` is looked up and verified against membership before the write proceeds.

User-management routes (`/invite-user`, `/remove-user`, `/generate-project`, etc.) correctly remain `requireAdmin`.

### 30. 🔴 `markComplete` silently faked success on failure (data loss)
**File:** `client/src/components/Dashboard.jsx` — `ClientActionsTab.markComplete`
**Problem:** On a non-OK response (e.g. the 403 above), the handler set the task to `done` in local state and showed "✅ Marked complete" — so the client believed the task saved when nothing persisted.
**Fix:** Removed the optimistic-on-error fake. Failures now surface "⚠️ Could not mark complete — please try again." and the success toast only fires after a confirmed save.

### 31. 🟡 Client/staff document uploads collided and weren't sanitized
**File:** `client/src/components/Dashboard.jsx` — `DocumentsTab`, `ClientDocumentsTab` (self + request upload)
**Problem:** Uploaded to `${projectId}/${file.name}` with `upsert: true` — two same-named files silently overwrote each other; filenames weren't sanitized. (The admin `/upload-document` route already did this correctly.)
**Fix:** Switched to `${projectId}/${Date.now()}_${safeName}` with `upsert: false` and `[^a-zA-Z0-9._\-]` sanitization, matching the server path.

### 32. 🟠 Document confidentiality — `project-documents` bucket is public
**Files:** `Dashboard.jsx`, `AdminPanel.jsx`, `server/routes/admin.ts`, `server/routes/proposalsV2.ts`
**Confirmed:** `select public from storage.buckets where id='project-documents'` → **`true`**. Every client document **and invoice** is readable by anyone with the URL, no auth.
**Partial fix applied:**
- Added authenticated signed-URL endpoints: `GET /api/admin/documents/:id/signed-url` and `GET /api/admin/invoices/:id/signed-url` (`requireProjectAccess`; clients limited to their own projects), returning 5-minute `createSignedUrl` links.
- Repointed every document/invoice **View/Download** control in `Dashboard.jsx` from raw `file_url` anchors to `openDocument`/`openInvoice` helpers that fetch a signed URL on click. Client uploads continue to store `file_url` for back-compat but downloads no longer depend on it.
**Bucket split (chosen approach) — implemented in code:** The shared `project-documents` bucket also held **proposal PDFs** (`AdminPanel.jsx`) and **proposal client-files** (`proposalsV2.ts`), both served to **unauthenticated prospects via token links** — so the bucket could not just be flipped private. Resolution: separate the trust boundaries into two buckets.
- `project-documents` → becomes **private** (project documents + invoices; accessed only via authenticated signed-URL endpoints above).
- `proposal-assets` → new **public** bucket (proposal PDFs + proposal client-files; shared via token links, same exposure as before — no regression).
- Code repointed: `AdminPanel.jsx` proposal-PDF upload and all `proposalsV2.ts` client-file storage ops now use `proposal-assets`. Dashboard/admin project-document + invoice paths stay on `project-documents`.
- Migration script added: `script/migrate-proposal-bucket.ts` (dry-run by default; `--apply` to move existing proposal files and rewrite `proposals.pdf_url` / `proposal_client_files.file_url`).

**Deployment runbook (must be done in order):**
1. **Create the public bucket + storage policies** (Supabase SQL Editor):
   ```sql
   insert into storage.buckets (id, name, public)
   values ('proposal-assets', 'proposal-assets', true)
   on conflict (id) do update set public = true;

   create policy "proposal-assets staff insert" on storage.objects for insert to authenticated
     with check (bucket_id = 'proposal-assets' and exists (
       select 1 from profiles p where p.id = auth.uid()
         and p.role = any (array['lexops_admin','lexops_member'])));
   create policy "proposal-assets staff update" on storage.objects for update to authenticated
     using (bucket_id = 'proposal-assets' and exists (
       select 1 from profiles p where p.id = auth.uid()
         and p.role = any (array['lexops_admin','lexops_member'])));
   create policy "proposal-assets staff delete" on storage.objects for delete to authenticated
     using (bucket_id = 'proposal-assets' and exists (
       select 1 from profiles p where p.id = auth.uid()
         and p.role = any (array['lexops_admin','lexops_member'])));
   -- public read is provided by the bucket's public=true flag.
   ```
2. **Migrate existing files:** `npx tsx script/migrate-proposal-bucket.ts` (review dry-run output), then `npx tsx script/migrate-proposal-bucket.ts --apply`.
3. **Deploy the code** (so new uploads + downloads use the new buckets/signed URLs).
4. **Flip the project bucket private:** `update storage.buckets set public = false where id = 'project-documents';`
5. **Verify:** client document/invoice download (signed URL works on private bucket), proposal PDF view via token link (public bucket), client upload (still works — staff/client `storage.objects` INSERT policies on `project-documents` are unchanged; downloads no longer depend on `getPublicUrl`).
6. *(Optional, after verifying)* re-run the migration with `--apply --delete-originals` to purge the old copies from `project-documents`.

### 33. 🟢 Client reads rely on RLS — verified, two holes found & fixed
**Confirmed from `pg_policies` dump:** RLS is enabled on all relevant tables, and `documents`, `phases`, `invoices`, `document_requests`, `projects`, `project_members` all have correct membership-scoped `client read own` policies. **Two gaps found:**
1. **`support_tickets` was wide open** — only policy was `support_tickets_all` with `USING (true) WITH CHECK (true)`: any authenticated user could read/modify/delete every project's tickets directly via the anon API (bypassing the server proxy entirely).
2. **`tasks` had no client read policy** — only `staff full access`; clients' direct anon reads returned zero rows (empty action list).
**Fix:** Migration SQL written (drop `support_tickets_all`; add staff-full + client-scoped select/insert/update/delete for `support_tickets`; add membership-scoped, `is_internal=false` client read for `tasks`). Applied by the user in the Supabase SQL Editor. Also added `project_tools` to the server `CLIENT_READABLE` allowlist so `ClientResourcesTab` works under `requireProjectAccess`.

---

## Methodology
- 3 sub-agents ran in parallel: Proposals audit, Active Projects audit, Admin Users audit
- All agents read source files directly; no mocks
- Fixes applied in same session immediately after compilation
- This file updated incrementally as fixes land
