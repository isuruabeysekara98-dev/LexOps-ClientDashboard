-- Module Library tables
-- Run this migration in Supabase SQL editor

CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  practice_areas text[] DEFAULT '{}',
  firm_sizes text[] DEFAULT '{}',
  tools text[] DEFAULT '{}',
  workflow_stage text,
  runtime text DEFAULT 'n8n',
  avg_hours numeric,
  times_used integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE module_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  title text NOT NULL,
  description text,
  tool text,
  notes text
);

CREATE TABLE module_workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  workflow_json text,
  variables jsonb DEFAULT '[]',
  n8n_workflow_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE module_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  hours_saved numeric,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  notes text,
  recorded_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES profiles(id)
);

CREATE TABLE module_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id),
  project_id uuid REFERENCES projects(id),
  status text DEFAULT 'pending',
  connector_config jsonb DEFAULT '{}',
  n8n_workflow_id text,
  deployed_at timestamptz,
  deployed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- RLS policies (unique names per table)
CREATE POLICY "staff full access modules" ON modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lexops_admin','lexops_member')));
CREATE POLICY "staff full access module_steps" ON module_steps FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lexops_admin','lexops_member')));
CREATE POLICY "staff full access module_workflow_definitions" ON module_workflow_definitions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lexops_admin','lexops_member')));
CREATE POLICY "staff full access module_outcomes" ON module_outcomes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lexops_admin','lexops_member')));
CREATE POLICY "staff full access module_deployments" ON module_deployments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lexops_admin','lexops_member')));

-- Enable RLS on all 5 tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_deployments ENABLE ROW LEVEL SECURITY;
