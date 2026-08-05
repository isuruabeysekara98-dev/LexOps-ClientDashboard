// ---------------------------------------------------------------------------
// The visual language — inherited verbatim, not reinvented.
// ---------------------------------------------------------------------------
// Source of truth:
//   `4. Proposal generator/.claude/skills/create-proposal/references/visual-language.md`
//   `4. Proposal generator/ts2-proposal-creator/static/css/variables.css`
//
// This is what makes the PDF and the portal read as one product. If the deck's
// palette changes, change it here — do not let the two drift.
// ---------------------------------------------------------------------------

// The map now renders dark, on the website's own slate-blue family (see
// `theme.js`, sampled from lex-ops.io). The *meanings* are unchanged and must
// stay that way — amber is still "a person decides", green is still "produced
// and locked", red is still pain. Only the values moved, lifted so each hue
// holds against a near-black field instead of white.
//
// `primary` is the machine colour and is now slate blue rather than the deck's
// purple. That is a deliberate divergence: the deck prints on white paper where
// #633dc0 reads correctly, and the portal is a dark screen where it does not.
// The hue that carries "LexOps" across both is the website's, not the PDF's.
export const PALETTE = {
  primary: "#6FA8CE",       // system / structure / machine steps — slate blue, lifted
  primaryLight: "#9DB5C9",  // system anchors, muted
  amber: "#F0A93C",         // HUMAN JUDGEMENT — a person decides here
  amberDark: "#B06F00",
  red: "#E8635A",           // pain — problems, manual burden
  green: "#4FBF87",         // safe / aligned / locked down
  gold: "#FFD24A",          // emphasis
  ink: "#FFFFFF",           // text *on* the dark canvas
  inkSub: "rgba(255,255,255,0.74)",
  paper: "#0B1219",         // the dark surface itself
  line: "rgba(157,181,201,0.30)",
};

/**
 * Colour is driven by `actor`, per the plan: purple machine, amber human.
 * `kind` refines it — a locked artifact goes green because it is a thing that
 * is now safe, and pain nodes go red. Everything else inherits from the actor.
 */
export function colourFor(node) {
  if (node.kind === "artifact") {
    return node.confidence === "committed" ? PALETTE.green : PALETTE.primaryLight;
  }
  if (node.kind === "hitl" || node.kind === "gate") return PALETTE.amber;
  if (node.pain) return PALETTE.red;

  switch (node.actor) {
    case "human_client":
    case "human_lexops":
      return PALETTE.amber;
    case "ai":
      return PALETTE.primary;
    case "system":
    default:
      return node.kind === "system" ? PALETTE.primaryLight : PALETTE.primary;
  }
}

/** Confidence drives opacity — committed reads solid, exploratory reads faint. */
export function alphaFor(node) {
  if (node.kind === "system") return 0.42;      // anchors sit back; bubbles orbit them
  switch (node.confidence) {
    case "exploratory": return 0.55;
    case "scoped": return 0.78;
    default: return 1;
  }
}

// Base radii by kind, in graph units. `value.amount` scales on top of this, so a
// proposal that declares no values still produces a readable, varied map.
const BASE_RADIUS = {
  system: 46,
  trigger: 22,
  step: 26,
  ai: 30,
  hitl: 28,
  gate: 26,
  artifact: 27,
};

/**
 * Bubble size = declared value, where a value is declared.
 * sqrt so that area (not radius) tracks the number — a 4x value should look 4x
 * as big, not 16x. Nodes with no value fall back to their kind's base radius,
 * which is why an unvalued graph still has visual grammar.
 */
// Authored emphasis — three choices, a judgement call, no arithmetic to defend.
// This is deliberately *not* derived from `steps_eliminated`: the number says
// how much work goes away, the size says how much this matters, and those are
// not the same claim. A one-step change can be the whole point of the build.
const SIZE_SCALE = { small: 0.8, medium: 1, large: 1.34 };

export function radiusFor(node) {
  const base = BASE_RADIUS[node.kind] ?? 26;

  const scale = SIZE_SCALE[node.size];
  if (scale) return base * scale;

  // Legacy path: graphs authored before `size` existed sized on `value.amount`.
  // Kept so those maps don't silently flatten to uniform circles.
  const amount = node.value?.amount;
  if (typeof amount !== "number" || amount <= 0) return base;
  return base * (0.75 + Math.sqrt(amount) * 0.16);
}

export const KIND_LABEL = {
  trigger: "Trigger",
  step: "Step",
  ai: "AI",
  hitl: "Human checkpoint",
  gate: "Decision",
  artifact: "Output",
  system: "System",
};

export const ACTOR_LABEL = {
  system: "System",
  ai: "AI",
  human_client: "Your team",
  human_lexops: "LexOps",
};
