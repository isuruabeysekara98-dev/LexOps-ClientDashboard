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
The app is now **single-theme** with a light teal palette and **Cormorant Garamond** as the global typeface.

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

The Cormorant Garamond font is loaded via Google Fonts in `client/index.html`.

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

## Running
The `Start application` workflow runs `npm run dev` which starts Express + Vite on port 5000.
