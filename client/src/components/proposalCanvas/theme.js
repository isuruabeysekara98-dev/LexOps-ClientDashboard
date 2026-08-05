// ---------------------------------------------------------------------------
// The dark theme — sampled from lex-ops.io, not invented.
// ---------------------------------------------------------------------------
// Every value below was read off the live site's computed styles. The brand
// blue is literally called `bg-slate-blue` in the site's own markup, which is
// why it's named that here: if someone later diffs this against the website,
// the names should line up.
//
//   Satoshi                     the site's only typeface, headings at 500
//   #375971  slate blue         primary CTAs, active pills, status dots
//   #9DB5C9  light blue         borders, secondary fills
//   #E4F1F8 / #F4F8FB           pale panel tints
//   #232A34  ink   #616568 sub  text
//   #3C7A52  green              success
//   #FAFBFC  paper             page background
//
// GOING DARK IS NOT INVERTING. A colour that carries meaning at 60% lightness
// on white is unreadable at the same value on near-black, so each semantic hue
// has a *lifted* dark-mode twin here. The hue is preserved — the meaning rides
// on hue, not on lightness — but the value is raised until it holds against a
// dark field. `slateBlue` is the brand colour; `machine` is the same hue lifted
// for use as a bubble on the canvas. Do not swap one for the other.
//
// THIS FILE IS THE ONLY PLACE THESE VALUES LIVE. An earlier pass defined the
// dark palette here and then never imported it anywhere, so the canvas drew
// lifted dark-mode colours onto a `#FAFBFC` page while the chrome stayed on the
// deck's purple. Every surface, border and control in the living proposal now
// reads from this module. If you find yourself typing a hex literal into a
// component, it belongs here instead.
// ---------------------------------------------------------------------------

/** The website's tokens, verbatim. Light-mode source of truth. */
export const BRAND = {
  slateBlue: "#375971",
  lightBlue: "#9DB5C9",
  tint: "#E4F1F8",
  tintFaint: "#F4F8FB",
  ink: "#232A34",
  inkSub: "#616568",
  inkFaint: "#8D8D99",
  green: "#3C7A52",
  paper: "#FAFBFC",
};

/**
 * Satoshi, with the same fallback chain the site uses.
 *
 * The font is already loaded application-wide from Fontshare in
 * `client/index.html` (weights 400/500/700) and set on `html, body`, so DOM
 * chrome inherits it for free and this constant exists for the one context that
 * can't inherit: `ctx.font` on the canvas, which takes a font string and knows
 * nothing about CSS cascade. Stick to 400/500/700 here — asking for a weight
 * that isn't in that link tag gets you a synthesised, subtly wrong face.
 *
 * The stack degrades to system sans rather than to a serif, so a failed font
 * load reads as plain rather than as broken.
 */
export const FONT =
  '"Satoshi", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * The dark surface. Hue-matched to the brand blue (~205°) rather than neutral
 * grey, so the whole canvas reads as the same family as the chrome sitting on
 * it — a neutral-grey dark theme under blue chrome looks like two products.
 */
