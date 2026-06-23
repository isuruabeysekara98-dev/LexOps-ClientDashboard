-- Run once in Supabase → SQL Editor → New query → Run
-- Adds project_tools table and phase_name column to documents

-- 1. Phase name on documents (enables resource tab phase filtering)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS phase_name text;

-- 2. Project tools table (for the Resources tab "Tools" column)
CREATE TABLE IF NOT EXISTS project_tools (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  purpose      text,
  url          text,
  logo_emoji   text DEFAULT '🔧',
  sort_order   int  DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE project_tools ENABLE ROW LEVEL SECURITY;

-- Admins & members can manage tools
CREATE POLICY "lexops_manage_tools" ON project_tools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
            AND role IN ('lexops_admin','lexops_member'))
  );

-- Clients can read tools for their own projects
CREATE POLICY "clients_read_tools" ON project_tools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      JOIN projects p ON p.id = project_id
      WHERE pr.id = auth.uid()
        AND (pr.role IN ('lexops_admin','lexops_member')
             OR p.client_id = (SELECT client_id FROM profiles WHERE id = auth.uid()))
    )
  );
