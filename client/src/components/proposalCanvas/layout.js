// ---------------------------------------------------------------------------
// Force layout — one renderer, three presets.
// ---------------------------------------------------------------------------
// The whole argument of LIVING-PROPOSAL-PLAN.md §2 Problem A is that the
// difference between a workflow proposal and an API proposal is *forty lines of
// layout config*, not three products. This file is those forty lines.
//
//   pipeline  dependency depth left→right (the n8n / make.com reading),
//             scenario divergence up→down. "a matter travels through this"
//   topology  systems as anchors, everything else orbits what it connects to.
//             "these systems, these connections"
//   program   swimlanes (deliverable) × phases (cluster). "who does what, when"
//
// TWO AXES, TWO MEANINGS — this is the part to protect:
//
//   X = how far through the work you are. Computed from the edges (longest path
//       from a source), not from the authored `cluster` order, so the map cannot
//       disagree with the graph it is drawn from.
//
//   Y = which scenarios still lie ahead of you. The trunk — where every case
//       type passes through — runs down the middle. The further a node sits from
//       the centre line, the narrower the set of scenarios that flow through it.
//       A node that only exists for "testamentary trust" sits at the edge.
//
// EVERYTHING IS DETERMINISTIC. Positions are seeded from a hash of the node id,
// never Math.random(). A partner who opens the link on Tuesday and again on
// Thursday must see the same map; a map that rearranges itself reads as
// instability in the thing being sold.
// ---------------------------------------------------------------------------
import {
  forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY,
} from "d3-force";
import { radiusFor } from "./language.js";

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
/** FNV-1a → a stable [0,1) per node id. Replaces Math.random() everywhere. */
function seedOf(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Stable ordering: values appear in the order the graph first mentions them. */
function orderOf(nodes, key) {
  const seen = [];
  for (const n of nodes) {
    const v = n[key];
    if (v != null && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

function bands(count, span, pad) {
  if (count <= 1) return [span / 2];
  const usable = span - pad * 2;
  return Array.from({ length: count }, (_, i) => pad + (usable * i) / (count - 1));
}

// ---------------------------------------------------------------------------
// X — dependency depth, the n8n reading
// ---------------------------------------------------------------------------
/**
 * Longest path from any source. Kahn's algorithm, with a fallback pass so a
 * cycle (which a proposal graph shouldn't have, but might) degrades to a
 * sensible depth instead of hanging or vanishing.
 */
export function computeDepths(nodes, edges) {
  const depth = new Map(nodes.map((n) => [n.id, 0]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  const out = new Map(nodes.map((n) => [n.id, []]));

  for (const e of edges) {
    if (!depth.has(e.from) || !depth.has(e.to) || e.from === e.to) continue;
    out.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }

  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const settled = new Set();
  while (queue.length) {
    const id = queue.shift();
    settled.add(id);
    for (const next of out.get(id)) {
      depth.set(next, Math.max(depth.get(next), depth.get(id) + 1));
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }

  // Anything left sits in a cycle: place it one past its deepest settled parent.
  for (const n of nodes) {
    if (settled.has(n.id)) continue;
    const parents = edges.filter((e) => e.to === n.id && settled.has(e.from));
    depth.set(n.id, parents.length ? Math.max(...parents.map((e) => depth.get(e.from))) + 1 : 0);
  }
  return depth;
}

// ---------------------------------------------------------------------------
// Y — scenario divergence
// ---------------------------------------------------------------------------
/**
 * For each node, the set of scenarios reachable from it (its own plus every
 * descendant's). Fixpoint iteration rather than a reverse topological sort, so
 * cycles can't break it — at these graph sizes the cost is irrelevant.
 */
export function downstreamScenarios(nodes, edges) {
  const scen = new Map(nodes.map((n) => [n.id, new Set(n.scenarios || [])]));
  const out = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) if (out.has(e.from) && scen.has(e.to)) out.get(e.from).push(e.to);

  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const n of nodes) {
      const mine = scen.get(n.id);
      const before = mine.size;
      for (const next of out.get(n.id)) for (const s of scen.get(next)) mine.add(s);
      if (mine.size !== before) changed = true;
    }
    if (!changed) break;
  }
  return scen;
}

/**
 * Turn those sets into vertical offsets.
 *
 * A node whose downstream covers every scenario (or names none at all) is on the
 * trunk and sits on the centre line. Everything else is on a branch, and the
 * fewer scenarios it carries the further out it sits — so the map fans open
 * exactly where the work actually diverges.
 *
 * Branches alternate above and below the centre in scenario order, so the same
 * case type is always on the same side.
 */
export function scenarioOffsets(nodes, edges, declaredScenarios) {
  const order = declaredScenarios?.length
    ? declaredScenarios.map((s) => (typeof s === "string" ? s : s.id))
    : [...new Set(nodes.flatMap((n) => n.scenarios || []))];

  const offsets = new Map(nodes.map((n) => [n.id, 0]));
  if (!order.length) return { offsets, order, lanes: 0 };

  const scen = downstreamScenarios(nodes, edges);
  const total = order.length;
  const depth = computeDepths(nodes, edges);

  const parentsOf = new Map(nodes.map((n) => [n.id, []]));
  const childrenOf = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (!offsets.has(e.from) || !offsets.has(e.to) || e.from === e.to) continue;
    parentsOf.get(e.to).push(e.from);
    childrenOf.get(e.from).push(e.to);
  }

  /** Position in the scenario order — decides which side of the trunk a branch takes. */
  const firstIndex = (id) => {
    let min = Infinity;
    for (const s of scen.get(id)) {
      const i = order.indexOf(s);
      if (i >= 0 && i < min) min = i;
    }
    return min === Infinity ? -1 : min;
  };
  const breadth = (id) => scen.get(id).size / total;   // 1 = every case type still ahead

  // A child branches when it carries a strictly narrower, non-empty set than its
  // parent. A child carrying nothing is a trunk continuation — the flow simply
  // proceeds, so it must not be pushed off the line.
  const branches = (parentId, childId) => {
    const c = scen.get(childId).size;
    return c > 0 && c < scen.get(parentId).size;
  };

  const sortKids = (ids) =>
    [...ids].sort((a, b) => firstIndex(a) - firstIndex(b) || a.localeCompare(b));

  // Independent chains get their own lane. BR Legal runs two outcomes side by
  // side; overlapping them would read as one flow with a fork that isn't there.
  const sources = sortKids(nodes.filter((n) => !parentsOf.get(n.id).length).map((n) => n.id));
  sources.forEach((id, i) => {
    offsets.set(id, sources.length > 1 ? (i - (sources.length - 1) / 2) * 2.2 : 0);
  });

  const depths = [...new Set(nodes.map((n) => depth.get(n.id)))].sort((a, b) => a - b);
  for (const d of depths) {
    for (const n of nodes) {
      if (depth.get(n.id) !== d) continue;
      const parents = parentsOf.get(n.id);
      if (!parents.length) continue;                    // a source, already placed

      // Where each parent would put this node: on the parent's own line, plus a
      // fan if this node is one of several diverging children.
      const proposals = parents.map((p) => {
        const kids = sortKids(childrenOf.get(p));
        const fanning = kids.filter((k) => branches(p, k));
        if (!branches(p, n.id) || !fanning.length) return offsets.get(p);
        const i = fanning.indexOf(n.id);
        const rank = Math.floor(i / 2) + 1;             // 1st pair, 2nd pair, …
        const side = i % 2 === 0 ? 1 : -1;              // alternate around the parent
        const narrowing = 1 - breadth(n.id);            // narrower ⇒ further out
        return offsets.get(p) + side * rank * (0.55 + narrowing * 0.7);
      });

      // A node that carries no scenarios is back on the trunk, so it follows its
      // most trunk-ward parent rather than averaging out into the middle of a
      // fan. This is what lets a branch rejoin the main line cleanly.
      offsets.set(
        n.id,
        scen.get(n.id).size === 0
          ? proposals.reduce((best, v) => (Math.abs(v) < Math.abs(best) ? v : best))
          : proposals.reduce((a, b) => a + b, 0) / proposals.length
      );
    }
  }

  const lanes = new Set([...offsets.values()].map((v) => v.toFixed(2))).size;
  return { offsets, order, lanes };
}

// ---------------------------------------------------------------------------
// Caption width budgets
// ---------------------------------------------------------------------------
// The renderer draws a two-line caption centred under each bubble and trims it
// to `labelWidth`. Deciding that number is a *layout* question, not a rendering
// one — it depends entirely on where the neighbours landed — so it lives here
// and drawLabel() only measures against it.
//
// These constants mirror drawLabel() in draw.js. If the caption grows a third
// line or moves off centre, they move with it.
const CAPTION_TOP_GAP = 6;      // the caption starts r + 6 below the centre
const CAPTION_BLOCK = 2.07;     // 1.25em down to the second baseline, + 0.82em of subtext

// Captions are drawn at a fixed *screen* size, so they occupy more graph space
// the further the reader zooms out. Budgets are computed once, in graph units,
// so the band has to be measured at a pulled-back reading — a pair that only
// clears at 1:1 would start colliding the moment someone zoomed out. k = 0.5 is
// roughly where the viewport fitter lands a pipeline graph.
//
// Measured, not guessed: 1/0.4 was tried, on the argument that drawLabel() goes
// on captioning down to about k = 0.4. It clamps nearly every `topology` node to
// LABEL_MIN — a whole map of "Sche…" at the zoom people actually read it at —
// and still doesn't clear the last two pairs, which are floored by LABEL_MIN
// rather than by the band. Not a trade worth making for a zoom the reader
// passes through on the way somewhere.
const CAPTION_ZOOM = 1 / 0.5;

const LABEL_MIN = 88;           // below this a caption stops being able to say anything
const LABEL_MAX = 240;          // and a lone node still doesn't get a paragraph
const LABEL_GUTTER = 14;        // clear air between two captions that both max out

/** Caption font size in graph units at 1:1 — mirrors drawLabel(). */
const captionSize = (n) => Math.max(11, Math.min(14, n.r * 0.42));

/**
 * How much horizontal room each caption owns, derived from where the nodes
 * actually landed.
 *
 * Captions are centred on their bubble, so a caption can only ever collide with
 * one whose vertical band overlaps its own — a node a row down is no constraint
 * on it however long its stakeholder list runs. Among the nodes that *do* share
 * a band, only the nearest one left or right matters, and the pair splits the
 * distance between their centres: because both are centred, a caption as wide
 * as the full centre-to-centre distance still only reaches halfway across.
 *
 * That is the whole fix. The budget used to be a flat multiple of the global
 * column gap, which was wrong twice over — blind to where the neighbours were
 * (nodes on different rows were capped as if they sat side by side), and 30%
 * wider than the half of the gap a node in a pair actually owns. The second is
 * what produced "Language seleVoice agent".
 *
 * Must run *after* the simulation settles: y is what decides who competes with
 * whom, and y means nothing until the forces have relaxed.
 *
 * O(n²), run once per settle rather than per frame. 150 nodes is 22k distance
 * comparisons — far inside one frame, and it never happens again.
 *
 * Deterministic: a pure function of the settled positions, and `min` over the
 * neighbours doesn't care what order they arrive in.
 */
export function assignLabelWidths(simNodes) {
  const count = simNodes.length;
  const top = new Array(count);
  const bottom = new Array(count);
  for (let i = 0; i < count; i++) {
    const n = simNodes[i];
    top[i] = n.y + n.r + CAPTION_TOP_GAP;
    bottom[i] = top[i] + captionSize(n) * CAPTION_BLOCK * CAPTION_ZOOM;
  }

  for (let i = 0; i < count; i++) {
    let nearest = Infinity;
    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      if (top[i] >= bottom[j] || top[j] >= bottom[i]) continue;   // different rows: can't collide
      const dx = Math.abs(simNodes[i].x - simNodes[j].x);
      if (dx < nearest) nearest = dx;
    }
    // A node with the row to itself gets the maximum, not the horizon — an
    // uncapped caption is how one long stakeholder list swamps a whole map.
    simNodes[i].labelWidth = nearest === Infinity
      ? LABEL_MAX
      : Math.max(LABEL_MIN, Math.min(LABEL_MAX, nearest - LABEL_GUTTER));
  }
  return simNodes;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------
export function buildSimulation(nodes, edges, preset, width, height, scenarios) {
  const depths = computeDepths(nodes, edges);
  const maxDepth = Math.max(0, ...depths.values());
  const { offsets, order: scenarioOrder } = scenarioOffsets(nodes, edges, scenarios);

  const clusters = orderOf(nodes, "cluster");
  const lanes = orderOf(nodes, "deliverable");

  // Columns are evenly spaced and wide enough for the biggest bubble plus its
  // label, so the n8n reading survives a dense graph.
  const colGap = Math.max(150, Math.min(230, (width - 120) / Math.max(1, maxDepth)));
  const colX = (d) => 70 + d * colGap;
  const laneGap = Math.max(64, Math.min(104, height / 5.5));

  const simNodes = nodes.map((n) => {
    const d = depths.get(n.id) ?? 0;
    const offset = offsets.get(n.id) ?? 0;
    // Deterministic jitter: enough to break perfect ties, identical every load.
    const jitter = (seedOf(n.id) - 0.5) * 26;
    return {
      id: n.id,
      r: radiusFor(n),
      src: n,
      depth: d,
      // Provisional. The real budget comes from assignLabelWidths(), which the
      // caller runs once the simulation has settled — a caption competes with
      // whoever ends up beside it, and nothing here knows that yet. `colGap`
      // would be the wrong answer anyway: it only means anything for `pipeline`.
      labelWidth: LABEL_MAX,
      targetY: height / 2 + offset * laneGap + jitter,
      x: colX(d),
      y: height / 2 + offset * laneGap + jitter,
    };
  });

  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const simLinks = (edges || [])
    .filter((e) => byId.has(e.from) && byId.has(e.to))
    .map((e) => ({ source: byId.get(e.from), target: byId.get(e.to), kind: e.kind, volume: e.volume }));

  const sim = forceSimulation(simNodes)
    .force("collide", forceCollide((d) => d.r + 12).strength(0.9))
    .alphaDecay(0.045)
    .velocityDecay(0.45);

  if (preset === "topology") {
    // Systems are anchors; everything else is pulled toward what it connects to,
    // so subsystems form visible constellations rather than one blob.
    const systems = simNodes.filter((n) => n.src.kind === "system");
    const systemX = bands(systems.length, width, width * 0.28);
    systems.forEach((s, i) => { s.fx = systemX[i]; s.fy = height / 2; });

    const anchorOf = new Map();
    for (const l of simLinks) {
      if (l.source.src.kind === "system") anchorOf.set(l.target.id, l.source);
      if (l.target.src.kind === "system") anchorOf.set(l.source.id, l.target);
    }
    // Seed off-centre deterministically so the first tick has something to relax.
    for (const n of simNodes) {
      if (n.fx != null) continue;
      const a = anchorOf.get(n.id);
      const angle = seedOf(n.id) * Math.PI * 2;
      n.x = (a?.fx ?? width / 2) + Math.cos(angle) * 90;
      n.y = height / 2 + Math.sin(angle) * 90;
    }

    sim.force("link", forceLink(simLinks).id((d) => d.id).distance(110).strength(0.35))
      .force("charge", forceManyBody().strength(-260))
      .force("x", forceX((d) => anchorOf.get(d.id)?.fx ?? width / 2).strength(0.09))
      .force("y", forceY(height / 2).strength(0.06));

    return { sim, simNodes, simLinks, clusters, lanes, maxDepth, scenarioOrder };
  }

  if (preset === "program") {
    // Swimlanes down the page (one per deliverable), dependency depth across it.
    const laneY = bands(lanes.length, height, height * 0.22);
    simNodes.forEach((n) => {
      n.y = laneY[Math.max(0, lanes.indexOf(n.src.deliverable))] + (seedOf(n.id) - 0.5) * 20;
    });

    sim.force("link", forceLink(simLinks).id((d) => d.id).distance(90).strength(0.2))
      .force("x", forceX((d) => colX(d.depth)).strength(0.9))
      .force("y", forceY((d) => laneY[Math.max(0, lanes.indexOf(d.src.deliverable))]).strength(0.6));

    return { sim, simNodes, simLinks, clusters, lanes, maxDepth, scenarioOrder };
  }

  // ---- pipeline (the designed preset) ----------------------------------
  // X is pinned, not forced: columns stay perfectly aligned, the way n8n and
  // make.com read. Only Y is simulated, so collision resolves crowding within a
  // column without ever pulling a node out of its step in the flow.
  simNodes.forEach((n) => { n.fx = colX(n.depth); });

  sim.force("link", forceLink(simLinks).id((d) => d.id).strength(0.06))
    .force("y", forceY((d) => d.targetY).strength(0.45));

  return { sim, simNodes, simLinks, clusters, lanes, maxDepth, scenarioOrder };
}

/**
 * Column captions, derived from where nodes actually landed rather than from the
 * authored cluster order — if the two disagree, the drawing wins.
 *
 * A column only gets a name when every node in it agrees on one. Parallel chains
 * (BR Legal runs two independent outcomes side by side) put unrelated phases in
 * the same column, and naming that column after whichever cluster happened to
 * sort first would be a caption that reads convincingly and says nothing true.
 * Consecutive repeats collapse, so a phase spanning three columns reads once.
 */
export function depthBands(simNodes) {
  const byDepth = new Map();
  for (const n of simNodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth).push(n.src.cluster);
  }

  const columns = [...byDepth.entries()].sort((a, b) => a[0] - b[0]).map(([depth, list]) => {
    const distinct = [...new Set(list.filter(Boolean))];
    return { depth, label: distinct.length === 1 ? distinct[0] : null, count: list.length };
  });

  // Any unnameable column makes the whole caption misleading — drop it entirely.
  if (columns.some((c) => !c.label)) return [];

  return columns.filter((c, i) => i === 0 || c.label !== columns[i - 1].label);
}
