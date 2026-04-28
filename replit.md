# LexOps Client Portal

Full-stack React + Vite + Express application backed by Supabase. A legal-ops portal that lets internal LexOps staff manage matters and lets clients view their own progress.

## Stack
- **Frontend**: React (JSX, Vite). Inline styles (no Tailwind in app components — styles are colocated). Uses `wouter` routing (not yet exercised broadly), `@tanstack/react-query` (queryClient configured), and `@supabase/supabase-js`.
- **Backend**: Express (`server/index.ts`) — thin layer; nearly all data lives in Supabase.
- **Database**: Supabase Postgres (auth + RLS + realtime).
- **Storage**: Supabase Storage for uploaded documents and attachments.

## App entry points
- `client/src/App.tsx` — handles auth bootstrap and routes to `LoginPage`, `SetPasswordPage`, `Dashboard`, or `ProposalPage` (token-based public proposal viewer).
- `client/src/components/Dashboard.jsx` — the main app surface (≈2400 lines). Houses every internal & client tab as inline sub-components.
- `client/src/components/AdminPanel.jsx` — admin overlay for managing clients, projects, users, packs.

## Theming (April 2026 rebrand)
The app is now **single-theme** with a light teal palette and a two-font system: **Playfair Display** for headings and **Inter** for everything else.

Theme tokens are defined as a single `warmTheme` object in `Dashboard.jsx` (and mirrored inline in `LoginPage.jsx`, `SetPasswordPage.jsx`, `ProposalPage.jsx`).

Key colors:
- `bg` `#FFFFFF` — primary background
- `surface` `#F0F4F4`, `surfaceHigh` `#E5EDED`
- `border` `#C5D4D4`
- `accent` `#1A6666` (CTA), `accentLight` `#0F4444` (deep accent / hover)
- `green` (done) `#1A6666`
- `text` `#082B2B`, `textSub` `#3A6666`
- Glass surfaces: `rgba(240,244,244,0.7)` with `backdrop-filter: blur(12px)`

The legacy light-mode toggle has been removed; `themes.dark` and `themes.light` both alias the same teal theme so existing 2400-line Dashboard.jsx code keeps working without find/replace. The app uses the `LogoDark` SVG variant since the background is light.

### Typography
Both fonts are loaded via Google Fonts in `client/index.html`:
- **Inter** (300 / 400 / 500 / 600) — global default, applied via `body { font-family: 'Inter', ... }`. Used for sidebar labels, nav, tabs, body text, buttons, badges, status pills, dates, metadata, form inputs, comments, and Builder-mode flowchart node titles. Base size 14px; 13px for secondary/metadata.
- **Playfair Display** (400 / 500 / 600 / 700) — applied **only** to display headings via inline `fontFamily: "'Playfair Display', Georgia, serif"`. Used for:
  - Project / page titles ("Estates Automation")
  - Section headings (`SectionLabel` — "Project Summary", "Project Phases")
  - Welcome screen ("Welcome, {firstName}.")
  - Auth page titles ("Sign in to Client Portal", "Set Your Password")
  - Proposal page h1/h2/h3
  - Flowchart node titles in **Client View** only (Builder mode keeps Inter)
  - The "Congratulations" toast at flowchart completion
  - Convention: `fontWeight: 600`, `letterSpacing: "-0.01em"`

## Flowchart feature (April 2026)
A new "Flowchart" tab sits between Documents and Invoices for both Internal and Client views. Implemented in `client/src/components/FlowchartTab.jsx`.

- **Builder mode** (Internal view): drag/drop nodes on a panable, zoomable, snap-to-20px-grid canvas. Tools: select, add rectangle, connect with arrow, delete. Includes auto-layout (BFS levelling), templates dropdown, minimap, and an admin side-panel for editing title / description / estimated date / status / attachments / comments.
- **Client mode**: read-only glassmorphism nodes with ambient particle embers, vignette, glowing progress bar, and a side detail panel with comments + attachments. Confetti + congratulations toast fire when all nodes reach `done`. Respects `prefers-reduced-motion`.
- **Mode switching**: tied to the existing header Internal / Client View toggle (no separate setting).
- **Realtime**: subscribes to `flowchart_nodes`, `flowchart_arrows`, `flowchart_comments` so the client view auto-refreshes when an admin edits.
- **Auto-seed**: when an internal user first opens the Flowchart tab on a project that has zero nodes, six sample "Estates Automation"-style nodes + connecting arrows are inserted automatically. Guarded by a ref so it only runs once per session.
- **Setup**: requires four small Supabase tables. Run `supabase_flowchart_setup.sql` once in Supabase → SQL Editor → New query → Run. If the tables are missing the Flowchart tab shows an inline setup notice with a copy-SQL button.

## Forbidden / sensitive files
- Do NOT modify `package.json`, `vite.config.ts`, `server/vite.ts`, or `drizzle.config.ts` directly — use the package manager tool for installs.
- `client/src/pages/home.tsx` is unused scaffold (App.tsx does not import it). Leave alone.

## Resilience patterns (April 2026)
- **Tab-switch / blank-screen fix**: `Dashboard.jsx` and `FlowchartTab.jsx` both listen for `visibilitychange` and `focus` events. When the tab returns to visible, projects + flowchart data are re-fetched and (in the flowchart's case) the realtime subscription is re-established if it had dropped. `App.tsx` keeps a 5-second safety timeout on the auth bootstrap and an internal `mounted` guard.
- **Supabase realtime resilience**: the flowchart channel tracks status via `subscribedRef`. On `CHANNEL_ERROR | TIMED_OUT | CLOSED`, the subscription is rebuilt with exponential backoff (500ms → 1s → 2s → 4s, capped). On visibility return the channel is re-subscribed if not currently `SUBSCRIBED`.
- A spinner (teal on white) is shown during initial / re-fetch loads so users never see a blank screen.

## Responsiveness (April 2026)
- `useIsMobile(768)` drives all responsive branching.
- Sidebar collapses on `<768px` and slides in as an overlay (`sidebarOpen` state, hamburger toggle in header, dim backdrop).
- Tab bar uses `overflow-x: auto` + `.hide-scrollbar` (cross-browser scrollbar hide rule lives in `index.css`); tabs are `flex-shrink: 0` so they never wrap.
- Project stat cards (Progress / Due Date / Budget / Tasks) render as a **2-column grid** on mobile (`gridTemplateColumns: "1fr 1fr"` when `mobile`).
- Flowchart canvas already supports touch panning via `onTouchStart / onTouchMove / onTouchEnd` (mirrors the mouse pan path).
- Page bodies have `overflow-x: hidden` + `max-width: 100%` (in `index.css` base layer) so nothing horizontal-scrolls except the flowchart canvas itself.
- WCAG 44×44 minimum tap targets are enforced on touch devices via a `[data-tap]` opt-in selector in `index.css` (applied to the tab-bar buttons; add `data-tap` to other inline-styled buttons as needed).

## Running
The `Start application` workflow runs `npm run dev` which starts Express + Vite on port 5000.
