# Architecture

LexOps Client Service Portal — a full-stack app for running legal-automation
engagements end-to-end: from drafting an interactive proposal, through client
review, to managing the delivery of the resulting project.

## 1. High-level system

Three pieces, served as a single deployable unit:

| Layer | Tech | Responsibility |
|-------|------|----------------|
| Frontend | React 18 + Vite (TypeScript + JSX, Tailwind, Radix UI) | SPA served to the browser. Lives under `client/`. |
| Backend | Express 5 (TypeScript, run with `tsx`) | REST API under `/api/*`, AI calls, email, file/storage brokering. Lives under `server/`. |
| Data / Auth / Storage | Supabase (Postgres + Auth + Storage) | Single source of truth. Auth sessions (JWT), Postgres with Row-Level Security (RLS), the `project-documents` storage bucket. |
| Email | Resend | All transactional email (`server/email.ts`). |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) | PDF/transcript import, workflow demos, dynamic intake fields, module matching, project-structure generation. |

### How they are served together

`server/index.ts` boots one Express app on a single port (`PORT`, default
`5000` — the only non-firewalled port on the host):

1. JSON body parsing (limit raised to **50 MB** so PDF uploads fit), URL-encoded
   parsing, and a request logger that prints every `/api/*` call.
2. `registerRoutes()` (`server/routes.ts`) mounts the API routers under `/api`.
3. A trailing error handler.
4. **Static vs Vite:**
   - In **production** (`NODE_ENV=production`), `serveStatic(app)` serves the
     pre-built client from `dist/`.
   - In **development**, `setupVite()` attaches Vite as Express middleware
     (HMR for the client). The Vite catch-all is mounted *after* the API routes
     so it never intercepts `/api/*`.

This means the same origin serves both the SPA and the API — the frontend calls
the API with relative paths (`/api/...`), no CORS needed.

> Cross-platform note: `reusePort` is only set off-Windows (`process.platform !==
> "win32"`) because Windows throws `ENOTSUP`. The dev script uses `cross-env` to
> set `NODE_ENV` portably.

## 2. Frontend routing (`client/src/App.tsx`)

There is **no router library in use for app navigation** (wouter is a
dependency but the app uses a hand-rolled `history.pushState` router). `App.tsx`
decides what to render in three stages.

### a) Public routes (checked before any auth hook)

Evaluated from `window.location` at the top of `App()`, completely outside the
auth flow:

| Condition | Renders |
|-----------|---------|
| URL hash contains `type=invite` or `type=recovery` | `SetPasswordPage` (account setup / password reset) |
| Path matches `/proposal/:token` | `ProposalPage` — the public, token-gated client proposal view |
| anything else | `AuthenticatedApp` |

### b) Authenticated app (`AuthenticatedApp`)

Manages the Supabase session and the user profile:

- On mount it calls `supabase.auth.getSession()`, then `fetchUserProfile()`.
- The profile is cached in `sessionStorage` (`lx_profile_v1`) so a page reload
  renders instantly with **no spinner** — the full-screen spinner only appears on
  a genuine first-ever load (no cache). A 5-second safety timeout prevents an
  infinite spinner.
- `onAuthStateChange` updates state on real re-auth events but **silently
  ignores** `TOKEN_REFRESHED` and `INITIAL_SESSION` (which fire on every
  tab-return) so a token renewal never flashes a spinner.
- `fetchUserProfile()` reads `profiles` by user id. If no profile row exists it
  signs the user out and surfaces a "contact us" error. For `client` users it
  also loads `project_members` and attaches `allowedProjectIds` to the profile.

### c) Role-based gating

After a profile loads:

| Role | Renders |
|------|---------|
| `lexops_admin`, `lexops_member` (`ADMIN_ROLES`) | `AdminRouter` — full internal app |
| `client` | `Dashboard` (client view only) |
| no session | `LoginPage` |

`AdminRouter` is the internal `pushState` router. It keeps the three top-level
pages (`Dashboard`, `LandingPage`, `ProposalsListPage`) **mounted at all times**
(toggled via `display:none`) so navigating between them never remounts/reloads;
dynamic proposal pages mount on demand. Routes:

| Path | Page |
|------|------|
| `/` (landing) | `LandingPage` |
| `/active-projects` | `Dashboard` (internal) |
| `/admin/proposals` | `ProposalsListPage` |
| `/admin/proposals/new` | `ProposalCreatePage` (create) |
| `/admin/proposals/:id/edit` | `ProposalCreatePage` (edit) |
| `/admin/proposals/:id` | `ProposalDetailPage` |
| `/admin/proposals/:id/preview` | `ProposalPreviewPage` |

`popstate` is wired so browser back/forward works.

## 3. The two product domains

### Domain A — Proposals v2 (sales / onboarding)

An interactive, AI-assisted proposal that a prospect reviews via a public link.

Lifecycle (`proposals.status`):

```
draft ──send──▶ sent ──client opens──▶ viewed ──client submits──▶ feedback_received
                                                                        │
                                              admin decides ────────────┤
                                                                        ▼
                                                          won ──convert──▶ converted
                                                          lost
```

