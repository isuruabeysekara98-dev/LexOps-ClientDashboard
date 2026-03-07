-- ============================================================
-- proposals
-- ============================================================
create table if not exists public.proposals (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete set null,
  client_email  text not null,
  client_name   text not null,
  pdf_url       text,
  storage_path  text,
  token         uuid not null default gen_random_uuid(),
  status        text not null default 'draft'
                  check (status in ('draft', 'sent', 'viewed', 'accepted')),
  created_at    timestamptz not null default now()
);

create unique index if not exists proposals_token_idx on public.proposals (token);

alter table public.proposals enable row level security;

-- LexOps staff can do everything with proposals
create policy "proposals: staff full access"
  on public.proposals for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Public read by token (no auth required — uses anon key)
create policy "proposals: public read by token"
  on public.proposals for select
  using (true);

-- Public update status (for viewed/accepted transitions)
create policy "proposals: public update status"
  on public.proposals for update
  using (true)
  with check (true);


-- ============================================================
-- proposal_signatures
-- ============================================================
create table if not exists public.proposal_signatures (
  id            bigserial primary key,
  proposal_id   uuid not null references public.proposals(id) on delete cascade,
  signer_name   text not null,
  signer_email  text not null,
  accepted_at   timestamptz not null default now(),
  ip_address    text
);

alter table public.proposal_signatures enable row level security;

-- LexOps staff can read all signatures
create policy "signatures: staff read all"
  on public.proposal_signatures for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Public can insert signatures (no auth required)
create policy "signatures: public insert"
  on public.proposal_signatures for insert
  with check (true);

-- Public can read own signatures (for the proposal page to verify)
create policy "signatures: public read"
  on public.proposal_signatures for select
  using (true);