export const DARK = {
  // Surfaces, lightest-on-top order.
  bg: "#0B1219",           // the canvas itself
  bgDeep: "#070C11",       // vignette edge, behind everything
  surface: "rgba(255,255,255,0.045)",   // glass card fill
  surfaceRaised: "rgba(255,255,255,0.07)",
  surfaceActive: "rgba(55,89,113,0.55)", // an engaged control

  // The card fill. "The actual container can be a card with a certain colour" —
  // so a card is not clear glass, it's a *tinted* one: the brand blue at low
  // alpha over the dark ground. Clear glass on a near-black page reads as a
  // slightly lighter hole; a tinted card reads as an object placed on top.
  card: "rgba(55,89,113,0.20)",
  cardRaised: "rgba(55,89,113,0.30)",
  cardDeep: "rgba(9,15,21,0.72)",       // over the canvas, where contrast wins

  // "Strong light coloured border" — the light blue at real opacity, which is
  // what makes a card read as deliberate rather than as a faint outline.
  border: "rgba(157,181,201,0.34)",
  borderStrong: "rgba(157,181,201,0.55)",
  borderFaint: "rgba(157,181,201,0.16)",

  // Text. White, and the secondary tiers are white at reduced opacity rather
  // than tinted greys or slate blues.
  //
  // The tinted route is tempting on a hue-matched dark theme and it is wrong
  // here: a blue-grey secondary against a blue-tinted ground has very little
  // separation left to spend, so it reads as washed out rather than as quiet.
  // White at 74% sits back because it is *dimmer*, not because it is closer in
  // hue to the background — which also means it stays legible over the brighter
  // parts of the bloom.
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.74)",
  textFaint: "rgba(255,255,255,0.52)",

  // Semantic hues, lifted for a dark field. Hue preserved from the light system.
  machine: "#6FA8CE",      // slate blue, lifted — system / machine steps
  machineDeep: "#375971",  // the brand value, for fills behind text
  human: "#F0A93C",        // amber, lifted — a person decides here
  humanDeep: "#B06F00",
  locked: "#4FBF87",       // green, lifted — produced & locked
  pain: "#E8635A",         // red, lifted
  gold: "#FFD24A",

  // The brand blue at full strength, for primary actions, plus its hover step.
  accent: "#375971",
  accentLift: "#4A7594",
};

/** Edge/line colour on the dark canvas. */
export const DARK_LINE = "rgba(157,181,201,0.30)";

/**
 * Motion. One place, because the whole point of a motion system is that
 * unrelated things move at related speeds.
 *
 * `drift` and `breathe` are the canvas's ambient life — see `ambient()` in
 * draw.js. They are deliberately slow: a bubble that visibly travels is a click
 * target that moved, and the plan's §2b freeze rule exists precisely so targets
 * stay put. These amplitudes are sub-radius on purpose.
 */
export const MOTION = {
  driftPx: 2.6,            // ambient wander amplitude, graph units
  driftHz: 0.055,          // ~18s to come back around
  breatheHz: 0.13,         // radius shimmer, ~8s
  breatheAmp: 0.018,       // 1.8% of r — felt, not seen
  ease: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  fast: "160ms",
  base: "240ms",
  slow: "420ms",
};

/**
 * True when the reader has asked the OS for less motion. Checked at call time
 * rather than cached, so a preference changed mid-session takes effect without
 * a reload. Safe during SSR.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The glass card, dark. `backdrop-filter` stays on the chrome and never on the
 * bubbles — LIVING-PROPOSAL-PLAN.md §2b, and the reason the map holds 60fps.
 */
export const darkGlass = {
  background: DARK.card,
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.borderStrong,
  borderRadius: 14,
  boxShadow: "0 10px 34px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
  color: DARK.text,
};

// ---------------------------------------------------------------------------
// Controls — tabs, toggles, pills.
// ---------------------------------------------------------------------------
// All three share one shape on purpose: a fully-round outline that fills with
// the brand blue when engaged. The border is the *strong* light blue in both
// states, so a control never loses its edge when it turns off — an off toggle
// that fades to a hairline reads as disabled rather than as available.

/** A pill control at rest. */
export const pill = {
  padding: "6px 13px",
  font: "inherit",
  fontSize: 12.5,
  lineHeight: 1.2,
  cursor: "pointer",
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.borderStrong,
  background: "rgba(255,255,255,0.05)",
  color: DARK.textSub,
  whiteSpace: "nowrap",
  transition: `background ${MOTION.base} ${MOTION.ease}, color ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease}`,
};

/** The same pill, engaged. */
export const pillOn = {
  ...pill,
  background: DARK.accent,
  borderColor: DARK.accentLift,
  color: "#FFFFFF",
  boxShadow: "0 2px 14px rgba(55,89,113,0.55)",
};

