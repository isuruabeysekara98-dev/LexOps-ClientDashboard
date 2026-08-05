-- ===========================================================================
-- The Living Proposal — additive schema (day 1)
-- ===========================================================================
-- Adds the graph, the client's answers, per-recipient access, and the event
-- stream on top of the existing `proposals` table. Nothing here replaces
-- anything: the v1 proposal page and its workflow tables keep working.
--
-- Run ONCE in Supabase -> SQL editor. Safe to re-run (idempotent).
--
-- Pilot simplification (LIVING-PROPOSAL-PLAN.md §5): one live graph per
-- proposal, no versioning. The `version` columns exist and are always 1, so
-- week-2 versioning is an insert rather than a migration.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- proposal_graphs — the map itself
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_graphs (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  version         int  not null default 1,
  preset          text not null default 'pipeline'
                    check (preset in ('pipeline','topology','program')),
  headline        text,                    -- L0 sentence
  headline_metric jsonb,                   -- {unit, amount, basis}
  nodes           jsonb not null default '[]'::jsonb,
  edges           jsonb not null default '[]'::jsonb,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (proposal_id, version)
);

create index if not exists idx_proposal_graphs_proposal
  on public.proposal_graphs(proposal_id);

-- Two filter axes. Same interaction (a chip that filters the map and recomputes
-- the counters), different questions:
--   deliverables — which piece of work is this?  Disjoint subgraphs; a node
--                  belongs to exactly one. Drives the deliverable rail.
--   scenarios    — which path does this case type take? Subsets of one flow;
--                  a node can carry several. Drives the scenario chips (day 3).
-- Kept apart so a proposal with both (Minerva, Succession Plus) doesn't collide.
alter table public.proposal_graphs
  add column if not exists deliverables jsonb not null default '[]'::jsonb;
alter table public.proposal_graphs
  add column if not exists scenarios jsonb not null default '[]'::jsonb;

-- Concept explainers — 2–3 per proposal, NOT one per node.
--
-- Each is a beat script, not a video file: `{ id, anchor, seconds, beats[] }`,
-- where a beat is a line of copy plus an operation against the map that is
-- already on screen (focus a node, trace an edge, highlight a path). Rendered
-- client-side by one shared scene component — no render pipeline, no storage,
-- and it can't drift from the map because it addresses the same node ids.
--
-- Deliberately capped by convention rather than by constraint: LIVING-PROPOSAL-
-- PLAN.md §2b prices an explainer at 20–40 minutes of thought, every proposal,
-- forever. At node level that is tens of hours per client. Two or three, on the
-- concepts carrying the argument.
alter table public.proposal_graphs
  add column if not exists explainers jsonb not null default '[]'::jsonb;


-- ---------------------------------------------------------------------------
-- proposal_inputs — client answers, keyed to node + need so nothing orphans
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_inputs (
  id             uuid primary key default gen_random_uuid(),
  proposal_id    uuid not null references public.proposals(id) on delete cascade,
  graph_version  int  not null default 1,
  node_id        text not null,
  need_id        text not null,
  value          jsonb,                    -- text / longtext / choice / contact / confirm
  file_path      text,                     -- storage path in `proposal-assets`
  file_name      text,
  file_url       text,
  answered_by    text,                     -- recipient email
  answered_at    timestamptz not null default now(),
  unique (proposal_id, graph_version, node_id, need_id)
);

create index if not exists idx_proposal_inputs_proposal
  on public.proposal_inputs(proposal_id);


