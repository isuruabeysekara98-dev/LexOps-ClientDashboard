# Replit Setup — Apply the LexOps Brand Kit

**Read this first.** This folder (`brand-guidelines/`) is the official LexOps visual identity for the client portal. Treat it as the single source of truth for colour, type, spacing, components, and assets. Do **not** invent new colours, fonts, or spacing values — use only what is defined here.

---

## Step 0 — Save this folder

Keep this entire folder in the repo (recommended location: `client/brand-guidelines/` or `src/brand-guidelines/`). Do not delete it after wiring up the CSS — it is the living reference for all future UI work in this project.

---

## Step 1 — Load the Satoshi typeface

The brand font is **Satoshi**, served free from the Fontshare CDN. Add this to the `<head>` of the root HTML document (e.g. `index.html`) **before** any stylesheet:

```html
<link rel="preconnect" href="https://api.fontshare.com" crossorigin />
<link
  href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
  rel="stylesheet"
/>
```

Weights in use: **400** (regular), **500** (medium), **700** (bold). No other typeface is permitted.

---

## Step 2 — Wire up the CSS

Pick **one** of the two stylesheets in `css/` based on the portal's stack:

### Option A — Plain CSS / styled-components / CSS Modules / MUI / Chakra (no Tailwind)
Import the framework-agnostic token file **once**, at the app's entry point (e.g. `main.tsx`, `App.tsx`, or the top of your global stylesheet):

```js
import "./brand-guidelines/css/tokens.css";
```

Then reference the variables everywhere instead of hard-coded values:

```css
.button-primary {
  background: var(--lex-color-slate-blue);
  color: var(--lex-color-white);
  border-radius: var(--lex-radius-lg);
  font-family: var(--lex-font-family);
  font-size: var(--lex-text-p2);
  line-height: var(--lex-text-p2-line);
}
.button-primary:hover { background: var(--lex-color-dark-gray); }
```

Set the page defaults globally:

```css
body {
  font-family: var(--lex-font-family);
  color: var(--lex-color-dark-gray);
  background: var(--lex-color-page-bg);
  -webkit-font-smoothing: antialiased;
}
```

### Option B — Tailwind v4
Replace (or import at the top of) your main Tailwind entry CSS with:

```css
@import "tailwindcss";
@import "./brand-guidelines/css/globals.css";
```

`globals.css` registers every brand colour and type size as a Tailwind utility via `@theme`, so you get `bg-slate-blue`, `text-dark-gray`, `text-h1`, `container-site`, etc. out of the box.

> If on Tailwind **v3 or earlier**: do not use `globals.css` (the `@theme` syntax is v4-only). Use Option A's `tokens.css` instead, or map the values from `tokens.json` into your `tailwind.config.js` `theme.extend`.

---

## Step 3 — Use the assets

Copy `assets/` into your public/static directory and reference them:

| Need | File |
|---|---|
| Logo (light backgrounds) | `assets/logo/logo.svg` |
| Logo (dark/photo backgrounds) | `assets/logo/logo-white.svg` |
| App icon / avatar / tight spaces | `assets/logo/logo-mark.svg` |
| Favicon | `assets/logo/favicon.svg` · `favicon.ico` · `apple-touch-icon.png` |
| UI icons (17, Vuesax linear) | `assets/icons/*.svg` |
| Client logos | `assets/client-logos/*.webp` |

Favicon wiring:
```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

Icons are single-colour strokes — recolour via the CSS `stroke` property (`var(--lex-color-slate-blue)` when active, `var(--lex-color-mid-gray)` default, white on dark).

---

## Step 3.5 — Apply it across **every** page (not just one)

Importing the tokens makes them *available*; it does not retro-fit pages that already
have their own hard-coded colours, fonts, or spacing. The branding must reach **every
route, layout, modal, and email template in the portal.** Do all of the following:

1. **Import once, globally.** Put the font `<link>` and the CSS import in the *root*
   shared shell — the single file every page passes through. Depending on the stack:
   - Next.js App Router → `app/layout.tsx` + `app/globals.css`
   - Next.js Pages Router → `pages/_app.tsx` + `pages/_document.tsx`
   - Vite/CRA SPA → `src/main.tsx` / `src/App.tsx` entry + `index.html` `<head>`
   - Plain multi-page → a shared header partial / template included by every page
   Never import the tokens per-page; import them in the one place all pages inherit from.

2. **Set global defaults on `body`** (font, text colour, page background) so any page
   that sets *nothing* already looks on-brand. See Step 2.

3. **Audit and replace existing styles.** Sweep the whole codebase for off-brand values
   and swap them for tokens. Search for:
   - any `#hex` colour, `rgb(...)`, or named colour (`blue`, `gray`, `slate`, …)
   - `font-family` declarations naming anything other than Satoshi
   - hard-coded `border-radius`, container `max-width`, and gutter `padding` values
   Replace each with the matching `var(--lex-…)` token (or Tailwind utility). If a value
   has no token equivalent, flag it — don't leave a one-off.

4. **Theme third-party UI globally.** If the portal uses a component library (MUI,
   Chakra, Ant, shadcn, Bootstrap, etc.), configure its theme/provider **once** at the
   root with the LexOps tokens so every page's inputs, buttons, tables, and modals
   inherit the palette — rather than overriding components page-by-page.

5. **Verify on each route.** After wiring, open every page (login, dashboard, settings,
   detail views, empty states, error pages, emails) and confirm: Satoshi is rendering,
   the page background is `#FAFBFC`, primary actions are `slate-blue`, and no stray
   default-blue links or system-font text remain.

---

## Step 4 — Match the components

`BRAND_GUIDELINES.md` (full reference) and `COMPONENTS.md` (component specs) describe every UI pattern. The `components/` folder holds the real React/TSX implementations from the marketing site — port their structure and class logic, don't reinvent them. Key patterns:

- **Button** — primary `slate-blue → dark-gray` on hover; ghost `dark-gray` outline; `rounded-lg`.
- **Header** — fixed, 72px, blurred `#FAFBFC/85` background, hairline bottom border.
- **Accordion** — numbered rows; open state `slate-blue` filled, white text.
- **Eyebrow caption** — 5px `light-slate` dot + 11px uppercase tracked label.
- **Icon box** — `48px`, `rounded-lg`, `#F4F8FB` fill (or `slate-blue` when active).
- **Radii** — buttons/icons 8px, cards/pills 12px, frames 16px.

---

## Token quick-reference

```
COLOURS
  dark-gray   #232A34   slate-blue  #375971   light-slate #9DB5C9
  light-blue  #E4F1F8   off-black   #0D0F13   mid-gray    #616568
  light-gray  #8D8D99   white       #FFFFFF
  page-bg     #FAFBFC   section-bg  #F4F8FB   hairline    #E8E8E8
  success     #3C7A52   alert       #C9542E

TYPE  Satoshi 400/500/700
  H1 56/60·500   H2 44/52·400   H3 26/31·500   H4 20/24·500
  P1 20/30   P2 16/24   P3 14/22   Caption 11/16·500·UPPERCASE

LAYOUT  max 1280px · gutters 20→32→48→80 · radii 8/12/16 · header 72px
```

---

## Rules for the agent

1. **Never hard-code a hex value** that already exists as a token — use the variable.
2. **Never introduce a second font.** Satoshi only.
3. **Never alter the logo** — no stretching, recolouring the wordmark, or effects.
4. When unsure about a colour, size, radius, or component behaviour, **consult `BRAND_GUIDELINES.md` rather than guessing.**
