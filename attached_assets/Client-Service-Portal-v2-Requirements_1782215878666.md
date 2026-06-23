# Lex Ops Client Service Portal — v2 Requirements (Section A: Proposals)

**Author:** Business Analyst (drafted with Isuru, isuru@lex-ops.io)
**Date:** 2026-06-23
**Status:** Ready for build
**Intended consumer:** Replit agent(s) extending the existing portal codebase

---

## 1. Purpose & Context

The Lex Ops Client Service Portal is the single system that houses the entire interaction with a client. It spans two halves:

- **Section A — Proposals** (the focus of this document): the pre-sale stage where Lex Ops builds a proposal, the client reviews and test-drives the proposed workflows, and the proposal is either won (converted to a project) or lost.
- **Section B — Active Projects** (existing, **out of scope for v2 right now**): where won proposals are delivered.

v2 introduces a **landing page** that lets admins choose between Proposals and Active Projects, builds out the **proposal creation, client review, and Claude-powered workflow demo** experience, and ends at a **placeholder "convert to active project" screen**.

This is an **extension of the existing Replit codebase**, not a rebuild. v2 must **match the existing portal's look and feel** (no restyling in scope).

### Reference URLs (existing app — match these patterns)
- Admin proposals view: `/admin/proposals/{proposalId}` (e.g. `/admin/proposals/3e5b00d1-d40d-4f61-a2a5-f395109851a4`)
- Admin new proposal: `/admin/proposals/new`
- Client proposal view: `/proposal/{slug}` (e.g. `/proposal/DemoOkafor1`)

---

## 2. Stakeholders & Roles

| Role | Count | Access |
|------|-------|--------|
| **Lex Ops Admin** | 3 (pre-provisioned) | Full access to all proposals (admin back end + client view via toggle) |
| **Client** | Many (per proposal) | Access only to their own proposal via the client view |

- **All 3 admins see all proposals.** No per-admin scoping.
- **Admin/Client toggle:** From within a specific proposal, an admin can toggle into **that proposal's client view**. The toggle reflects **real client state** — locked/unlocked workflows, submitted documents, generated results, and feedback exactly as the client currently sees/left them (not a clean preview).

---

## 3. Tech & Platform Decisions (locked)

| Concern | Decision |
|---------|----------|
| **Build approach** | Extend existing Replit codebase |
| **Database** | Supabase (existing connection) — Postgres |
| **Auth** | Supabase Auth. Clients: magic link **+** auto-generated email/password credentials emailed in the invite (so they can either click the link or log in directly). Admins: pre-provisioned accounts. |
| **File storage** | Supabase Storage, buckets scoped per proposal / per workflow |
| **Email** | Resend (free tier), sender `isuru@lex-ops.io`. Used for (a) client invite and (b) admin "client submitted" notification. |
| **AI demo backend** | Anthropic API, called **server-side only**. API key stored as a Replit secret. Model: **Claude Sonnet 4.6** (`claude-sonnet-4-6`). |
| **PDF generation** | Server-side rendering of the structured workflow result to a downloadable PDF. |

---

## 4. Proposal Lifecycle (State Machine)

```
Draft ──(Save & Send)──► Sent ──(client opens)──► In Review
                                                      │
                          ┌───────────────────────────┤
                          │                           │
                  (Request changes)            (Submit final)
                          │                           │
                          ▼                           ▼
              Sent (editable by admin) ◄──┐       Submitted (frozen)
                          │               │           │
                  (admin re-sends)        │     (admin decision)
                          └───────────────┘           │
                                              ┌────────┴────────┐
                                              ▼                 ▼
                                            Won              Lost
                                              │
                                      (Convert to project)
                                              ▼
                                          Converted
```

| Status | Meaning | Who can act |
|--------|---------|-------------|
| **Draft** | Admin building proposal; not yet sent | Admin (edit freely) |
| **Sent** | Invite emailed; client not yet opened (also the state after a "request changes" return) | Admin (edit, re-send) |
| **In Review** | Client has opened and is working through workflows | Client (run demos, upload docs, give feedback) |
| **Submitted** | Client hit final Submit; **content frozen** | Admin (review, decide Won/Lost) |
| **Won** | Admin manually marked won; **Convert** button appears | Admin |
| **Lost** | Admin manually marked lost (tracked) | — |
| **Converted** | Admin clicked Convert → placeholder project screen | — |

**Revision loop:** During *In Review*, when the client finishes all workflows they choose **Submit (final)** or **Request changes**. On *Request changes*: admin is notified, proposal returns to **Sent** as editable, admin edits and re-sends, client reviews again. On *Submit (final)*: client side locks, content freezes, admin is notified.

---

## 5. Functional Requirements

