---
name: Backend write proxy architecture
description: All INSERT/UPDATE/DELETE/UPSERT go through POST /api/admin/db using service-role key to bypass RLS silently blocking anon-key writes.
---

## Rule
Never call `supabase.from(...).insert/update/delete/upsert()` directly from the frontend (Dashboard.jsx, AdminPanel.jsx, FlowchartTab.jsx, or any new component). Always use `dbWrite(table, operation, data, match)`.

## Why
Supabase RLS policies silently block INSERT/UPDATE/DELETE from the anon key (used on the frontend). Operations appear to succeed but no row is affected. The Express backend uses the service-role key via `adminSupabase` which bypasses RLS.

## How to apply
- `dbWrite` helper lives in `client/src/lib/adminFetch.js` — import it from there in any component.
- Dashboard.jsx defines `dbWrite` inline at module scope (after `adminFetch` around line 441) — no import needed there.
- AdminPanel.jsx and FlowchartTab.jsx import: `import { adminFetch, dbWrite } from "@/lib/adminFetch.js";`
- Backend endpoint: `POST /api/admin/db` in `server/routes/admin.ts`. ALLOWED_TABLES whitelist must include any new table before writes work.
- For inserts that need the returned row (e.g. to read `row.id` or `row.token`): `const result = await dbWrite(...)` then `result.data`.
- Storage uploads (supabase.storage) are still done directly from the frontend — only DB writes are proxied.
- Upsert match argument: pass an object whose keys are the conflict columns, e.g. `{ project_id: val, user_id: val }` → backend uses `Object.keys(match).join(",")` as `onConflict`.
