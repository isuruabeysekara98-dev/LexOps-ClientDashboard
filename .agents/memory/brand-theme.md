---
name: LexOps brand theme
description: June 2026 rebrand — official brand colors, font, and where to apply them
---

## Font
- **Satoshi only** (Fontshare CDN). Weights: 400 / 500 / 700.
- Loaded in `client/index.html` via `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap`
- No Playfair Display. No Inter. Any future heading just uses `fontWeight: 600–700` in Satoshi.

## Colour tokens (from `attached_assets/brand_guidelines/brand-guidelines/css/tokens.css`)
| Name | Hex | Use |
|------|-----|-----|
| dark-gray | `#232A34` | Primary text (`t.text`), dark backgrounds, hover |
| slate-blue | `#375971` | Accent/CTA (`t.accent`), buttons, active states |
| light-slate | `#9DB5C9` | Captions, muted icons, metadata (`t.textMeta`) |
| light-blue | `#E4F1F8` | Hover tints, surfaceHigh (`t.surfaceHigh`) |
| mid-gray | `#616568` | Body copy, labels (`t.textSub`) |
| page-bg | `#FAFBFC` | App body background |
| section-bg | `#F4F8FB` | Surface fills (`t.surface`) |
| hairline | `#E8E8E8` | Borders (`t.border`) |
| success | `#3C7A52` | Done/green states (`t.green`) |
| success-bg | `#E7F3EC` | Green pill backgrounds (`t.greenSoft`) |
| alert | `#C9542E` | Error/alert (`t.red`) |

## warmTheme (Dashboard.jsx single source of truth)
```js
const warmTheme = {
  bg:"#FFFFFF", surface:"#F4F8FB", surfaceHigh:"#E4F1F8",
  border:"#E8E8E8", text:"#232A34", textSub:"#616568", textDim:"rgba(35,42,52,0.38)",
  accent:"#375971", accentLight:"#232A34", accentSoft:"rgba(55,89,113,0.08)",
  green:"#3C7A52", greenSoft:"#E7F3EC",
  amber:"#D97706", amberSoft:"rgba(217,119,6,0.08)",
  red:"#C9542E", redSoft:"rgba(201,84,46,0.08)",
  purple:"#7C3AED", purpleSoft:"rgba(124,58,237,0.08)",
  shadow:"0 1px 4px rgba(35,42,52,0.08)",
  glassSurface:"rgba(244,248,251,0.80)", goldGlow:"#375971",
};
```
Mirrored (as `const t = {...}`) in `LoginPage.jsx`, `SetPasswordPage.jsx`, `ProposalPage.jsx`.

## Logo SVGs
- Light backgrounds → `LogoDark` SVG (dark-gray `#232A34` + slate-blue `#375971` bracket)
- Dark backgrounds → `LogoLight` SVG (white + light-slate bracket)
- Brand assets in `client/public/` (logo.svg, logo-white.svg, favicon.ico, favicon.svg, etc.)

## CSS variables (index.css)
All Tailwind CSS vars use HSL format (H S% L%):
- `--primary: 205 35% 33%` = slate-blue
- `--background: 210 17% 98%` = page-bg
- `--foreground: 215 20% 17%` = dark-gray
- `--border: 0 0% 91%` = hairline

**Why:** Official brand guidelines delivered June 2026 via zip. Replaces the previous teal (#1A6666) + Playfair Display theme completely.

**How to apply:** When adding new UI components, pull colors from `t.accent`, `t.text`, `t.surface`, etc. rather than hardcoding. For font, always `fontFamily: "'Satoshi', sans-serif"` or just inherit.
