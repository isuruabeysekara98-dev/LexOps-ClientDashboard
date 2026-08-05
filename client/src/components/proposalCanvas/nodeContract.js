// ---------------------------------------------------------------------------
// The node contract — the one place the stored shape becomes rendered slots.
// ---------------------------------------------------------------------------
// LIVING-PROPOSAL-PLAN.md §2 says every node, in every project type, answers the
// same four questions:
//
//   1. What happens here?      → description  (+ the AI note, where it's a model)
//   2. Who owns it?            → actor
//   3. What do we need from you? → needs      ← the anti-template-chase payload
//   4. What do you get back?   → gives
//
// That is a contract, not a suggestion — it's invariant 3 of the four that make
// the whole thing feel like one product. So it gets exactly one implementation:
// `readNode` below. The panel, the list and the canvas caption all render what
// it returns, and none of them reaches into a raw node to pull a field out on
// its own. Add a field to the schema and it lands here first, with a decision
// about which of the four questions it answers — which is the discipline that
// stops the panel drifting into "whatever the author happened to type".
//
// Everything is total: a node missing every optional field still produces a
// valid, renderable structure with empty sections, because half these graphs
// were authored from proposals that simply don't say.
// ---------------------------------------------------------------------------
import { PALETTE } from "./language.js";

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

// What each kind actually promises the reader, in the reader's language. Shown
// under the title so a partner never has to learn our taxonomy to use the map.
const KIND_GLOSS = {
  trigger: "This is what sets the work off.",
  step: "This runs without anyone touching it.",
  ai: "A model does this, inside limits set below.",
  hitl: "A person decides here — this one does not run itself.",
  gate: "The path splits here, on a rule you set.",
  artifact: "Something is produced here that you keep.",
  system: "A system you already run. We connect to it; we don't replace it.",
};

const CONFIDENCE_GLOSS = {
  committed: null,                                   // the default — say nothing
  scoped: "Scoped, not yet committed — the shape is agreed, the detail isn't.",
  exploratory: "Exploratory — included to show the direction, not yet costed.",
};

/** A need counts as answered when it carries a value or a file. */
export const isAnswered = (input) =>
  !!input && (input.file_path != null || (input.value != null && String(input.value).trim() !== ""));

/**
 * Read one stored node into the four questions, plus the qualifiers that hang
 * off them.
 *
 * `inputFor(nodeId, needId)` is injected rather than imported so this stays a
 * pure function of the graph and the answers — it's used by the canvas, which
 * has no idea the input store exists.
 */
export function readNode(node, inputFor = () => null) {
  if (!node) return null;

  const kind = node.kind || "step";
  const actor = node.actor || "system";
  const isHuman = kind === "hitl" || kind === "gate" || actor === "human_client" || actor === "human_lexops";
  const isAi = kind === "ai" || actor === "ai";

  // Q3. Needs carry their own answer state, so nothing downstream has to join
  // the two back together — that join getting done twice, differently, is how a
  // progress count and a field indicator end up disagreeing.
  const needs = (node.needs || []).map((need) => {
    const input = inputFor(node.id, need.id);
    return {
      ...need,
      type: need.type || "text",
      required: need.required !== false,
      input,
      answered: isAnswered(input),
      key: `${node.id}::${need.id}`,
    };
  });

  const openRequired = needs.filter((n) => n.required && !n.answered).length;

  return {
    id: node.id,
    raw: node,

    // Identity — the title block.
    //
    // `label` is the *thing* (1–3 words) and `action` is what it does (2–4),
    // captioned the way n8n and make.com caption a module. The pair is the unit:
    // "Voice agent / Transcribe & interpret" reads in one pass where "Per-language
    // voice agent" makes the eye stop. Graphs authored before `action` existed
    // still render — they just get one line.
    label: node.label || node.id,
    action: node.action || null,
    // Platforms, the human in the loop, the system of record — whoever and
    // whatever this step actually touches. Drives the caption subtext on the
    // map, and answers "who's involved" without opening anything.
    stakeholder: node.stakeholder || [],
    kind,
    kindLabel: KIND_LABEL[kind] || kind,
    kindGloss: KIND_GLOSS[kind] || null,
    cluster: node.cluster || null,
    deliverable: node.deliverable || null,
    scenarios: node.scenarios || [],

    // Q1 — what happens here.
    description: node.description || null,

    // Q2 — who owns it.
    actor,
    actorLabel: ACTOR_LABEL[actor] || actor,
    isHuman,
    isAi,

    // Q3 — what we need from you.
    needs,
    openRequired,
    hasOpenNeeds: openRequired > 0,

    // Q4 — what you get back.
    gives: (node.gives || []).filter((g) => g && g.label),

    // Qualifiers. Assumptions are the honesty valve — a node with none is
    // claiming certainty, so they render even when the list is short.
    assumptions: (node.assumptions || []).filter(Boolean),
    value: node.value?.amount != null ? node.value : null,
    confidence: node.confidence || "committed",
    confidenceGloss: CONFIDENCE_GLOSS[node.confidence] ?? null,

    // The accent every surface uses for this node. Amber wherever a person is
    // still on the hook, which is the question the whole map exists to answer.
    tone: isHuman ? PALETTE.amber : isAi ? PALETTE.primary : PALETTE.primaryLight,
  };
}

/**
 * The caption the canvas draws. Kept here rather than in `draw.js` so the map
 * and the panel can never disagree about what a node is called.
 */
export function nodeCaption(node) {
  return node?.label || node?.id || "";
}
