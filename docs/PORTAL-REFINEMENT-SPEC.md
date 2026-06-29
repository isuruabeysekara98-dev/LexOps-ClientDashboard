# Lex Ops Client Service Portal — Refinement Epic

Status: DRAFT (authored via /gstack-spec, 2026-06-29) · Branch: `main` · Repo: LexOps-ClientDashboard
Source of truth: the React app under `2. Actual code/`. **The `lexops_portal_v2_3.html` mockup is NOT a reference** (user directive).

## Context

The portal is the key interface for the Lex Ops sales + delivery engine. All three target areas
(proposals lifecycle, interactive flowchart + document submission, active projects) are **already
implemented** in substantial React `.jsx` components backed by Express + Supabase. The work is
**refinement**: closing wiring gaps, making the flows seamless end-to-end, and raising the UI to a
premium bar — not building from scratch.

## Verified Current State (2026-06-29)

### Proposals lifecycle — mostly built (backend solid)
Status model (`server/routes/proposalsV2.ts:1574`): `draft → sent → viewed → changes_requested ↔ updated → feedback_received → accepted → won/lost → converted`.
- Create: `POST /` (`proposalsV2.ts:99`); duplicate `:id/duplicate`; import PDF/transcript.
- Share: `POST /:id/send` (`:1488`); public client view at `/proposal/:token` (`App.tsx`, `ProposalPage.jsx`).
- Client feedback: `POST /:id/accept` (`:1516`), `POST /:id/request-changes` (`:753`), `POST /:id/submit-final` (`:579`), `POST /:id/client-files` upload (`:1271`).
- Win/lose: admin `POST /:id/status` (`:1571`, allow-list incl. `won`/`lost`).
- **Win → project migration EXISTS:** `POST /:id/convert` (`:1364`) — idempotent, inserts into `projects` and stamps `status:"converted", project_id, converted_at` (`:1376`, `:1403`).
- Admin UI: `ProposalsListPage.jsx` (843), `ProposalCreatePage.jsx` (667), `ProposalDetailPage.jsx` (1198).

### Flowchart + document submission — built
- `FlowchartTab.jsx` (1583 lines); `workflow_stages` carry `emoji/title/description/inputs/outputs/order_index`.
- AI runs over the framework via Anthropic (`/demo/run`, `:260`), with a per-workflow `RUN_CAP`.
- Workflow interaction endpoints: `/workflow/:wfId/feedback` (`:516`), `/workflow/:wfId/proceed` (`:542`).
- Client document submission wired through `/:id/client-files`.

### Active Projects — built
`Dashboard.jsx` (5494) loads per project: `phases, tasks, documents, invoices, software, maintenance, activity, document_requests` (`:98`–`:117`).
- Documents: `DocumentsTab` upload + `document_requests` (`:872`).
- Invoicing: `invoices` table + signed-URL viewing `openInvoice` (`:533`).
- Support: `SupportTab` with Calendly booking card (`:1311`) + support tickets (`TICKET_CATEGORIES`, `:1056`).
- Activity feed: milestone/document/invoice/update (`:207`).

## Known Gaps (to confirm/expand during design-review + QA)
1. **Real-time** is manual: dashboard loads on mount, no Supabase realtime subscription found (no `channel`/`subscribe`). Vision asks for a real-time status view.
2. **Win→project seam UX**: backend convert is solid; the admin CTA + client-visible transition need an end-to-end seamlessness pass.
3. **Flowchart "play with it" + submission CTA**: interactivity and the document-submission call-to-action need a clarity/polish pass.
4. **Premium/consistent UI** across very large jsx files — design-review territory (spacing, hierarchy, states, motion).

## Epic Structure

