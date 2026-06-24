# LexOps — Brand & UI Guidelines

A consistent reference for the LexOps visual identity, derived from the marketing
website. Use this to keep colours, type, components, and assets aligned across
future pages, decks, and collateral.

> A **Teams Squared** product — _"Designing legal workflows that scale with your team."_

All packaged assets referenced below live in [`./assets/`](./assets/).

---

## 1. Logo

The mark is two interlocking corner brackets forming an open square frame — a `light-slate` (`#9DB5C9`) top-right bracket and a `dark-gray` (`#232A34`) bottom-left bracket — followed by the "LexOps" wordmark.

### Full logo (mark + wordmark)
| Asset | File | Use |
|---|---|---|
| Primary, colour (raster) | [`assets/logo/logo.png`](./assets/logo/logo.png) | Default — light backgrounds |
| Primary, colour (vector) | [`assets/logo/logo.svg`](./assets/logo/logo.svg) | Scalable — print, large format |
| White knockout (vector) | [`assets/logo/logo-white.svg`](./assets/logo/logo-white.svg) | Dark / photo backgrounds |
| White knockout (raster) | [`assets/logo/logo-white.png`](./assets/logo/logo-white.png) · [`@2x`](./assets/logo/logo-white@2x.png) | Dark backgrounds where SVG isn't supported |

### Mark only
| Asset | File | Use |
|---|---|---|
| Bracket mark (vector) | [`assets/logo/logo-mark.svg`](./assets/logo/logo-mark.svg) | App icon, avatar, tight spaces |

### Favicon set
A **white mark on a `slate-blue` (`#375971`) rounded tile** — self-contained so it stays legible on light tabs, dark tabs, and home screens alike. (Apple-touch is the same tile, full-bleed, since iOS applies its own corner mask.)
| Asset | File | Use |
|---|---|---|
| Scalable favicon | [`assets/logo/favicon.svg`](./assets/logo/favicon.svg) | Modern browsers (`rel="icon"`) |
| ICO (16+32) | [`assets/logo/favicon.ico`](./assets/logo/favicon.ico) | Legacy fallback (`/favicon.ico`) |
| PNG 16 / 32 | [`favicon-16.png`](./assets/logo/favicon-16.png) · [`favicon-32.png`](./assets/logo/favicon-32.png) | `rel="icon"` PNG hints |
| Apple touch 180 | [`assets/logo/apple-touch-icon.png`](./assets/logo/apple-touch-icon.png) | iOS home-screen |

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**Usage**
- Native intrinsic size ≈ 115 × 36 px. On site it renders at **26px height** in the header and **28px** in the footer; always scale by height, keep width auto.
- Maintain clear space around the mark equal to the height of the bracket glyph.
- Light backgrounds → colour logo; dark / photo backgrounds → white knockout.
- Never stretch, recolour the wordmark, or add effects.

> **Vector caveat:** `logo.svg` / `logo-white.svg` set the wordmark as live `<text>` in **Satoshi** with a system-sans fallback — it matches exactly only where Satoshi is loaded. The `logo-white.png` knockout is pixel-derived from the original raster, so its letterforms are exact. The bracket mark in every file is true vector. If you need a wordmark SVG with zero font dependency, outline the text in Figma/Illustrator from the original source.

---

## 2. Colour palette

Defined as design tokens in `app/globals.css` (`@theme`).

### Core brand
| Token | Hex | Role |
|---|---|---|
| `dark-gray` | `#232A34` | Primary text, dark section backgrounds, primary-button hover |
| `slate-blue` | `#375971` | Primary buttons, links, accents, active/selected states |
| `light-slate` | `#9DB5C9` | Captions, eyebrow dots, secondary icons, muted accents |
| `light-blue` | `#E4F1F8` | Hover tints, light icon-box fills, button-on-dark hover |

### Neutrals & support
| Token | Hex | Role |
|---|---|---|
| `off-black` | `#0D0F13` | Deepest backgrounds / contrast |
| `mid-gray` | `#616568` | Body copy, labels, nav links |
| `light-gray` | `#8D8D99` | Tertiary text, dividers, placeholder copy |
| `white` | `#FFFFFF` | Card surfaces, text on dark |
| Page background | `#FAFBFC` | App body background (very light cool gray) |
| Section bg (light) | `#F4F8FB` | Alternating section background, icon-box fills |
| Hairline border | `#E8E8E8` | Footer / accordion dividers |

