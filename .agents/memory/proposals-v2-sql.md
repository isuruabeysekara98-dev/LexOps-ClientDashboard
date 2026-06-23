---
name: Proposals v2 SQL migrations
description: SQL migrations needed for the v2 proposals feature, including show_try_matter column.
---

## show_try_matter column
```sql
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS show_try_matter boolean DEFAULT false;
```
- Added to `supabase_workflow_review_setup.sql` at the bottom as a separate migration block.
- The server save is resilient: if the column doesn't exist, it retries the UPDATE/INSERT without `show_try_matter`.

**Why:** Supabase will error on UPDATE/INSERT if a column doesn't exist; resilient fallback prevents breaking existing workflow saves.

## Running the migration
Go to Supabase → SQL Editor → New query → paste the ALTER TABLE line → Run.
The ProposalCreatePage toggle tooltip reminds admins of this requirement.
