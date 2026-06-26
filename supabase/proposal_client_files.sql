-- Client-uploaded documents captured as part of a proposal.
-- Files live in the existing "project-documents" storage bucket; this table
-- records the metadata so LexOps admins can list and download what the client
-- sent back (expected outputs per stage, and general submissions).

create table if not exists proposal_client_files (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references proposals(id) on delete cascade,
  workflow_id  uuid references workflows(id) on delete set null,
  stage_index  int,                                   -- null for non-stage submissions
  kind         text not null default 'expected',      -- 'expected' | 'submitted'
  file_name    text not null,
  storage_path text not null,
  file_url     text,
  size_bytes   bigint,
  content_type text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_proposal_client_files_proposal on proposal_client_files(proposal_id);
create index if not exists idx_proposal_client_files_workflow on proposal_client_files(workflow_id);

-- All access is brokered by the server using the service-role key (token-validated
-- for clients, auth-validated for admins), so RLS stays on with no public policies.
alter table proposal_client_files enable row level security;
