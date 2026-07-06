# Loading & Reliability Audit — "the user must always know the app isn't broken"

Scope: every **page-blocking data load** in the client app (`client/src/**`). The complaint is that some
sections spin forever or load for a long time with no signal, so the app feels broken.

## The failure classes we're fixing

1. **Infinite spinner** — `loading` is set `true` and only cleared on the happy path; a thrown/rejected
   query or a hung network request leaves the spinner up forever.
2. **Silent / misleading failure** — the load fails but the user sees an empty screen (or a wrong
   message like "not found"), with no way to recover.
3. **Unreassured slow load** — a genuinely slow load shows a bare spinner with no "still working" signal,
   so the user assumes it's frozen.

## Benchmarks (target contract for every top-level loader)

| # | Benchmark |
|---|-----------|
| **B1** | **Bounded.** Every page-blocking load is capped by a hard timeout (≈12s). On timeout the spinner resolves into an explicit error state — never a hang, never a blank view. |
| **B2** | **Always clears.** The `loading` flag is cleared on *every* path (success, empty, error, timeout) via `try/finally`. Zero loaders where a throw skips the clear. |
| **B3** | **Recoverable.** Every failed page-blocking load renders an actionable error (plain-language message + **Retry**), never a silent empty view or a misleading message. |
| **B4** | **Reassuring.** Any spinner that can exceed ≈5s shows a "taking longer than usual…" reassurance so the user knows it is still working. |
| **B5** | **Labeled.** Spinners carry descriptive text ("Loading your projects…"), not a bare disc. |

## Baseline (current state, measured from code)

Top-level / page-blocking loaders and how each scores today:

| Loader (file) | B1 bounded | B2 always-clears | B3 error+retry | B4 slow hint | B5 labeled |
|---|---|---|---|---|---|
| `App.tsx` — auth (`AuthenticatedApp`) | ⚠ blind 5s flag-flip only | ✅ finally | ❌ none | ❌ | ❌ bare |
| `Dashboard.jsx` — `loadProjects` (client/admin landing) | ⚠ blind 5s flag-flip; request still hangs → **silent empty** | ❌ **no try/catch** (L5254) | ❌ **none** | ❌ | ✅ "Loading projects…" |
| `AdminPanel.jsx` — `loadClients` / `loadProposals` | ❌ none → **infinite** | ❌ **clears outside try** (L480,494) | ❌ none | ❌ | ✅ "Loading…" |
| `ProposalDetailPage.jsx` — `loadAll` | ❌ no request timeout → **infinite on hang** | ✅ finally (L530) | ❌ **misleading "Proposal not found", no retry** (L664) | ❌ | ❌ bare |
| `FlowchartTab.jsx` — `load` | ❌ none → **infinite** | ❌ **no try/finally** (L343) | ❌ none | ❌ | (inline) |
| `ProposalPage.jsx` — `load` (client `/proposal/:token`) | ❌ no request timeout | ✅ finally | ✅ error + reload | ❌ | ❌ bare |
| `ProposalsListPage.jsx` — `load` | ❌ no request timeout | ✅ | ✅ **loadError + Retry** (L473) | ❌ | ✅ |
| `ProposalCreatePage.jsx` — `loadEdit` | ❌ no request timeout | ✅ finally (L161) | ❌ none | ❌ | ❌ bare |

**Baseline totals:** B1 0/8 · B2 5/8 · B3 2/8 · B4 0/8 · B5 4/8.
Net: five loaders can hang or silently die (`Dashboard`, `AdminPanel`×2, `ProposalDetailPage`,
`FlowchartTab`), none are reassured on slow loads, and only two tell the user how to recover.

## Fix approach (uniform)

Add one shared module `client/src/lib/loadUtils.js`:
- `LOAD_TIMEOUT_MS` (12s), `SLOW_HINT_MS` (5s).
- `withTimeout(promise, ms)` — races any thenable (incl. Supabase query builders) against a timeout reject.
- `fetchWithTimeout(url, opts, ms)` — `AbortController`-backed `fetch`.
- `useSlowHint(active, delay)` — hook, true once a load has run longer than `delay`.

Then bring every loader above to the benchmark contract: wrap the fetch/query in `withTimeout`/`fetchWithTimeout`,
put the `loading` clear in `finally`, add a `loadError` state that renders a plain-language message + **Retry**,
and show the slow-load reassurance. Background/silent refreshes keep existing data and fail quietly (no wipe).

### Target totals: B1–B5 all 8/8 for page-blocking loaders.
Backend unchanged.
