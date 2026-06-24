# LexOps — Components & CSS Guide

Reusable building blocks for the LexOps website, packaged so you can drop them
into new pages with consistent styling. Pairs with
[`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) (colour/type/spacing reference).

```
brand-guidelines/
├─ tokens.json               ← design tokens as data (framework-agnostic)
├─ css/
│  ├─ globals.css            ← Tailwind v4 tokens (@theme) + container/utility classes
│  └─ tokens.css             ← same tokens as plain CSS vars (no Tailwind needed)
└─ components/
   ├─ Button.tsx             ├─ AccordionRow.tsx     ├─ SystemFrame.tsx
   ├─ Header.tsx             ├─ Footer.tsx           ├─ CtaBanner.tsx
   ├─ StatCounter.tsx        ├─ ClientMarquee.tsx    ├─ ChainBreaks.tsx
   ├─ ApproachDrillIn.tsx    └─ three/OrderField.tsx
```

---

## 1. Setup — what these components need

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript.

| Dependency | Used by | Install |
|---|---|---|
| `tailwindcss` v4 + `@tailwindcss/postcss` | all (utility classes + tokens) | required |
| `framer-motion` ^12 | `ChainBreaks`, `ApproachDrillIn` | `npm i framer-motion` |
| `three` ^0.184 + `@types/three` | `OrderField`, `CtaBanner` | `npm i three @types/three` |
| `next/image`, `next/link` | `Header`, `Footer`, `CtaBanner`, `ClientMarquee` | built into Next |

### Required CSS
1. Copy [`css/globals.css`](./css/globals.css) into your app and `@import` it once at the root (e.g. `app/layout.tsx`). It defines **all colour tokens, the type scale, and the `.container-site` / `.container-narrow` utilities** the components reference — without it, classes like `bg-slate-blue`, `text-h1`, and `container-site` won't resolve.
2. Load **Satoshi** (the components assume it). In your root layout `<head>`:
   ```html
   <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
   ```
3. Tailwind v4 reads tokens from the `@theme` block in `globals.css` — no `tailwind.config.js` colour map needed. Tokens become utilities automatically (`--color-slate-blue` → `bg-slate-blue` / `text-slate-blue`).

> **Note on Tailwind v4 `!` syntax:** components use the trailing-bang form (`bg-white!`) for overrides on dark backgrounds — this is the v4 important modifier. Keep it if you stay on v4.

---

## 2. globals.css — what's inside

| Block | Provides |
|---|---|
| `@theme` colours | `dark-gray`, `slate-blue`, `light-slate`, `light-blue`, `off-black`, `mid-gray`, `light-gray`, `white` |
| `@theme` type scale | `text-h1…h4`, `text-p1…p3`, `text-caption` (size + line-height pairs) |
| `@theme` font | `--font-satoshi` |
| `@layer base` | sets body to Satoshi, `dark-gray` text, `#FAFBFC` background, antialiasing |
| `@layer utilities` | `.container-site` (1280 max, responsive 20→32→48→80 gutters), `.container-narrow` (1080 max) |
| keyframes | `caret-blink` → `.animate-caret` (typing caret) |

This single file is the source of truth — change a token here and every component updates.

---

## 3. Component reference (props & usage)

### `Button` — primary CTA
```tsx
<Button href="/contact" variant="primary" arrow>Audit your process</Button>
<Button onClick={fn} variant="ghost">Learn more</Button>
```
| Prop | Type | Default |
|---|---|---|
| `href` | string | — (renders `<Link>`; omit → `<button>`) |
| `onClick` | () => void | — |
| `variant` | `"primary" \| "ghost"` | `primary` |
| `arrow` | boolean | `false` (trailing → chevron) |
| `className` | string | — (use `bg-white! text-dark-gray!` on dark bg) |

### `Header` — fixed site nav
Self-contained. **Edit the in-file `navLinks` array**, `CLIENT_PORTAL_URL`, and `GET_STARTED_URL` constants to repoint. Handles desktop dropdowns + mobile slide-down menu. No props.

### `Footer` — site footer
Self-contained: brand blurb, `FOOTER_NAV` array, contact details, social SVG icons. Edit the in-file constants. No props.

### `AccordionRow` — numbered expandable row
```tsx
{items.map((it, i) => (
  <AccordionRow key={i} index={i} label={it.q} content={it.a} defaultOpen={i === 0} />
))}
```
| Prop | Type | Notes |
|---|---|---|
| `label` | string | row heading |
| `content` | string | revealed body (optional) |
| `index` | number | renders `01`, `02`… (optional) |
| `defaultOpen` | boolean | start expanded |

### `SystemFrame` — branded window chrome
Wrap any UI mockup to give it the LexOps console frame (brand chip, breadcrumb path, status pill).
```tsx
<SystemFrame label="LexOps · Intake" path="matter / will-poa" status="Live" statusTone="green" dark>
  {/* your content */}
</SystemFrame>
```
| Prop | Type | Default |
|---|---|---|
| `label` | string | — (eyebrow next to brand chip) |
| `path` | string | — (centre breadcrumb) |
| `status` | string | — (right pill; omit to hide) |
| `statusTone` | `"green" \| "blue"` | `green` |
| `dark` | boolean | `false` |

### `CtaBanner` — full-bleed photo CTA
Photo background + dark overlay + ambient `OrderField` + heading/subtitle/button. All props optional (sensible defaults baked in).
```tsx
<CtaBanner title="…" subtitle="…" cta="Audit your process" overlap />
```
> Depends on `three` (renders `OrderField`) and a background image at `/image2.png` — swap the `Image src` for your own.

### `StatCounter` — count-up number
```tsx
<StatCounter value="6+" className="text-h1 font-medium" />
<StatCounter value="Top 5%" />   // preserves prefix/suffix
```
Animates the numeric part from 0 on scroll-into-view. Non-numeric values render as-is.

### `ClientMarquee` — infinite logo strip
Edit the in-file `logos` array (paths under `/clients/`). Loops at 38s, pauses on hover, slows for reduced-motion. Designed to sit on a **dark ribbon** (`bg-dark-gray`). No props.

### `ChainBreaks` — scroll-driven "chain of custody"
```tsx
<ChainBreaks items={[{ title: "…", description: "…" }, …]} />
```
Forged chain whose links snap apart one per scroll step. Section height scales with item count (`(n+1) * 58vh`). Needs `framer-motion`.

### `ApproachDrillIn` — phased drill-in explainer
```tsx
<ApproachDrillIn phases={[{ n: "Phase 01", t: "Discovery", b: "…", deep: { blurb, steps: [], deliverables: [] } }]} />
```
Isometric glass plates; selecting a phase zooms into a detail card (steps + deliverables). Needs `framer-motion`.

### `three/OrderField` — signature particle scene
The brand's hero motif: scattered particles resolve into a structured grid.
| Mode | Behaviour |
|---|---|
| `external` | order driven by `progressRef` (0–1), e.g. scroll |
| `auto` | orders itself once in view, then breathes |
| `ambient` | hovers half-formed forever (background texture) |
Key props: `mode`, `fieldCount`, `ambientCount`, `rows`, `opacity`, `lanes`, `yOffset`. Needs `three`.

---

## 4. Building a new page — recipe

```tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CtaBanner from "@/components/CtaBanner";

export default function Page() {
  return (
    <>
      <Header />
      <main className="pt-[72px]">           {/* clear the fixed 72px header */}
        <section className="container-site py-24">
          {/* eyebrow caption pattern */}
          <div className="flex items-center gap-2">
            <span className="w-[5px] h-[5px] rounded-full bg-light-slate inline-block" />
            <span className="text-caption uppercase tracking-widest font-medium text-light-slate">Section</span>
          </div>
          <h2 className="text-h2 mt-4">Heading</h2>
          {/* …content using tokens: bg-slate-blue, text-mid-gray, rounded-xl, gap-6… */}
        </section>
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
```

**Conventions to keep it on-brand:**
- Alternate section backgrounds: white ↔ `#F4F8FB` (`bg-[#F4F8FB]`) ↔ `bg-dark-gray` for dark breaks.
- Always use the eyebrow caption above headings.
- Photos → `next/image` `fill object-cover` in `relative overflow-hidden rounded-xl`.
- Radii ladder: `rounded-lg` (buttons/icons) · `rounded-xl` (cards) · `rounded-2xl` (frames).
- Respect `prefers-reduced-motion` for any new motion.
```
