-- ===========================================================================
-- Proposal status lifecycle — fix the status CHECK constraint
-- ===========================================================================
-- The existing `proposals_status_check` constraint only permitted
--   ('draft','sent','viewed','feedback_received','lost')
-- which silently rejected status writes for `won`, `converted`, and the new
-- `changes_requested` / `accepted` states. Supabase's PostgREST returns the
-- error on .update(), but the server code did not surface it, so the status
-- bubble appeared "stuck" (e.g. stayed "sent" after a client requested changes)
-- and the won -> convert link never persisted.
--
-- Run this ONCE in the Supabase dashboard -> SQL editor.
-- Safe to re-run (idempotent).
-- ===========================================================================

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

ALTER TABLE proposals ADD CONSTRAINT proposals_status_check CHECK (
  status IN (
    -- active lifecycle: draft -> sent -> changes_requested -> updated -> sent ... -> won/lost
    'draft',
    'sent',
    'changes_requested',
    'updated',
    'accepted',
    'won',
    'lost',
    'converted',
    -- legacy values kept so historical rows stay valid
    'viewed',
    'feedback_received',
    'in_review',
    'submitted'
  )
);