### 5.1 Landing Page (admin only)

- **FR-1.1** On opening the portal, an admin lands on a **landing page** (not directly into Active Projects as today).
- **FR-1.2** Landing page presents two selectable tiles/options: **Proposals** and **Active Projects**.
- **FR-1.3** Selecting **Proposals** navigates to the admin proposals list (matching the existing `/admin/proposals/...` UI).
- **FR-1.4** Selecting **Active Projects** links to the existing experience, untouched (out of scope for v2 changes).
- **FR-1.5** Clients never see the landing page — they are routed directly to their proposal (`/proposal/{slug}`) on login / magic-link open.

### 5.2 Proposal Creation (admin) — `/admin/proposals/new`

- **FR-2.1** Admin can create a new proposal with the following inputs:
  - **Proposal name** (used in emails and headings)
  - **Client context** (structured fields):
    - **Pain points** (list, repeatable)
    - **Objectives** (list, repeatable)
  - **Client email address** (recipient for the invite)
  - **One or more Workflows** (no cap; admin sets explicit ordering)
- **FR-2.2** Each **Workflow** contains:
  - Workflow **name**
  - Workflow **emoji**
  - An ordered list of **Stages**, where each stage has:
    - **Stage text/title**
    - **Stage emoji**
    - **Stage description**
  - **Per-workflow document requirements** (defines which core documents / expected-output fields the client must submit for *this* workflow — see 5.4)
- **FR-2.3** The **set of stages is the "framework"** the Claude demo runs against for that workflow.
- **FR-2.4** Admin can **add multiple workflows** (e.g. when a deliverable spans several workflows) and **reorder** them; order determines the client's unlock sequence.
- **FR-2.5** Admin can **Save as Draft** at any time and return later.
- **FR-2.6** Admin clicks **Save & Send**, which:
  - Provisions the client (Supabase Auth: magic link + auto-generated credentials)
  - Sends the invite email via Resend
  - Moves the proposal to **Sent**
- **FR-2.7** Once **Sent**, the admin **cannot edit and re-send** — UNLESS the client submits a **Request changes**, which returns the proposal to an editable **Sent** state allowing edits and re-send.

#### Invite email (Resend)
- **From:** `isuru@lex-ops.io`
- **Core line (required):** "Lex Ops has sent you a proposal for **{{proposal name}}**" (proposal name pulled from the portal)
- **Contents:** proposal link **and** login credentials (so the client may log in rather than only deep-linking)
- **Subject & body:** contextually appropriate copy (generated; dummy acceptable for v1)

### 5.3 Client Proposal Review — `/proposal/{slug}`

- **FR-3.1** Client opens the proposal (via magic link or login) and reviews proposal details and client context.
- **FR-3.2** Workflows are presented in admin-defined order. **Workflows are completed strictly one-by-one** — subsequent workflows are **locked** until the current one is complete.
- **FR-3.3** Each workflow shows a side button: **"Try your workflow and share feedback."**
- **FR-3.4** A workflow is marked **complete** only when ALL of the following are done:
  1. The client has **run the demo** at least once
  2. The client has **submitted feedback** (free text) for the workflow
  3. The client has **submitted that workflow's required core documents / expected outputs**
  4. The client has clicked **"Proceed to next"**
- **FR-3.5** Completing a workflow unlocks the next.
- **FR-3.6** After all workflows are complete, a single final action is available: **Submit proposal to Lex Ops** (or **Request changes** — see 5.5).

### 5.4 The Workflow Demo (Claude-powered)

- **FR-4.1** Clicking **"Try your workflow and share feedback"** opens a **loaded screen** (modal/overlay) for that workflow.
- **FR-4.2** In the screen the client can provide input by any of: **typing a prompt/question**, **pasting sample text**, and/or **uploading a file**, then clicking **Run**.
- **FR-4.3** On Run, the server calls the Anthropic API (Sonnet 4.6) with the **demo contract** below and displays a **loading animation** while generating.
- **FR-4.4** **Output rendering:** results are shown as a **structured output mirroring the workflow stages** — one result block per stage, each headed by the stage's emoji + title, with generated content beneath. Plus a **downloadable PDF** of the full structured result.
- **FR-4.5** The client can **re-run the workflow multiple times** before closing the screen. (Default soft cap: **10 runs per workflow** to control spend — configurable.)
- **FR-4.6** The client enters **feedback** (free text) within this screen once results have loaded.
- **FR-4.7** Client clicks **Close** to exit the screen; the latest results and feedback are retained for that workflow.

#### Claude demo contract (server-side)
- **Inputs to the model:**
  - The workflow **framework** = ordered stages (title + emoji + description)
  - The proposal **client context** (pain points + objectives)
  - The **client's provided input** (prompt text + pasted text + extracted file content)