/**
 * The amber variant, for the trust lens only. Amber means "a person decides"
 * everywhere else in this product, and the lens is the control that asks about
 * exactly that — so it is the one control allowed to break the blue scheme.
 */
export const pillHuman = {
  ...pill,
  borderColor: "rgba(240,169,60,0.55)",
  color: DARK.human,
};
export const pillHumanOn = {
  ...pillHuman,
  background: DARK.human,
  borderColor: DARK.human,
  color: "#1A1206",
  boxShadow: "0 2px 14px rgba(240,169,60,0.4)",
};

/** Primary action. The brand blue at full strength. */
export const solidDark = {
  padding: "8px 16px",
  font: "inherit",
  fontSize: 13.5,
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: 9,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.accentLift,
  background: DARK.accent,
  color: "#FFFFFF",
  transition: `background ${MOTION.base} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}`,
};

/** Secondary action. Outline only, same strong border. */
export const ghostDark = {
  padding: "8px 14px",
  font: "inherit",
  fontSize: 13.5,
  cursor: "pointer",
  borderRadius: 9,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.border,
  background: "rgba(255,255,255,0.05)",
  color: DARK.text,
  transition: `background ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease}`,
};

/** A text input on the dark ground. */
export const fieldDark = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  font: "inherit",
  fontSize: 13.5,
  borderRadius: 9,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.border,
  background: "rgba(7,12,17,0.55)",
  color: DARK.text,
  outline: "none",
};

/** The uppercase eyebrow, straight off the website's section-caption pattern. */
export const eyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DARK.textSub,
};

// ---------------------------------------------------------------------------
// Radii. Three shapes, and the middle one carries most of the product.
// ---------------------------------------------------------------------------
// `squircle` is the rounded-square the reference uses for its tab bars, rule
// cards and metric tiles — softer than a rectangle, far less flippant than a
// full pill. Pills are reserved for things you *toggle*; squircles are things
// you *read*. Keeping that distinction is most of why the reference's chrome
// looks considered rather than decorated.
export const RADIUS = { pill: 999, squircle: 16, card: 18, inner: 12 };

/**
 * Film grain, as an inline SVG data URI.
 *
 * The reference puts a soft, low-contrast photograph behind almost every dark
 * screen, and that is what stops the black reading as an empty div. Shipping a
 * photo here would mean shipping an asset, licensing it, and loading it on a
 * page that already has a canvas to paint — so this is the same *effect* built
 * procedurally: fractal noise at very low opacity, which gives the ground a
 * physical surface without a single network request.
 *
 * `baseFrequency` is high on purpose. Low frequencies produce visible clouds,
 * which read as a compression artefact on a dark field; high frequencies read
 * as grain on film.
 */
export const GRAIN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E` +
  `%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E` +
  `%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E")`;

/**
 * The atmosphere behind everything.
 *
 * Four layers, painted once by the page and never per frame:
 *   1. grain, for surface
 *   2. a warm slate bloom off the upper left
 *   3. a cool teal bloom off the lower right — the two together make the field
 *      read as lit from somewhere, which a single centred glow never does
 *   4. the base gradient
 *
 * Both blooms are *wide and weak*. A tight, bright gradient on a dark page is
 * the single most recognisable "AI-generated dark theme" tell; at this radius
 * and alpha the reader registers depth without being able to point at a light
 * source.
 */
export const atmosphere = [
  "radial-gradient(1100px 700px at 12% 8%, rgba(55,89,113,0.34) 0%, rgba(11,18,25,0) 60%)",
  "radial-gradient(900px 620px at 88% 82%, rgba(79,191,135,0.10) 0%, rgba(11,18,25,0) 58%)",
  "radial-gradient(1200px 800px at 50% 45%, rgba(55,89,113,0.16) 0%, rgba(11,18,25,0) 65%)",
  `linear-gradient(165deg, #0D1720 0%, ${DARK.bg} 45%, ${DARK.bgDeep} 100%)`,
].join(", ");

