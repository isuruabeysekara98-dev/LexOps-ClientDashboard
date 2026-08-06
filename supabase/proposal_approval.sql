-- ---------------------------------------------------------------------------
-- Close the proposal loop: let a client approve.
-- ---------------------------------------------------------------------------
-- Paste into the Supabase SQL editor. Idempotent — safe to run more than once.
--
-- The loop the product needs is:
--
--   draft ──send──▶ sent ──client submits──▶ feedback_shared
--                     ▲                            │
--                     └────── admin re-sends ──────┘  (as `revised`)
--
-- and it ends exactly three ways: the admin marks `won` or `lost`, or the
-- client clicks approve. The first two states already existed; the third did
-- not, and `proposals_state_check` would have rejected the write outright, so
-- POST /p/:token/approve fails against a database without this script.
--
-- `approved` is deliberately NOT the same as `won`. Approved is the client's
-- signal — they are happy with what they read. Won is the firm's commercial
-- record, and only an admin sets it. Collapsing the two would mean a client
-- click silently books revenue.
-- ---------------------------------------------------------------------------

alter table public.proposals drop constraint if exists proposals_state_check;
alter table public.proposals add constraint proposals_state_check check (
  state in ('draft','sent','feedback_shared','revised','approved','won','lost')
);

-- When the client approved, so the admin sees how long a proposal sat before
-- it closed. Null for every state other than `approved`.
alter table public.proposals
  add column if not exists approved_at timestamptz;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Expect the constraint to list all seven states, and approved_at to exist:
--
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'proposals_state_check';
--
--   select column_name from information_schema.columns
--    where table_name = 'proposals' and column_name = 'approved_at';
-- ---------------------------------------------------------------------------
