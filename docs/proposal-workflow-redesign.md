# Proposal Workflow Redesign — Audit, Baseline & Target

Scope: the **client-facing** proposal page at `/proposal/:token` (`client/src/components/ProposalPage.jsx`).
Goal: (1) intuitively show the viewer the stages of the workflow **step by step**, and
(2) prompt the client to **upload documents where required and possible** so LexOps can refine and
return another round of comments.

---

## 1. Current state (audit)

The workflow presentation lives in `WorkflowBlock` and is assembled from three loosely-coupled pieces:

- **`HorizontalTimeline`** — a static row of dark circles (emoji + numbered badge) joined by a line.
  Every stage is shown at once. There is no notion of "current step"; nothing progresses.
- **`StageDrawer`** — a fixed right-side modal overlay (z-index 300) that opens *on click* and covers
  the page. This is the only place a stage's description, inputs, outputs **and per-stage upload CTA**
  are visible. All stage detail — including the upload prompt — is hidden until the user discovers
  that the circles are clickable ("Click a stage to see inputs, outputs & submit documents").
- **`TryMatterWizard`** (opt-in) / **`SimpleWorkflowTabs`** (fallback) — a *second* and *third*
  upload surface. The wizard's Step 2 is a single generic dropzone decoupled from any stage; the
  fallback tabs offer a per-stage "expected outputs" uploader that duplicates the drawer's uploader.

### Baseline metrics

| # | Metric | Baseline (current) |
|---|--------|--------------------|
| M1 | Stage presentation | **Static** — all stages rendered simultaneously; no active/current step |
| M2 | Step-by-step progression | **None** at the workflow level (only the AI demo run animates dots) |
| M3 | Interaction cost to read one stage's inputs/outputs | **1 click → full-screen modal drawer** (context switch, page obscured) |
| M4 | Distinct document-upload surfaces per workflow | **3** (StageDrawer, Wizard Step 2, SimpleWorkflowTabs) with inconsistent UI + `kind` |
| M5 | Upload prompt visibility on first view | **0** — the primary per-stage uploader is invisible until a drawer is opened |
| M6 | "Documents required" signalling on the overview | **None** — circles give no hint which stages need documents |
| M7 | Stage ↔ its own documents pairing | **Weak/broken** — wizard uploads are workflow-global, not tied to the stage that needs them |
| M8 | Upload completion feedback on the overview | **None** — no per-stage "uploaded ✓ / N of M" state visible without opening a drawer |
| M9 | Progress / "how far through am I" indicator | **None** |
| M10 | Motion supporting the workflow story | **Minimal** — `fadeUp` on cards, `slideInRight` on the drawer only |
| M11 | Loading / empty / oversize / error upload states | **Present** (10 MB guard, spinner, dismissible errors) — keep |

Interpretation of the two objectives against the baseline:

- **Objective 1 (step-by-step):** unmet. The timeline is a legend, not a walkthrough.
- **Objective 2 (prompt uploads where required):** partially met but buried and fragmented — the prompt
  exists only inside a modal, is duplicated across three surfaces, and never signals *which* stages need
  documents or whether the client has satisfied them.

---

## 2. Target design (self-authored)

Replace the static timeline + modal drawer + fallback tabs with a single **GuidedWorkflow** stepper —
one focused step on screen at a time, with an always-visible progress rail and an **inline, contextual
document uploader inside each step**. "Try your own case" becomes the call-to-action that launches it.

Design principles (brand-consistent — Satoshi, `t.accent #375971`, hairline `#E8E8E8`, success `#3C7A52`):

1. **Intro → walk.** The block opens on a compact overview (stage mini-map + what you'll do) with one
   primary CTA: **"Try your own case →"**. Pressing it reveals the guided walkthrough (Objective 1's
   entry, matching the literal ask: *press try your own case → then upload*).
2. **One step at a time.** A left **progress rail** lists every stage with its number, title, a
   **"Docs needed"** badge where applicable, and a live **✓ / N uploaded** status. A fill line animates
   up to the current step. The right **panel** shows only the active stage: description, key stats,
   *What we need from you* (inputs), the **inline uploader**, and *What you'll get back* (outputs).
3. **Smooth progression.** Each step change re-mounts the panel with a `stepIn` slide+fade; the rail's
   active node pulses and the fill line grows. Prev/Next + click-any-step navigation; the viewer always
   knows where they are (M9) and it visibly moves (M2, M10).
4. **Upload where required, in context.** The uploader sits inside the step that needs it — zero extra
   clicks (M3→0, M5 fixed). Stages whose inputs reference documents are flagged **"Documents required"**;
   others show a quiet "No documents needed for this stage." One component, one `kind` (`submitted`),
   one consistent look (M4 3→1, M6/M7 fixed). Files persist to `/:id/client-files` and surface to the
   admin labeled *Submitted · <Workflow>*.
5. **Completion → next round.** The rail shows overall progress and an "N of M document stages ready"
   tally (M8). The final step presents a clear hand-off into the existing Accept / Request-changes panel
   so the client can send everything back for another round of comments.

### Target metrics

| # | Target |
|---|--------|
| M1 | Guided — exactly one active stage in focus, advanced by the viewer |
| M2 | Explicit step-by-step progression with rail + animated fill |
| M3 | **0 clicks** — inputs/outputs are inline in the active step; no modal |
| M4 | **1** unified document-submission surface (AI-demo context upload, when enabled, is separate & labeled) |
| M5 | Upload prompt visible the moment a document stage is active |
| M6 | Per-stage "Documents required" badge on the rail |
| M7 | Uploads tied to the exact stage (`workflow_id` + `stage_index`) that needs them |
| M8 | Live per-stage ✓ and an overall "N of M ready" tally |
| M9 | Progress rail + "Step N of M" + fill line |
| M10 | `stepIn` slide/fade per step, animated fill, active-node emphasis |
| M11 | Retained (10 MB guard, spinner, dismissible errors, restore-on-reload) |

Backend contract is unchanged — no schema or endpoint changes. Uploads reuse
`POST /api/proposals/v2/:id/client-files` (`kind: "submitted"`, coerced server-side, shown to admins).