/**
 * The grain layer, as its own element rather than as a background layer on the
 * page.
 *
 * Two reasons it isn't just another entry in `atmosphere`: opacity this low is
 * the whole trick and it needs to be tunable in one number, and `soft-light`
 * has to apply to the grain *only* — as a background-blend-mode it would have
 * to be declared positionally against every gradient beneath it, which breaks
 * silently the moment someone adds a layer.
 *
 * Knocked back hard on purpose. Above roughly 5% this stops reading as film and
 * starts reading as a dirty screen.
 */
export const grainOverlay = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage: GRAIN,
  opacity: 0.035,
  mixBlendMode: "soft-light",
  zIndex: 0,
};

/** Kept for callers that want the plain field with no texture. */
export const vignette =
  `radial-gradient(1200px 780px at 50% 42%, rgba(55,89,113,0.20) 0%, rgba(11,18,25,0) 62%), ` +
  `linear-gradient(180deg, ${DARK.bg} 0%, ${DARK.bgDeep} 100%)`;

/**
 * Liquid glass — the heavier, layered version for chrome that sits *on* the
 * atmosphere rather than beside it.
 *
 * Three things separate this from a plain translucent panel, and all three are
 * doing work:
 *   · a high `saturate` on the backdrop, so the blue bloom behind the panel
 *     bleeds through as colour instead of as grey
 *   · a specular top edge (`inset 0 1px 0`), which is what makes a surface read
 *     as glass rather than as a hole
 *   · a matching inset shadow on the bottom edge, so the panel has thickness
 *
 * Still chrome-only. §2b of the plan is unchanged: `backdrop-filter` is
 * GPU-expensive per element and must never go near the bubbles.
 */
export const liquidGlass = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 40%, rgba(55,89,113,0.16) 100%)",
  backdropFilter: "blur(28px) saturate(1.8)",
  WebkitBackdropFilter: "blur(28px) saturate(1.8)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.borderStrong,
  borderRadius: RADIUS.squircle,
  boxShadow:
    "0 18px 48px rgba(0,0,0,0.55), " +
    "inset 0 1px 0 rgba(255,255,255,0.18), " +
    "inset 0 -1px 0 rgba(0,0,0,0.30)",
  color: DARK.text,
};

/**
 * The segmented control — the reference's tab bar.
 *
 * A transparent squircle track holding squircle segments, with hairline rules
 * between them. The track keeps its border at all times and the *selected*
 * segment gains a fill: the same rule as `pill`, for the same reason, which is
 * that an unselected tab losing its edge reads as disabled.
 */
export const segmentTrack = {
  display: "inline-flex",
  alignItems: "stretch",
  padding: 3,
  gap: 0,
  borderRadius: RADIUS.squircle,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: DARK.borderStrong,
  background: "rgba(7,12,17,0.55)",
  backdropFilter: "blur(22px) saturate(1.6)",
  WebkitBackdropFilter: "blur(22px) saturate(1.6)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  overflow: "hidden",
};

export const segment = {
  padding: "7px 14px",
  font: "inherit",
  fontSize: 12.5,
  lineHeight: 1.2,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: DARK.textSub,
  borderRadius: RADIUS.inner,
  whiteSpace: "nowrap",
  transition: `background ${MOTION.base} ${MOTION.ease}, color ${MOTION.base} ${MOTION.ease}`,
};

export const segmentOn = {
  ...segment,
  // Lighter than the track, not a saturated fill. The reference marks the
  // active tab by raising it out of the glass, not by colouring it in.
  background: "rgba(255,255,255,0.12)",
  color: DARK.text,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 10px rgba(0,0,0,0.35)",
};

/** The hairline between segments. */
export const segmentRule = {
  width: 1,
  alignSelf: "stretch",
  margin: "5px 0",
  background: DARK.borderFaint,
  flexShrink: 0,
};
