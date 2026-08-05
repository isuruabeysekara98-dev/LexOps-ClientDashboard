---
name: Living Proposal subsystem
description: The /p/:token graph proposal — its own router at /api/lp, its own tables, and a `state` column deliberately separate from `status`.
---

## What it is
The Living Proposal (see `LIVING-PROPOSAL-PLAN.md` in the Flowchart folder) is a second,
newer client-facing surface. It does **not** replace `/proposal/:token` — both run.

| | `/proposal/:token` (v1) | `/p/:token` (living) |
|---|---|---|
| Component | `ProposalPage.jsx` | `LivingProposalPage.jsx` |
| API | `/api/proposals/v2` | `/api/lp` |
| Data | `workflows` + `workflow_stages` | `proposal_graphs.nodes/edges` |

## Two fields, two jobs — don't merge them
- `proposals.status` — the existing admin lifecycle (`draft`/`sent`/`won`/`converted`/…).
  Its CHECK constraint lives in `supabase_proposal_status_migration.sql`.
- `proposals.state` — the turn engine only (`draft`/`sent`/`feedback_shared`/`revised`/`won`/`lost`),
  moved only by deliberate acts. `ball_in_court` moves independently on any client activity.

Adding a value to one does **not** mean adding it to the other. They were kept apart so the two
CHECK constraints never fight.

## Migration
`supabase/living_proposal.sql` — run once in the Supabase SQL editor (no `DATABASE_URL` is
configured in this repo, so DDL can't be applied from code). Creates `proposal_graphs`,
`proposal_inputs`, `proposal_notes`, `proposal_recipients`, `proposal_events`, the `proposals`
turn columns, and the `stalled_proposals` view.

## Token resolution
`resolveToken()` in `server/routes/livingProposal.ts` accepts **either** a
`proposal_recipients.token` or the legacy `proposals.token`. A legacy token lazily mints a primary
recipient row so per-recipient telemetry starts on first open. Don't "simplify" this away — bucket 1
of the stall query (`never_opened`) is blind without a recipient row.

## The canvas (day 2)
`ProposalCanvas.jsx` + `proposalCanvas/{language,layout,draw}.js`. d3-force for layout,
Canvas2D for painting — no SVG, no React per node.

- **`language.js` is inherited, not invented.** Palette and semantics come from
  `4. Proposal generator/.claude/skills/create-proposal/references/visual-language.md`
  (purple `#633dc0` machine, amber `#e08a00` human, green `#1f9d55` locked, red `#b3261e` pain).
  If the deck's palette moves, move it here too — the two reading as one product is the point.
- **Width is React state, not a ref.** The pipeline preset spreads clusters across the available
  width, so a resize has to *rebuild the forces*, not just stretch the bitmap. `ResizeObserver`
  is dormant while the document is hidden, hence the extra `visibilitychange` listener.
- **Gradients are cached** by colour + rounded radius and drawn at the origin under
  `ctx.translate()`. Creating one per node per frame was the single biggest avoidable cost.
### The two axes mean things — don't let them drift
- **X = dependency depth**, computed from the *edges* (longest path from a source), not from the
  authored `cluster` order. Columns are pinned with `fx`, so they stay aligned the way n8n and
  make.com read. If the authored clusters and the edges disagree, the edges win.
- **Y = scenario divergence.** The trunk — where every case type passes — runs down the middle.
  Branches fan out **from their parent's line**, not from the global centre; getting that wrong
  put directly-connected nodes on opposite sides of the canvas. A node carrying no scenarios is
  a trunk continuation and follows its most trunk-ward parent, which is what lets a branch rejoin.
- **Everything is deterministic** — positions seed from an FNV-1a hash of the node id, never
  `Math.random()`. A map that rearranges between two visits reads as instability in the thing
  being sold. There is a regression check for this: capture `__canvasBench().screen`, reload,
  compare. It must be byte-identical.
- **The column caption suppresses itself** when a column holds more than one cluster. Parallel
  chains (BR Legal's two outcomes) put unrelated phases in the same column, and naming it after
  whichever cluster sorted first produces a caption that reads convincingly and says nothing true.

- **`window.__canvasBench(n)`** measures the cost of one frame synchronously. Use it instead of
  an fps counter — rAF is throttled to zero in a background tab, so fps there reads 0 and means
  nothing. `scripts/seed-perf-fixture.mjs` makes a 150-node graph to run it against.

## The v2 node fields (4 Aug 2026)

`proposal_graphs.nodes` is jsonb, so **none of these needed DDL** — they're new keys in the JSON.
The only v2 column is `explainers`, folded into `living_proposal.sql` alongside
`deliverables`/`scenarios` so it lands in the same paste.

- **`size`** — `small` | `medium` | `large`. An authored judgement about emphasis, scaling the
  kind's base radius. Deliberately **not** derived from `steps_eliminated`: how much work goes away
  and how much a step matters are different claims, and a one-step change is sometimes the whole
  point of the build. Graphs with no `size` still fall back to the old `value.amount` path so they
  don't flatten to uniform circles.
- **`steps_eliminated`** — the headline unit, replacing hours saved. Countable and checkable
  against the client's own process, so nobody has to be trusted for it. `formatMetric` still
  returns `null` when absent, so a graph without one renders no headline rather than an invented one.
- **`explainers`** — 2–3 per *proposal*, concept-level, never one per node. A beat script
  (`{ id, anchor, seconds, beats[] }`), not a video file: copy plus operations against the map
  already on screen. §2b prices one at 20–40 minutes of thought, forever, per proposal.

Two things that looked like new fields and aren't:

- **"Client POC requested"** is a need with `type: "contact"`. It already exists and already renders.
- **"Sample outputs"** is a need with `type: "file"` — client→us, the day-1 upload path. There is
  no us→client file direction, and adding one would need its own bucket and signed URLs, or one
  firm eventually sees another's precedent.

Edges stay a list. A scalar `next` pointer cannot express these graphs: 4 nodes fan out to two
successors and 6 have two predecessors, across 5 of the 7 working proposals.

## Pilot simplification
One live graph per proposal, `version` is always 1 (`GRAPH_VERSION`). No versioning, no diff, no
carry-forward. Versioning returns in week 2; the columns are already there.

Related: [[backend-write-proxy]] — all living-proposal writes go through this router's service-role
client, never from the frontend.
