---
name: Tasks table schema constraints
description: Known missing columns in the tasks table that cause 500 errors if included in writes
---

## Rule
Do NOT include `owner` in task INSERT or PATCH payloads — the column does not exist in the tasks table.

## Why
The `owner` field was in early backend route code and in some editForm initializations, but the Supabase `tasks` table never had this column. Any update/insert that includes `owner` causes Supabase to throw: `"Could not find the 'owner' column of 'tasks' in the schema cache"` → 500.

## How to apply
- `PATCH /api/admin/tasks/:id` allowed list must NOT include `"owner"`
- `POST /api/admin/tasks` must NOT destructure or insert `owner`
- Frontend `startEdit` for tasks should NOT include `owner` in editForm state
- If `owner` tracking is ever needed, add the column to the DB first via ALTER TABLE
