-- LexOps Flowchart feature — one-time Supabase setup
-- Run this once in Supabase Studio → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS flowchart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Step',
  status TEXT NOT NULL DEFAULT 'pending',           -- pending | in_progress | done
  description TEXT DEFAULT '',
  estimated_date DATE,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flowchart_arrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  source_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flowchart_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  author_name TEXT,
  author_initial TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flowchart_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  file_name TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flowchart_nodes_project ON flowchart_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_flowchart_arrows_project ON flowchart_arrows(project_id);
CREATE INDEX IF NOT EXISTS idx_flowchart_comments_node ON flowchart_comments(node_id);
CREATE INDEX IF NOT EXISTS idx_flowchart_attachments_node ON flowchart_attachments(node_id);

-- Permissive RLS (matches the existing app's permission model — adjust later if you tighten access)
ALTER TABLE flowchart_nodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_arrows      ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth all" ON flowchart_nodes;
DROP POLICY IF EXISTS "auth all" ON flowchart_arrows;
DROP POLICY IF EXISTS "auth all" ON flowchart_comments;
DROP POLICY IF EXISTS "auth all" ON flowchart_attachments;

CREATE POLICY "auth all" ON flowchart_nodes       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_arrows      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_comments    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime so client view auto-refreshes when admin edits
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE flowchart_nodes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE flowchart_arrows;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE flowchart_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
