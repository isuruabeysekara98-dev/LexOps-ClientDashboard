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

## Theming (June 2026 rebrand — official LexOps brand)
The app uses the **official LexOps brand guidelines** (`attached_assets/brand_guidelines/brand-guidelines/`). Single-theme, single-font.

Theme tokens are defined as a single `warmTheme` object in `Dashboard.jsx` (and mirrored inline in `LoginPage.jsx`, `SetPasswordPage.jsx`, `ProposalPage.jsx`).

Key colors (from `css/tokens.css`):
- `bg` `#FFFFFF` — card surfaces
- `surface` `#F4F8FB` (section-bg), `surfaceHigh` `#E4F1F8` (light-blue)
- `border` `#E8E8E8` (hairline)
- `accent` `#375971` (slate-blue — CTA, links, active states)
- `accentLight` `#232A34` (dark-gray — hover/deep accent)
- `green` `#3C7A52` (success), `greenSoft` `#E7F3EC`
- `red` `#C9542E` (alert)
- `text` `#232A34` (dark-gray), `textSub` `#616568` (mid-gray)
- Page background: `#FAFBFC`
- Glass surfaces: `rgba(244,248,251,0.80)` with `backdrop-filter: blur(12px)`

`themes.dark` and `themes.light` both alias the same brand theme. Brand assets (logo SVGs, favicons, icons) live in `client/public/`.

### Typography
**Single font: Satoshi** — loaded via Fontshare CDN in `client/index.html`:
```html
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
```
- Weights: **400** (regular), **500** (medium), **700** (bold)
- Applied globally via `body { font-family: 'Satoshi', sans-serif }`
- **No Playfair Display. No Inter.** Satoshi only, everywhere.
- Headings use `fontWeight: 500–700`, `letterSpacing: "-0.01em"` for display feel

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

## FlowchartTab — Miro-style builder rewrite (April 2026)
The builder was completely rewritten with a four-tool, sticky-tool philosophy. Selected tool **stays selected** until the user picks another tool — it never auto-resets after an action.

### Tools (floating pill toolbar, top-left of canvas)
1. **Hand (H)** — default tool. Click+drag canvas to pan; click+drag a node to move it (saves on mouseup).
2. **Rectangle (R)** — click anywhere on the canvas to instantly create a 160×60 rectangle titled "Step", which immediately enters inline edit mode. Tool stays active for rapid placement.
3. **Arrow (A)** — hover a node to reveal 4 connection dots (top/right/bottom/left) plus a teal hover border. Mousedown on a dot to start, drag (live dashed-teal preview curve), release on another node's dot to create. Cancels silently if released over empty canvas.
4. **Text (T)** — click an existing rectangle to enter inline title edit (full text pre-selected). Clicking empty canvas shows a 1.5s tooltip "Click a rectangle to edit its text".

### Other UX
- **Right-click a rectangle** → minimal "Delete step" menu. **Right-click an arrow** → "Delete connection".
- **Status badge** on each rectangle (bottom-right pill): click cycles Pending → In Progress → Done (Done is solid teal with ✓ prefix; In Progress has a pulse animation).
- **Floating top-right cluster**: Saving…/Saved ✓ indicator, current zoom %, Templates button.
- **Templates** open in a side panel. Empty by default — users save the current canvas as a named template (table: `flowchart_templates` with `id, name, project_id, snapshot JSONB, created_at`). Clicking "Use" replays the template centred on the current viewport. Right-click or × to delete.
- **Canvas**: dot grid (#C5D4D4 1.5px dots, 24px spacing), zoom 80–150% via wheel, pan via Hand tool / 1-finger touch.
- **Keyboard**: H / R / A / T switch tools; Escape cancels arrow draft, exits title edit, returns to Hand; Delete removes selected node.
- **Saves auto-retry up to 3 times silently**; never shows an error modal.
- **Removed** from the previous builder: Add Node button, Auto Layout, Delete tool, side edit panel (description/date/attachments), preset template list, sample-data auto-seed. Canvas now starts empty.

### Required schema addition
The new `flowchart_templates` table needs to be created in Supabase. The SetupNotice now includes its `CREATE TABLE IF NOT EXISTS` statement and matching RLS policy. Existing installs that already created the other four tables only need to run the templates `CREATE` block.

### Client view (read-only) preserved
When `isInternal=false`, the tab still shows the progress bar at top, particle/vignette layer, glassy nodes with hover lift, click-to-open detail side panel (description, attachments, comments), and the confetti celebration when all nodes are done.

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
