-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null check (role in ('lexops_admin', 'lexops_member', 'client')),
  created_at  timestamptz not null default now()
);

-- Automatically create a minimal profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row-level security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- LexOps staff can read all profiles
create policy "profiles: staff read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Users can update their own profile (limited fields like has_seen_welcome)
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

-- Only admins can insert / update / delete profiles (full access)
create policy "profiles: admin write"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lexops_admin'
    )
  );


-- ============================================================
-- project_members
-- ============================================================
create table if not exists public.project_members (
  id          bigserial primary key,
  project_id  uuid not null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('owner', 'member', 'viewer')),
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

-- Users can see memberships that include them
create policy "project_members: own read"
  on public.project_members for select
  using (auth.uid() = user_id);

-- LexOps staff can see all memberships
create policy "project_members: staff read all"
  on public.project_members for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Only admins can manage memberships
create policy "project_members: admin write"
  on public.project_members for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lexops_admin'
    )
  );


-- ============================================================
-- projects
-- ============================================================
alter table public.projects enable row level security;

-- LexOps staff can read all projects
create policy "projects: staff read all"
  on public.projects for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Clients can read projects they are assigned to
create policy "projects: client read own"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.user_id = auth.uid()
        and pm.project_id::text = projects.id::text
    )
  );

-- Only admins can insert / update / delete projects
create policy "projects: admin write"
  on public.projects for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lexops_admin'
    )
  );


-- ============================================================
-- invoices
-- ============================================================
-- Add file_url column if it does not already exist
alter table public.invoices add column if not exists file_url text;

alter table public.invoices enable row level security;

-- LexOps staff can read all invoices
create policy "invoices: staff read all"
  on public.invoices for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Clients can read invoices for their assigned projects
create policy "invoices: client read own"
  on public.invoices for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.user_id = auth.uid()
        and pm.project_id = invoices.project_id
    )
  );

-- Only admins can insert / update / delete invoices
create policy "invoices: admin write"
  on public.invoices for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lexops_admin'
    )
  );


-- ============================================================
-- invite_log
-- ============================================================
create table if not exists public.invite_log (
  id          serial primary key,
  email       text not null,
  full_name   text,
  role        text not null,
  invited_by  uuid references auth.users on delete set null,
  invited_at  timestamptz not null default now(),
  status      text not null default 'pending'
);

alter table public.invite_log enable row level security;

-- Only admins can read/write invite_log
create policy "invite_log: admin full access"
  on public.invite_log for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'lexops_admin'
    )
  );


-- ============================================================
-- project_setup_flags
-- ============================================================
create table if not exists public.project_setup_flags (
  id          bigserial primary key,
  project_id  uuid not null,
  proposal_id uuid references proposals(id),
  question    text not null,
  answer      text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.project_setup_flags enable row level security;

create policy "project_setup_flags: staff full access"
  on public.project_setup_flags for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );


-- ============================================================
-- Schema additions for client experience redesign
-- ============================================================

-- Add has_seen_welcome to profiles
alter table public.profiles add column if not exists has_seen_welcome boolean not null default false;

-- Add client_summary to projects
alter table public.projects add column if not exists client_summary text;

-- Add is_internal and is_deliverable to tasks
alter table public.tasks add column if not exists is_internal boolean not null default true;
alter table public.tasks add column if not exists is_deliverable boolean not null default false;


-- ============================================================
-- document_requests
-- ============================================================
create table if not exists public.document_requests (
  id              bigserial primary key,
  project_id      uuid not null,
  title           text not null,
  description     text,
  requested_at    timestamptz not null default now(),
  fulfilled_at    timestamptz,
  fulfilled_document_id bigint references public.documents(id)
);

alter table public.document_requests enable row level security;

-- Staff can do everything with document requests
create policy "document_requests: staff full access"
  on public.document_requests for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('lexops_admin', 'lexops_member')
    )
  );

-- Clients can read document requests for their projects
create policy "document_requests: client read own"
  on public.document_requests for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.user_id = auth.uid()
        and pm.project_id = document_requests.project_id
    )
  );

-- Clients can update document requests (to mark fulfilled)
create policy "document_requests: client update own"
  on public.document_requests for update
  using (
    exists (
      select 1 from public.project_members pm
      where pm.user_id = auth.uid()
        and pm.project_id = document_requests.project_id
    )
  );
