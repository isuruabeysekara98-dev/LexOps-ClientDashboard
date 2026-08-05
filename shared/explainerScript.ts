// ---------------------------------------------------------------------------
// The explainer compiler — free-text stages in, beat script out.
// ---------------------------------------------------------------------------
// Two ways an explainer can exist:
//
//   1. Authored. `graph.explainers` is written by hand, the way BR Legal's two
//      are. Best copy, ~30 minutes of thought each, and it does not scale.
//   2. Compiled. This file. Someone on the team authors a graph the normal way —
//      stages with free-text descriptions — and gets a playable film without
//      writing a beat script at all.
//
// Authored always wins where it exists; compiled is the floor, not the ceiling.
// That ordering is the whole design: a new proposal is never *without* an
// explainer, and a proposal that deserves better can always be given it, with
// no migration between the two states.
//
// The hard rule, inherited from `formatMetric` in proposalCanvas/units.js: this
// only ever *reduces* text the proposal already contains. It selects sentences,
// trims them at clause boundaries and orders them. It never paraphrases,
// summarises or generates a claim, because every one of these lines is read by
// a client as something their law firm said to them. If a stage has nothing
// usable to say, it is dropped from the film rather than given invented copy.
// ---------------------------------------------------------------------------

export type Beat = {
  dur: number;              // seconds
  line: string;
  sub?: string;
  focus?: string[];         // node ids lit for this beat; the rest dim
  select?: string | null;   // node whose panel opens
};

export type Explainer = {
  id: string;
  anchor: string;           // the node this explainer hangs off
  seconds: number;
  title: string;
  beats: Beat[];
  compiled?: true;          // absent on authored explainers
};

type Node = {
  id: string;
  kind?: string;
  actor?: string;
  label?: string;
  action?: string;
  stakeholder?: string[];
  description?: string | null;
  deliverable?: string | null;
  gives?: { label?: string; detail?: string }[];
};

type Edge = { from: string; to: string; kind?: string };

type Graph = {
  nodes?: Node[];
  edges?: Edge[];
  deliverables?: { id: string; label?: string; summary?: string }[];
  explainers?: Explainer[];
};

/* ------------------------------ text handling ---------------------------- */

// Abbreviations that end in a full stop and are *not* the end of a sentence.
// This list is the legal-prose one specifically — "Dept. of Immigration",
// "s.26", "sch.1", "cl. 4" all appear in the current suite, and a naive split
// on "." cuts every one of them in half.
const ABBREV = /(?:^|\s)(?:Dept|Dep|No|Nos|Co|Corp|Inc|Ltd|Pty|Pte|St|Mr|Mrs|Ms|Dr|Prof|Hon|approx|est|incl|excl|e\.g|i\.e|etc|vs|cf|s|ss|cl|sch|reg|art|para|pp|ch|Fig|Ref)\.$/i;

/**
 * First sentence of a block of free text.
 *
 * Walks to each candidate terminator and rejects it when the run of characters
 * before it is a known abbreviation, a single capital (an initial), or a digit
 * followed by a dot (a section or list number). Everything else ends a sentence.
 */
export function firstSentence(text: string): string {
  const s = String(text || "").trim().replace(/\s+/g, " ");
  if (!s) return "";

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== "." && c !== "!" && c !== "?") continue;

    // A terminator only counts when whitespace (or end of string) follows it —
    // this alone rules out "$15,000.50" and "s.26".
    const next = s[i + 1];
    if (next && next !== " ") continue;

    const head = s.slice(0, i + 1);
    if (ABBREV.test(head)) continue;             // "Dept." and friends
    if (/(?:^|\s)[A-Z]\.$/.test(head)) continue; // an initial: "J. Harrington"
    if (/\d\.$/.test(head)) continue;            // "12." — a numbered item

    return head.trim();
  }
  return s;
}

/** The sentence after the first, for the subtext slot. "" when there isn't one. */
export function secondSentence(text: string): string {
  const s = String(text || "").trim().replace(/\s+/g, " ");
  const first = firstSentence(s);
  if (!first || first.length >= s.length) return "";
  return firstSentence(s.slice(first.length).trim());
}

// Exported because the admin editor shows an author, live, whether a node's
// first sentence will actually reach the screen. Two copies of this number
// would let the form promise one thing and the compiler do another.
export const LINE_BUDGET = 78;   // the bold line — roughly what reads in one glance
const SUB_BUDGET = 92;    // the lighter second line, given a beat's full dwell

