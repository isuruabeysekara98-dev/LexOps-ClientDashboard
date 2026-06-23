---
name: Proposals v2 client page design
description: Architecture and field-name conventions for the v2 proposal client page (ProposalPage.jsx).
---

## Component structure (ProposalPage.jsx)
- `HorizontalTimeline` — dark teal circles (#0B3B3B) with emoji + numbered badge, connecting line, click to open StageDrawer.
- `StageDrawer` — fixed right-panel overlay (z-index 300), slide-in animation. Shows stage inputs/outputs/stats.
- `TryMatterWizard` — 3-step embedded wizard (not modal). Step 1: dynamic fields from Claude. Step 2: file upload. Step 3: run + results.
- `SimpleWorkflowTabs` — fallback when `show_try_matter=false`. Two tabs: "Expected documents" (from stage.outputs) and "Submit documents".
- `WorkflowBlock` — wraps one workflow: header + timeline + wizard/tabs + drawer.

## Field name normalisation
- DB stores inputs/outputs as `{emoji, label, detail}` (from ProposalCreatePage form).
- StageDrawer renders `item.name || item.label` and `item.description || item.detail` to handle both old and new formats.

## Dynamic form fields
- `POST /api/proposals/v2/demo/generate-fields` — Claude (sonnet-4-5) generates 3–6 fields based on workflow+stages.
- Returns `{fields: [{id, label, type, placeholder, required, options?}]}`.
- If Claude returns `[]`, wizard falls back to a single freeform textarea.
- Endpoint placed BEFORE `/:id` routes to avoid collision (like import-pdf).

## Saved example templates (demo reuse)
- Table: `workflow_demo_templates (id, workflow_id, name, form_values JSONB, created_at)`.
- Three endpoints: `GET/POST /api/proposals/v2/workflow/:wfId/demo-templates`, `DELETE /api/proposals/v2/workflow/:wfId/demo-templates/:tid` — all validated by proposal token.
- GET gracefully returns `[]` if the table doesn't exist yet (no 500 on missing table).
- Client UX: template pill strip at top of Step 1 (hidden until templates exist). Hover a pill → × delete button overlays. Clicking a pill merges `form_values` into current form state and restores transcript from `__transcript` key if present.
- Save UX: "🔖 Save these values as a reusable example" link appears below the form once any field has a value. Clicking reveals an inline name-input + Save/Cancel row.

## show_try_matter toggle
- Admin toggle in ProposalCreatePage per workflow; tooltip says SQL migration required.
- Server save is resilient: tries with `show_try_matter`, falls back without if column missing.
- Frontend defaults `show_try_matter` to `false` when column not present in DB response.

**Why:** The wizard involves Claude API cost, so it should be opt-in per workflow via admin toggle.