- **Instruction:** apply the framework (stages) to the client's input, producing **one section per stage** in stage order.
- **Output:** structured, stage-aligned content suitable for both on-screen blocks and PDF export.
- **Constraints:** server-side only; key in Replit secret; enforce the per-workflow run cap; handle/retry transient API errors and surface a friendly failure state.

### 5.5 Submission & Revision Loop

- **FR-5.1** When all workflows are complete, the client chooses one of:
  - **Submit (final):** locks the client side, **freezes** all content (generated results, uploaded docs, feedback), moves proposal to **Submitted**, and notifies admins.
  - **Request changes:** captures a note to Lex Ops, notifies admins, and returns the proposal to an editable **Sent** state for the admin.
- **FR-5.2** On **Request changes**, the admin edits and **re-sends**; the client reviews again (loop may repeat).
- **FR-5.3** On **Submit (final)**, the submitted snapshot is **immutable** and **stored** — it will be reused in the active-project setup later. The client can no longer edit results, docs, or feedback.

#### Admin "client submitted" notification (Resend)
- **To:** `isuru@lex-ops.io`
- Triggered on final Submit (and also on Request changes, as a notification of the change request).

### 5.6 Conversion to Active Project

- **FR-6.1** Admin **manually** marks a Submitted proposal as **Won** or **Lost** (both tracked).
- **FR-6.2** Marking **Won** reveals a **"Convert proposal to active project"** button (only visible after the client has submitted and admin marks won).
- **FR-6.3** Clicking Convert navigates to a **placeholder "project starter" screen** (no further build in v2). Proposal moves to **Converted**.

---

## 6. Data Model (Supabase / Postgres)

Indicative schema — adjust to existing conventions.

- **profiles / users** (via Supabase Auth) — `id`, `email`, `role` (`admin` | `client`)
- **proposals** — `id`, `name`, `slug`, `client_email`, `client_user_id`, `status` (enum per §4), `pain_points` (jsonb array), `objectives` (jsonb array), `change_request_note`, `created_by`, timestamps, `submitted_at`, `won_lost_at`, `converted_at`
- **workflows** — `id`, `proposal_id`, `name`, `emoji`, `order_index`, `unlocked` (derived), `completed_at`
- **workflow_stages** — `id`, `workflow_id`, `order_index`, `title`, `emoji`, `description`
- **workflow_document_requirements** — `id`, `workflow_id`, `label`, `type` (`file` | `text`), `required` (bool)
- **workflow_runs** — `id`, `workflow_id`, `client_input_text`, `input_file_path`, `output_json` (stage-aligned), `pdf_path`, `created_at` (supports multiple runs)
- **workflow_submissions** — `id`, `workflow_id`, `feedback_text`, `proceeded` (bool), `final_run_id`, frozen-on-submit fields
- **uploaded_documents** — `id`, `workflow_id`, `proposal_id`, `storage_path`, `filename`, `size`, `kind` (`core_document` | `expected_output`)
- **emails_log** (optional) — track invite / submission notifications

**Storage:** Supabase Storage buckets keyed by `proposal_id/workflow_id/...`.

---

## 7. Non-Functional Requirements

- **NFR-1 — Look & feel:** Match the existing portal exactly; no restyling.
- **NFR-2 — Security:** Anthropic key and Resend key in Replit secrets; never client-exposed. Clients can access only their own proposal (Supabase RLS scoping by `client_user_id`); admins see all.
- **NFR-3 — Cost control:** Sonnet 4.6; enforce per-workflow run cap (default 10).
- **NFR-4 — Resilience:** Graceful handling of AI/email failures with user-facing messaging and retry.
- **NFR-5 — Immutability:** Submitted proposals are frozen snapshots, preserved for downstream project setup.
- **NFR-6 — Loading UX:** Animated loading state during demo generation.

---

## 8. Out of Scope (v2)

- Active Projects build-out (Section B) — landing tile links to existing experience only.
- Anything beyond the placeholder project-starter screen.
- Multi-admin permission scoping (all admins see everything).
- Restyling/redesign of the portal.

---

## 9. Open Items / Assumptions to Confirm

1. **Run cap** defaulted to 10/workflow — confirm or adjust.
2. **File types/sizes** for uploads — assume common docs (PDF, DOCX, XLSX, TXT, CSV, images); confirm max size limits.
3. **Expected outputs** treated as a document-requirement type alongside core documents (per-workflow). Confirm whether they need a distinct UI section.
4. Whether the admin **list view** needs status filters/sorting (assumed yes — by status).
5. Magic-link **expiry** window (assume Supabase default).