```
#1 Proposals lifecycle (seamless create→share→feedback→win→migrate)
        └─> #2 Flowchart + dynamic document submission (client-facing)
                └─> #3 Active Projects (real-time + repository + invoicing + support)
   (cross-cutting) #4 Premium UX pass — runs against each as it lands
```
Sequencing rationale: #1 is the funnel entry and owns the riskiest seam (win→convert). #2 builds on a
sent/accepted proposal. #3 is where a won project lands. #4 is a design-review/QA overlay applied per child.

---

### Child #1 — Proposals lifecycle, seamless end-to-end
**Goal:** Admin creates a proposal fast, shares it, refines client feedback, marks won/lost, and on win the project appears in Active Projects with zero manual re-entry.
**Proposed change:** Audit the UI wiring of every backend endpoint above; ensure each status transition has a clear admin/client CTA, loading/empty/error states, and that `convert` is reachable from a single obvious "Mark Won" → "Open Project" action. Verify idempotent convert can't double-create.
**Acceptance:**
1. From an empty state, admin creates + sends a proposal in < 2 min, no console errors.
2. Client (via `/proposal/:token`) can accept and request changes; admin sees status update without manual refresh of the list.
3. Marking a proposal "won" exposes a one-click path to the created project; re-clicking convert returns the same `project_id` (no duplicate).
4. Every transition has loading/empty/error UI.
**Files:** `ProposalsListPage.jsx`, `ProposalCreatePage.jsx`, `ProposalDetailPage.jsx`, `ProposalPage.jsx`, `server/routes/proposalsV2.ts`.

### Child #2 — Interactive flowchart + dynamic document submission
**Goal:** Client can explore the full Lex Ops process (inputs/outputs per stage) and submit required documents through a clear, dynamic CTA; submissions land as feedback to Lex Ops.
**Proposed change:** Polish `FlowchartTab.jsx` interactivity (stage expand/inspect inputs+outputs), add an unmistakable "Submit required documents" CTA on stages that need inputs, and confirm uploads route to `/:id/client-files` and surface to the admin.
**Acceptance:**
1. Client can open any stage and see its inputs and outputs.
2. Stages needing documents show a visible CTA; uploaded files appear on the admin side tied to the proposal.
3. Empty/partial/large-file/error upload states handled.
**Files:** `FlowchartTab.jsx`, `ProposalPage.jsx`, `server/routes/proposalsV2.ts`.

### Child #3 — Active Projects: real-time, repository, invoicing, support
**Goal:** A won project shows real-time status, a clean repository of all documents + tools, invoicing, and a quick path to schedule support.
**Proposed change:** Add Supabase realtime subscriptions (or short-interval refresh) for project status/activity so the client sees live updates; tighten the documents + tools/software repository; verify invoice viewing; keep the Calendly support pit-stop one click away.
**Acceptance:**
1. A status/activity change made by admin appears in the client view without a manual reload.
2. Documents and tools/software are browsable in one place; invoices open via signed URL.
3. "Book a call" is reachable in ≤ 1 click from the project view.
**Files:** `Dashboard.jsx`, `server/routes/admin.ts`, `server/routes/modules.ts`.

### Child #4 — Premium UX pass (cross-cutting)
**Goal:** Seamless, premium feel across the portal.
**Proposed change:** Run `/gstack-design-review` per child as it lands; fix spacing, hierarchy, consistency, missing states, and slow interactions.
**Acceptance:** Passes design-review with no critical/high findings; key flows feel instant (no unexplained spinners).

## Out of Scope
- Rewriting the app or migrating off the current stack.
- Porting anything from `lexops_portal_v2_3.html`.
- New auth/role model (keep `client` / `lexops_admin` / `lexops_member`).

## Done Bar (epic)
- Full journey works end-to-end: create → send → client feedback → won → project → docs → invoice → support.
- Per-child acceptance checklists above all pass.
- Passes `/gstack-design-review`.

## Next Pipeline Step
Feed this spec into `/gstack-autoplan` (multi-lens review with auto-decisions), then implement child #1, QA + design-review, `/gstack-review`, and ship — with a go/no-go gate before the Render deploy.