/**
 * The copy for one stage, drawn from what the stage already says.
 *
 * Preference order is the node contract's own (nodeContract.js §Q1/Q4): what
 * happens here, then what you get back. `label`/`action` is the floor — always
 * present, because the canvas needs them to caption a bubble at all.
 *
 * Sentences are taken **whole or not at all.** An earlier version trimmed the
 * over-long ones at their last clause boundary, which is what the canvas does
 * to a caption — and on prose it produced "Adviser documents live in a private,
 * access-controlled", dropping "encrypted environment dedicated to Dziura
 * Compliance Consulting". A caption cut short is a cosmetic problem; a
 * commitment cut short is a different sentence, and this one is read by a
 * client as something their firm said. So a sentence that doesn't fit is
 * declined in favour of the caption pair, which is short by construction.
 */
export function beatCopy(node: Node): { line: string; sub?: string } | null {
  const desc = String(node.description || "").trim();
  const give = node.gives?.find((g) => g?.label)?.label || "";

  // Q4 beats a second sentence of Q1: "what you get back" is what a client is
  // reading for, and it is already authored as a short phrase.
  const subFor = (rest: string) => {
    for (const c of [give, rest]) if (c && c.length <= SUB_BUDGET) return c;
    return undefined;
  };

  if (desc) {
    const one = firstSentence(desc);
    if (one && one.length <= LINE_BUDGET) {
      return { line: one, sub: subFor(secondSentence(desc)) };
    }
  }

  if (node.label) {
    return {
      line: node.action ? `${node.label} — ${node.action}` : node.label,
      sub: subFor(""),
    };
  }
  return null;
}

/* -------------------------------- timing --------------------------------- */

const MAX_SECONDS = 10;   // the cap the whole format is built around
const MIN_BEAT = 1.8;     // below this a line is gone before it is read
const MAX_BEAT = 3.2;
const WPS = 2.6;          // words per second, read silently, with a beat to land

/**
 * Give each beat the time its own copy needs, then scale the set to fit inside
 * ten seconds. Scaling rather than truncating means a four-beat film with long
 * lines gets faster, not cut short — losing the last beat loses the conclusion,
 * which is the one part that has to land.
 */
function timeBeats(beats: Beat[]): Beat[] {
  if (!beats.length) return beats;

  const raw = beats.map((b) => {
    const words = `${b.line} ${b.sub || ""}`.trim().split(/\s+/).length;
    return Math.min(MAX_BEAT, Math.max(MIN_BEAT, words / WPS));
  });

  const total = raw.reduce((a, b) => a + b, 0);
  const scale = total > MAX_SECONDS ? MAX_SECONDS / total : 1;
  return beats.map((b, i) => ({ ...b, dur: Math.round(raw[i] * scale * 10) / 10 }));
}

const seconds = (beats: Beat[]) =>
  Math.round(beats.reduce((a, b) => a + b.dur, 0) * 10) / 10;

/* ------------------------------ graph reading ---------------------------- */

const byId = (nodes: Node[]) => new Map(nodes.map((n) => [n.id, n]));

/** Successors of a node, in authored edge order. */
function nextOf(edges: Edge[], id: string): string[] {
  return edges.filter((e) => e.from === id).map((e) => e.to);
}

/**
 * The spine of a subgraph: walk from its trigger following the first successor
 * each time, preferring edges that carry work forward (`triggers`/`data`) over
 * conditional branches. This is the path a reader's eye takes across the map,
 * which is what the film has to follow to feel like it is explaining the
 * drawing rather than jumping around it.
 */
function spine(nodes: Node[], edges: Edge[]): string[] {
  if (!nodes.length) return [];
  const ids = new Set(nodes.map((n) => n.id));
  const local = edges.filter((e) => ids.has(e.from) && ids.has(e.to));

  const hasIncoming = new Set(local.map((e) => e.to));
  const start =
    nodes.find((n) => n.kind === "trigger" && !hasIncoming.has(n.id)) ||
    nodes.find((n) => !hasIncoming.has(n.id)) ||
    nodes[0];

  const path: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = start.id;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    path.push(cur);
    const outs = nextOf(local, cur);
    cur =
      outs.find((o) => local.some((e) => e.from === cur && e.to === o && e.kind !== "depends")) ||
      outs[0];
  }
  return path;
}

/* ------------------------------- compilers ------------------------------- */

/**
 * "Where the AI actually runs."
 *
 * Emitted for any graph containing a model. It is the objection that comes up
 * on every one of these proposals, in the same words, and the graph already
 * holds the answer: the deterministic step that handles the common case, the
 * model that handles the rest, and the person who adjudicates the doubt. Three
 * nodes, always the same three roles, so it generalises without being told
 * anything about the domain.
 */