- **Create** (`ProposalCreatePage`): build manually, or import from a **PDF** or
  a **meeting transcript** — Claude extracts pain points, objectives, and a first
  draft of workflows + stages. Each proposal has one or more **workflows**, each
  with ordered **stages** (and optional document requirements). A per-workflow
  `show_try_matter` toggle enables the interactive demo wizard.
- **Send** (`/:id/send`): emails the client a tokenised link
  (`/proposal/:token`); status → `sent`.
- **Client review** (`ProposalPage`, public): the client sees a horizontal stage
  timeline per workflow. For `show_try_matter` workflows they get a **Try Your
  Case** wizard — Claude generates dynamic intake fields, the client runs the
  workflow against Claude (capped at 10 runs), reviews the output, leaves
  feedback, and can upload "expected output" / submitted documents
  (`proposal_client_files`). Otherwise they see simple "expected / submit
  documents" tabs. On full completion the client submits final review →
  `feedback_received`, and LexOps is emailed.
- **Won → convert** (`ProposalDetailPage` → `/:id/convert`): admin marks the
  proposal **Won**, then converts it into an **active project**. Conversion is
  idempotent and pre-populates the project: each **workflow → phase**, each
  **stage → task** (owner `lexops`). Proposal status → `converted` and
  `project_id` is linked.

### Domain B — Active Projects dashboard (`Dashboard.jsx`)

The delivery workspace once a project exists. It has an **internal view** (LexOps
staff) and a **client view** (the customer), toggled by staff and forced to
`client` for client users.

Tabs (`overview`, `actions`, `resources`, `invoices`, `support`):

| Tab | Internal view | Client view ("Your Actions" etc.) |
|-----|---------------|-----------------------------------|
| Overview | Project stats, phases/milestones, manager editor, setup drawer | Client-facing summary + progress |
| Actions | All tasks (internal + client), Kanban/list, assignee dropdown | Only client-owned, non-internal tasks |
| Resources | Documents + tools, full edit | Read-oriented documents + tools |
| Invoices | Upload/manage invoices | Read own project invoices |
| Support | All tickets | Raise/read own tickets (emails the PM) |

Visibility is driven by `tasks.is_internal` / `tasks.owner` and by the
`isClientView` flag. The `AdminPanel` (clients/team/projects management, invites)
and a **Module Library** (reusable automation modules, AI brief matcher, optional
n8n deployment) round out the internal side.

## 4. Auth & access model

- **Sessions:** Supabase Auth issues a JWT. The browser holds it (autoRefresh,
  persistSession). For API calls the frontend attaches it as
  `Authorization: Bearer <access_token>` (see `adminFetch`).
- **Roles** live in `profiles.role`: `lexops_admin`, `lexops_member`, `client`.
  A DB trigger (`handle_new_user`) auto-creates a minimal `client` profile on
  signup; admin invites upsert the intended role.
- **Project scoping for clients:** `project_members (project_id, user_id, role)`
  ties a client to the projects they may see. The frontend reads it into
  `allowedProjectIds`; Postgres RLS policies enforce "client read own" using it.
- **Public proposal links:** a proposal's `token` (a UUID) *is* the credential —
  `/proposal/:token` and the `by-token` / demo / accept endpoints require no
  login; the server validates the token against the `proposals` row.
- **RLS:** enabled across tables (`supabase/rbac.sql`). Staff get broad access;
  clients get own-project access. **However**, much of the app's write/read
  traffic is brokered server-side with the **service-role key**, which *bypasses
  RLS* — see `BACKEND-INTERACTION.md` and the security note below.

> ⚠️ **Security note.** The generic DB proxy (`/api/admin/db`, `/db-read`) runs on
> the service-role key but is gated only by `requireAuth` (any logged-in user),
> not by role or project ownership. A logged-in client can therefore read/write
> across tenants and escalate their own role. This is a documented **critical**
> finding (`SECURITY-AUDIT.md`, 2026-06-26) and is **not yet fixed**.

## 5. Repository layout (relevant paths)

```
client/src/
  App.tsx                     custom router + auth flow
  lib/supabase.js             browser Supabase client (anon key)
  lib/adminFetch.js           Bearer-token API helper + dbWrite()
  components/
    Dashboard.jsx             Active Projects (internal + client views)
    ProposalsListPage.jsx     proposal list (+ delete)
    ProposalCreatePage.jsx    create/edit, PDF/transcript import
    ProposalDetailPage.jsx    admin detail, won/convert
    ProposalPage.jsx          public client proposal view
    LandingPage / LoginPage / SetPasswordPage / AdminPanel ...
server/
  index.ts                    app bootstrap (Express + Vite/static)
  routes.ts                   mounts routers under /api
  routes/admin.ts             admin + generic db / db-read proxy
  routes/proposalsV2.ts       proposals v2 API
  routes/proposal.ts          legacy proposal accept/view/send-link
  routes/modules.ts           module library
  routes/notify.ts            email notification triggers
  email.ts                    Resend templates
supabase/*.sql                schema + RLS migrations
```