-- ---------------------------------------------------------------------------
-- proposal_notes — comments, flags, and client-proposed stages
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_notes (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  node_id      text,                       -- null = whole-proposal note
  kind         text not null default 'comment'
                 check (kind in ('comment','flag','proposed_node')),
  body         text not null,
  payload      jsonb,
  author_email text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_proposal_notes_proposal
  on public.proposal_notes(proposal_id);


-- ---------------------------------------------------------------------------
-- proposal_recipients — per-person access. Forwarding is a feature, not a leak.
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_recipients (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  email           text not null,
  name            text,
  token           text unique not null,
  invited_by      text,                    -- null = original recipient
  first_opened_at timestamptz,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_proposal_recipients_proposal
  on public.proposal_recipients(proposal_id);
create index if not exists idx_proposal_recipients_token
  on public.proposal_recipients(token);


-- ---------------------------------------------------------------------------
-- proposal_events — the moat
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_events (
  id           bigserial primary key,
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  recipient_id uuid references public.proposal_recipients(id) on delete set null,
  type         text not null,              -- viewed | node_opened | need_answered | file_uploaded | sent_back | ...
  node_id      text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_proposal_events_proposal_created
  on public.proposal_events(proposal_id, created_at desc);


-- ---------------------------------------------------------------------------
-- Turn state on the existing proposals table
-- ---------------------------------------------------------------------------
-- `status` (existing) stays the coarse admin lifecycle. `state` is the turn
-- engine's own field so the two never fight over one CHECK constraint.
alter table public.proposals add column if not exists state text default 'draft';
alter table public.proposals add column if not exists ball_in_court text default 'lexops';
alter table public.proposals add column if not exists current_version int default 0;
alter table public.proposals add column if not exists last_client_activity_at timestamptz;
alter table public.proposals add column if not exists last_nudged_at timestamptz;

alter table public.proposals drop constraint if exists proposals_state_check;
alter table public.proposals add constraint proposals_state_check check (
  state in ('draft','sent','feedback_shared','revised','won','lost')
);

alter table public.proposals drop constraint if exists proposals_ball_in_court_check;
alter table public.proposals add constraint proposals_ball_in_court_check check (
  ball_in_court in ('lexops','client')
);


-- ---------------------------------------------------------------------------
-- RLS: all access is brokered by the server with the service-role key
-- (token-validated for clients, auth-validated for admins), exactly like
-- proposal_client_files. RLS on, no public policies.
-- ---------------------------------------------------------------------------
alter table public.proposal_graphs     enable row level security;
alter table public.proposal_inputs     enable row level security;
alter table public.proposal_notes      enable row level security;
alter table public.proposal_recipients enable row level security;
alter table public.proposal_events     enable row level security;


-- ---------------------------------------------------------------------------
-- stalled_proposals — three-bucket stall detection, computed on cockpit load.
-- No scheduler in week 1 (LIVING-PROPOSAL-PLAN.md §6b).
-- ---------------------------------------------------------------------------
create or replace view public.stalled_proposals as
select p.id,
       p.client_name,
       p.name                      as proposal_name,
       p.client_email,
       p.state,
       p.ball_in_court,
       p.last_nudged_at,
       r.id                        as recipient_id,
       r.email                     as recipient_email,
       r.first_opened_at,
       count(i.id) filter (where i.value is not null or i.file_path is not null) as answered,
       now() - coalesce(p.last_client_activity_at, p.updated_at, p.created_at)   as idle,
       case
         when r.first_opened_at is null then 'never_opened'
         when count(i.id) filter (where i.value is not null or i.file_path is not null) = 0
              then 'nudge_a'
         else 'nudge_b'
       end as bucket
from public.proposals p
join public.proposal_recipients r
  on r.proposal_id = p.id and r.invited_by is null
left join public.proposal_inputs i
  on i.proposal_id = p.id
where p.state in ('sent','revised')
  and p.ball_in_court = 'client'
group by p.id, p.client_name, p.name, p.client_email, p.state, p.ball_in_court,
         p.last_nudged_at, p.last_client_activity_at, p.updated_at, p.created_at,
         r.id, r.email, r.first_opened_at
having now() - coalesce(p.last_client_activity_at, p.updated_at, p.created_at) >
       case when r.first_opened_at is null then interval '2 days' else interval '5 days' end;