function compileAiBoundary(nodes: Node[], edges: Edge[]): Explainer | null {
  const ai = nodes.find((n) => n.kind === "ai" || n.actor === "ai");
  if (!ai) return null;

  const map = byId(nodes);
  // The deterministic step feeding the model, and the human reading its output.
  const upstream = edges
    .filter((e) => e.to === ai.id)
    .map((e) => map.get(e.from))
    .find((n): n is Node => !!n && (n.kind === "step" || n.kind === "trigger"));
  const review = edges
    .filter((e) => e.from === ai.id)
    .map((e) => map.get(e.to))
    .find((n): n is Node => !!n && n.kind === "hitl");

  const chain = [upstream, ai, review].filter((n): n is Node => !!n);
  if (chain.length < 2) return null;

  const beats: Beat[] = [];
  for (const node of chain) {
    const copy = beatCopy(node);
    if (!copy) continue;
    beats.push({ dur: 0, ...copy, focus: [node.id], select: node.id });
  }
  if (beats.length < 2) return null;

  const timed = timeBeats(beats);
  return {
    id: "where-ai-runs",
    anchor: ai.id,
    title: "Where the AI actually runs",
    seconds: seconds(timed),
    beats: timed,
    compiled: true,
  };
}

/**
 * "How this runs" — one per deliverable, following its spine.
 *
 * Long spines are sampled rather than truncated: first, last, and the most
 * load-bearing stages in between, so the film always ends on the outcome. A
 * seven-node chain played in full at ten seconds gives each stage 1.4s, which
 * is under the floor at which a line can be read.
 */
function compileSpine(
  nodes: Node[],
  edges: Edge[],
  key: string,
  title: string,
): Explainer | null {
  const path = spine(nodes, edges);
  if (path.length < 3) return null;

  const map = byId(nodes);
  const MAX_BEATS = 4;

  let picked = path;
  if (path.length > MAX_BEATS) {
    // Keep the opening and the outcome; fill the middle by even spacing, which
    // reads as a summary rather than as the front of the pipeline with the end
    // chopped off.
    // Even spacing can land on the same node twice on a short path, so dedupe
    // as we go. `Array.from(new Set(...))` rather than a spread: this module is
    // compiled against a target without downlevelIteration.
    const middle: string[] = [];
    const step = (path.length - 2) / (MAX_BEATS - 2);
    for (let i = 0; i < MAX_BEATS - 2; i++) {
      const id = path[Math.round(1 + i * step)];
      if (id && middle.indexOf(id) === -1) middle.push(id);
    }
    picked = [path[0], ...middle, path[path.length - 1]];
  }

  const beats: Beat[] = [];
  for (const id of picked) {
    const node = map.get(id);
    if (!node) continue;
    const copy = beatCopy(node);
    if (!copy) continue;
    beats.push({ dur: 0, ...copy, focus: [id], select: id });
  }
  if (beats.length < 3) return null;

  const timed = timeBeats(beats);
  return {
    id: `how-${key}`,
    anchor: picked[0],
    title,
    seconds: seconds(timed),
    beats: timed,
    compiled: true,
  };
}

/**
 * Compile a graph's explainers.
 *
 * Authored wins outright — a graph carrying `explainers` is returned untouched,
 * so hand-written copy is never silently replaced by derived copy.
 *
 * Capped at three, per LIVING-PROPOSAL-PLAN.md §2b. The cap is a reading
 * decision, not a cost one: a client who is offered six films watches none.
 */
export function compileExplainers(graph: Graph): Explainer[] {
  if (graph?.explainers?.length) return graph.explainers;

  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  if (nodes.length < 3) return [];

  const out: Explainer[] = [];

  const ai = compileAiBoundary(nodes, edges);
  if (ai) out.push(ai);

  // One film per deliverable where the proposal has several — they are disjoint
  // subgraphs, so a single spine across all of them would walk a path that does
  // not exist. A single-deliverable graph gets one film over the whole thing.
  const deliverables = (graph.deliverables || []).filter((d) =>
    nodes.some((n) => n.deliverable === d.id));

  if (deliverables.length > 1) {
    for (const d of deliverables) {
      const sub = nodes.filter((n) => n.deliverable === d.id);
      const film = compileSpine(sub, edges, d.id, d.label ? `How ${d.label.toLowerCase()} runs` : "How this runs");
      if (film) out.push(film);
    }
  } else {
    const film = compileSpine(nodes, edges, "this", "How this runs");
    if (film) out.push(film);
  }

  return out.slice(0, 3);
}