### Functional / status
| Purpose | Hex | Where |
|---|---|---|
| Success green (text/dot) | `#3C7A52` | Status pills (`SystemFrame`) |
| Success green bg | `#E7F3EC` | Status pill background |
| Alert / break accent | `#C9542E` | Chain-break marks (`ChainBreaks`) |

---

## 3. Typography

**Typeface:** [Satoshi](https://www.fontshare.com/fonts/satoshi) — loaded via Fontshare CDN. Weights in use: **400** (regular), **500** (medium), **700** (bold).

```
font-family: "Satoshi", sans-serif;
-webkit-font-smoothing: antialiased;
```

### Type scale (tokens)
| Role | Size / Line-height | Weight | Token |
|---|---|---|---|
| H1 | 56 / 60 px | 500 | `text-h1` |
| H2 | 44 / 52 px | 400 | `text-h2` |
| H3 (large) | 34 / 39 px | 500 | `text-h3m` |
| H3 | 26 / 31 px | 500 | `text-h3` |
| H4 | 20 / 24 px | 500 | `text-h4` |
| Paragraph 1 (large) | 20 / 30 px | 400 | `text-p1` |
| Paragraph 2 (body) | 16 / 24 px | 400 | `text-p2` |
| Paragraph 3 (small) | 14 / 22 px | 400 | `text-p3` |
| Caption / eyebrow | 11 / 16 px | 500, UPPERCASE, wide tracking | `text-caption` |

**Headings** on large viewports often clamp down on mobile, e.g. `text-[32px]` → `sm:text-[44px]`. Headings use slight negative tracking (`tracking-[-0.01em]`).

---

## 4. Layout & spacing

| Concern | Value |
|---|---|
| Content max-width (`.container-site`) | 1280 px |
| Narrow max-width (`.container-narrow`) | 1080 px |
| Horizontal gutters (responsive) | 20px (mobile) → 32px (`sm`) → 48px (`md`) → 80px (`lg`) |
| Section vertical padding | `py-24` (96px); CTA banners `py-32` |
| Card gap | `gap-6` (24px) |
| Card internal padding | `p-6` / `p-8` |

**Breakpoints** (Tailwind defaults): `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280.

**Radii:** buttons & icon-boxes `rounded-lg` (8px); cards/pills `rounded-xl` (12px); frames `rounded-2xl` (16px); eyebrow dots & status dots fully round.

---

## 5. Core UI components

### Button — `components/Button.tsx`
- Base: `inline-flex items-center gap-2 text-[16px] leading-[20px] font-medium px-6 py-[10px] rounded-lg`, 200ms transition.
- **Primary:** `bg-slate-blue text-white` → hover `bg-dark-gray`.
- **Ghost:** transparent, `border border-dark-gray text-dark-gray` → hover `bg-dark-gray text-white`.
- **On dark / photo:** override `bg-white! text-dark-gray! hover:bg-light-blue!`.
- Optional trailing `arrow` (→ chevron SVG, 12×12, 1.5 stroke).

### Header / Nav — `components/Header.tsx`
- Fixed, height **72px**, `backdrop-blur-xl`, `bg-[#FAFBFC]/85`, bottom hairline `border-black/[0.06]`.
- Nav links: 14px `mid-gray` → hover `dark-gray`. Dropdown menus: white card, `rounded-xl`, soft shadow `shadow-[0_20px_50px_-20px_rgba(35,42,52,0.4)]`, hover row `bg-light-blue text-slate-blue`.
- Actions: ghost "Client Portal" + primary "Get Started". Mobile: 3-bar hamburger, slide-down white panel.

### Footer — `components/Footer.tsx`
- White, top border `#E8E8E8`. 4-col grid (brand / nav / contact). Eyebrow headings: 11px uppercase tracked.
- Social icon buttons: `w-8 h-8 rounded-lg bg-[#F4F8FB]` with `slate-blue` stroke → hover `bg-slate-blue` white stroke (LinkedIn, Instagram, Facebook).

### Accordion row — `components/AccordionRow.tsx`
- Numbered (`01`, `02`…) via `index` prop.
- **Open:** `bg-slate-blue`, white text, white toggle box with `−`.
- **Closed:** `border-b border-[#E8E8E8]`, dark text, `#F4F8FB` toggle box with `+`.

### System frame — `components/SystemFrame.tsx`
- Branded window chrome (replaces generic macOS dots). `rounded-2xl` bordered surface, light or `dark` variant.
- Chrome bar: brand chip (slate-blue rounded square + light-blue dot), uppercase tracked label, centre breadcrumb path, right status pill with pulsing dot (`green` or `blue` tone).

### Eyebrow / section caption (pattern)
```tsx
<div className="flex items-center gap-2">
  <span className="w-[5px] h-[5px] rounded-full bg-light-slate inline-block" />
  <span className="text-[11px] uppercase tracking-widest font-medium text-light-slate">Label</span>
</div>
```
On dark backgrounds keep the same; on light sections `slate-blue` is also used for the text.

### Icon box (pattern)
- `w-12 h-12 rounded-lg` (48px). Light card: `bg-white` or `bg-[#F4F8FB]`. Active: `bg-slate-blue` with white icon strokes.

### Motion / interactive components
| Component | Purpose |
|---|---|
| `StatCounter.tsx` | Counts numbers up from 0 on scroll-into-view (1.4s cubic ease-out). |
| `ClientMarquee.tsx` | Infinite horizontal logo loop, 38s linear, pauses on hover, edge fades. |
| `ChainBreaks.tsx` | Scroll-driven "chain of custody" links snapping apart (Framer Motion). |
| `ApproachDrillIn.tsx` | Drill-in approach explainer. |
| `three/OrderField.tsx` | Ambient particle/order field (used behind CTA banner). |

**Motion principles:** subtle, scroll-triggered, ease-out; respect `prefers-reduced-motion` (marquee slows to 90s). Caret blink keyframe `1.1s step-end`.

---

## 6. Imagery

- Photography rendered via `next/image` with `fill` + `object-cover`, wrapped in `relative overflow-hidden rounded-xl` containers.
- Legibility overlay on hero/CTA photos: `bg-dark-gray/75` flat or `bg-gradient-to-r from-dark-gray/90`.
- Tone: calm, professional, muted — sits comfortably under the slate/gray palette.

---

## 7. Packaged assets

### Logo — [`assets/logo/`](./assets/logo/)
- `logo.png` — primary wordmark.

### Icon set — [`assets/icons/`](./assets/icons/) (Vuesax linear, 24×24, 1.2 stroke, `#61656B`)
`calendar` · `calendar-tick` · `chart-success` · `clipboard-tick` · `code` · `data` · `messages` · `people` · `setting-3` · `share` · `sms` · `status-up` · `status-up-1` · `task-square` · `timer` · `undo` · `user-octagon`

> Icons are single-colour strokes — recolour via `stroke` to match context (`slate-blue` on active, `mid-gray` default, white on dark).

### Client logos — [`assets/client-logos/`](./assets/client-logos/)
`betts-law-co` · `stainton-chellew` · `attune-legal` · `warlows-legal` · `palmos-legal` · + 2 unnamed. Displayed at `object-contain`, ~80% opacity on a dark ribbon.

---

## 8. Quick-reference token cheatsheet

```
/* Colours */
dark-gray   #232A34   slate-blue  #375971   light-slate #9DB5C9
light-blue  #E4F1F8   off-black   #0D0F13   mid-gray    #616568
light-gray  #8D8D99   white       #FFFFFF
page-bg     #FAFBFC   section-bg  #F4F8FB   hairline    #E8E8E8
success     #3C7A52   alert       #C9542E

/* Type */  Satoshi 400/500/700
H1 56/60·500   H2 44/52·400   H3 26/31·500   H4 20/24·500
P1 20/30   P2 16/24   P3 14/22   Caption 11/16·500·UPPER

/* Layout */ max 1280 · gutters 20→32→48→80 · radii 8/12/16
```
