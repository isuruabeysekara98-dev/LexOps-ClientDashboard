-- =============================================================================
-- LexOps v2 Proposals — Workflow Review Tables
-- Run once in Supabase → SQL Editor → New query → Run
-- Safe to re-run (all statements use IF NOT EXISTS / OR REPLACE)
-- =============================================================================

-- 1. workflow_runs: stores each Claude demo run result per workflow
CREATE TABLE IF NOT EXISTS workflow_runs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  proposal_id   uuid        NOT NULL,
  input_text    text,
  pasted_text   text,
  file_content  text,
  output_json   jsonb       NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_id_idx ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_runs_proposal_id_idx ON workflow_runs(proposal_id);

-- 2. workflow_submissions: tracks per-workflow review state (feedback + completion)
CREATE TABLE IF NOT EXISTS workflow_submissions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  proposal_id   uuid        NOT NULL,
  feedback_text text,
  final_run_id  uuid,
  proceeded     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id)
);

CREATE INDEX IF NOT EXISTS workflow_submissions_workflow_id_idx ON workflow_submissions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_submissions_proposal_id_idx ON workflow_submissions(proposal_id);

-- 3. Add missing columns to proposals table if not already present
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS submitted_at    timestamptz;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS change_request_note text;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_note     text;

-- 4. RLS policies — allow service role full access (server uses service role key)
--    Public client reads are token-gated at the app layer; no extra RLS needed
--    if you want fine-grained RLS, add policies here matching your existing patterns.

-- Enable RLS on new tables (optional but recommended)
ALTER TABLE workflow_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_submissions ENABLE ROW LEVEL SECURITY;

-- Service role bypass (already implicit for service role key)
-- These policies let authenticated users who own the proposal access rows:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workflow_runs' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY service_all ON workflow_runs FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workflow_submissions' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY service_all ON workflow_submissions FOR ALL USING (true);
  END IF;
END $$;

-- =============================================================================
-- Done. Tables created:
--   • workflow_runs
--   • workflow_submissions
-- Columns added to proposals:
--   • submitted_at, change_request_note, signer_note
-- =============================================================================


-- =============================================================================
-- Migration: Add show_try_matter column to workflows (run this separately if
-- you already ran the initial setup above)
-- =============================================================================
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS show_try_matter boolean DEFAULT false;

-- =============================================================================
-- Migration: workflow_demo_templates — saved example matters for demo reuse
-- Run once in Supabase → SQL Editor → New query → Run
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflow_demo_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  form_values jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_demo_templates_workflow_id_idx
  ON workflow_demo_templates(workflow_id);

ALTER TABLE workflow_demo_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workflow_demo_templates' AND policyname = 'service_all'
  ) THEN
    CREATE POLICY service_all ON workflow_demo_templates FOR ALL USING (true);
  END IF;
END $$;
