// ---------------------------------------------------------------------------
// Bubble geometry — the visual grammar you read before you read a word.
// ---------------------------------------------------------------------------
// A linear chain of identical circles is why v1 read flat (LIVING-PROPOSAL-PLAN
// §2). Every `kind` gets different geometry:
//
//   trigger   emitter — pulsing ring, no fill
//   step      solid sphere
//   ai        sphere with an inner core
//   hitl      sphere with an amber corona
//   gate      faceted / angular
//   artifact  flat disc with a document notch
//   system    large slow anchor, low opacity — bubbles orbit it
//
// Depth comes from radial gradients and soft shadows drawn *in canvas*, which is
// nearly free at 150 nodes. Liquid glass (`backdrop-filter`) is GPU-expensive per
// element and belongs on the chrome, never on the bubbles.
// ---------------------------------------------------------------------------
import { PALETTE, colourFor, alphaFor } from "./language.js";
import { FONT, DARK, MOTION, prefersReducedMotion } from "./theme.js";

// ---------------------------------------------------------------------------
// Ambient motion — the map breathes without ever moving a click target.
// ---------------------------------------------------------------------------
// §2b of the plan says physics settles then freezes, and it is right: a live
// force simulation makes bubbles wander under the cursor, so the thing you
// clicked is not the thing you hit. But a frozen map is a screenshot, and a
// screenshot is not what a premium canvas feels like.
//
// The resolution is that the *simulation* stays frozen and the *renderer* adds
// a small deterministic offset on top. Layout is still settled — every node's
// resting position is exactly where the forces left it — and the wander is a
// pure function of (node id, time), so it costs no state, never accumulates
// drift, and lands back where it started every cycle.
//
// The offset is written onto the node as `ax` / `ay` / `ar` once per frame by
// `ambient()`, and edges, labels and the hit test all read those same fields.
// That is the whole reason it's stored rather than recomputed at each call
// site: what you see and what you click are guaranteed to agree, because they
// are literally the same three numbers.
//
// Amplitude is deliberately sub-radius (2.6 graph units against a 26-unit
// bubble). You should register it as life, not as movement — and at that scale
// a bubble never travels far enough to leave its own hit circle.

/** Stable 32-bit hash of a node id → two uncorrelated phases. */
function phaseOf(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Two slices of the same hash, spread across a full turn.
  return [((h >>> 8) & 1023) / 1023 * Math.PI * 2, ((h >>> 20) & 1023) / 1023 * Math.PI * 2];
}

const phaseCache = new Map();
function phases(id) {
  let p = phaseCache.get(id);
  if (!p) { p = phaseOf(id); phaseCache.set(id, p); }
  return p;
}

// How much each kind is allowed to wander. A `system` node is described in the
// plan as "a large slow anchor" that bubbles orbit — an anchor that drifts as
// far as the things orbiting it stops being an anchor. Triggers get the most:
// they are emitters, and the pulse already says they're the live end of the map.
const DRIFT_BY_KIND = { system: 0.3, trigger: 1.25, artifact: 0.7, gate: 0.75 };

/**
 * Write this frame's ambient offset onto every node. Call once per frame,
 * before anything reads `ax` / `ay` / `ar`.
 *
 * Returns nothing — it mutates, on purpose. Allocating a vector per node per
 * frame is the kind of thing that shows up at 150 nodes and 60fps.
 */
export function ambient(simNodes, t) {
  const still = prefersReducedMotion();
  const wx = MOTION.driftHz * Math.PI * 2;
  const wb = MOTION.breatheHz * Math.PI * 2;

  for (const n of simNodes) {
    if (still) { n.ax = 0; n.ay = 0; n.ar = 1; continue; }
    const [pa, pb] = phases(n.id);
    const k = (DRIFT_BY_KIND[n.src?.kind] ?? 1) * MOTION.driftPx;
    // Different x and y frequencies, so the path is a slow Lissajous figure
    // rather than a circle — a ring of bubbles all orbiting in step reads as a
    // loading spinner.
    n.ax = Math.sin(t * wx + pa) * k;
    n.ay = Math.cos(t * wx * 0.73 + pb) * k;
    n.ar = 1 + Math.sin(t * wb + pa) * MOTION.breatheAmp;
  }
}

// ---------------------------------------------------------------------------
// Gradient cache. Creating a radial gradient per node per frame is the single
// biggest avoidable cost on this canvas. Gradients are built once at the origin
// and reused under ctx.translate(), keyed by colour + rounded radius.
// ---------------------------------------------------------------------------
const gradientCache = new Map();

function sphereGradient(ctx, colour, r) {
  const key = `${colour}|${Math.round(r)}`;
  let g = gradientCache.get(key);
  if (!g) {
    // Light from the top-left, as every physical sphere the reader has ever seen.
    g = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.08, 0, 0, r);
    g.addColorStop(0, mix(colour, "#ffffff", 0.42));
    g.addColorStop(0.55, colour);
    g.addColorStop(1, mix(colour, "#000000", 0.24));
    gradientCache.set(key, g);
  }
  return g;
}

export function clearGradientCache() {
  gradientCache.clear();
}

/** Blend two hex colours. Cheap, and only ever called on a cache miss. */
function mix(a, b, t) {
  const pa = parseHex(a), pb = parseHex(b);
  const c = (i) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
function parseHex(h) {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function withAlpha(colour, a) {
  const [r, g, b] = parseHex(colour);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------
const EDGE_DASH = { depends: [5, 5], data: [], triggers: [] };

export function drawEdge(ctx, link, { dimmed } = {}) {
  const { source: s, target: t } = link;
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.1 : 0.45;
  ctx.strokeStyle = PALETTE.primary;
  // Edge thickness = volume, where declared.
  ctx.lineWidth = 1 + Math.min(3, (link.volume || 1) - 1);
  ctx.setLineDash(EDGE_DASH[link.kind] || []);

  // Stop the line at each bubble's edge rather than its centre, so arrowheads
  // sit on the rim and thick lines don't bleed out from under small bubbles.
  //
  // Both endpoints ride the ambient offset. If they didn't, a drifting bubble
  // would slide out from under its own edge and leave the line hanging in
  // space — which is exactly the tell that the motion is fake.
  const sx = s.x + (s.ax || 0), sy = s.y + (s.ay || 0), sr = s.r * (s.ar || 1);
  const tx = t.x + (t.ax || 0), ty = t.y + (t.ay || 0), tr = t.r * (t.ar || 1);
  const dx = tx - sx, dy = ty - sy;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const x1 = sx + ux * (sr + 2), y1 = sy + uy * (sr + 2);
  const x2 = tx - ux * (tr + 6), y2 = ty - uy * (tr + 6);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead — direction is the whole point of a process map.
  if (!dimmed) {
    ctx.setLineDash([]);
    ctx.fillStyle = withAlpha(PALETTE.primary, 0.55);
    const a = 5;
    ctx.beginPath();
    ctx.moveTo(x2 + ux * a, y2 + uy * a);
    ctx.lineTo(x2 - uy * a * 0.6, y2 + ux * a * 0.6);
    ctx.lineTo(x2 + uy * a * 0.6, y2 - ux * a * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/** Faceted polygon path, used for `gate`. Angular reads as "a decision". */
function facetPath(ctx, r, sides = 6, rotation = Math.PI / 6) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draw one node at its own origin. Caller has already translated.
 *
 * @param opts.unmet    node has unmet required needs → dashed pulsing ring
 * @param opts.selected currently open in the panel
 * @param opts.hovered  under the cursor
 * @param opts.dimmed   filtered out by the rail
 * @param opts.t        seconds since mount, drives pulses
 */
export function drawNode(ctx, n, opts = {}) {
  const { unmet, selected, hovered, dimmed, t = 0 } = opts;
  const node = n.src;
  // The breathing scale rides on the radius, and the wander rides on the
  // translate — so everything below draws at its own origin exactly as before
  // and needs no knowledge that the node is moving at all.
  const r = n.r * (n.ar || 1);
  const colour = colourFor(node);
  const alpha = dimmed ? 0.12 : alphaFor(node);

  ctx.save();
  ctx.translate(n.x + (n.ax || 0), n.y + (n.ay || 0));
  ctx.globalAlpha = alpha;

  // Soft contact shadow — depth for almost nothing.
  //
  // On a near-black field an ink-coloured shadow is invisible, so this is a
  // *glow* in the bubble's own hue rather than a drop shadow: light coming off
  // the sphere, not falling behind it. Hovering widens it, which is the whole
  // hover affordance now that the cursor already says "pointer".
  if (!dimmed) {
    ctx.shadowColor = withAlpha(colour, hovered ? 0.55 : 0.3);
    ctx.shadowBlur = hovered ? 26 : 14;
    ctx.shadowOffsetY = 0;
  }

  switch (node.kind) {
    case "trigger": {
      // Emitter: no fill, a ring that breathes outward. This is where work enters.
      ctx.shadowBlur = 0;
      const pulse = (Math.sin(t * 1.9) + 1) / 2;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      if (!dimmed) {
        ctx.globalAlpha = alpha * (0.42 - pulse * 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 5 + pulse * 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case "system": {
      // A large, muted anchor. Bubbles orbit it; it does not compete for attention.
      ctx.shadowBlur = 0;
      ctx.fillStyle = withAlpha(colour, 0.16);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(colour, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case "gate": {
      facetPath(ctx, r);
      ctx.fillStyle = sphereGradient(ctx, colour, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = mix(colour, "#000000", 0.28);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }

    case "artifact": {
      // A flat disc — a thing that got produced, not a process that runs.
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(colour, 0.9);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Document notch: a folded corner, top-right.
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.62);
      ctx.lineTo(r * 0.62, -r * 0.62);
      ctx.lineTo(r * 0.62, -r * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "hitl": {
      // Amber corona — the "a person decides here" marker, visible at any zoom.
      ctx.shadowBlur = 0;
      if (!dimmed) {
        const pulse = (Math.sin(t * 1.4) + 1) / 2;
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = PALETTE.amber;
        ctx.beginPath();
        ctx.arc(0, 0, r + 6 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGradient(ctx, colour, r);
      ctx.fill();
      break;
    }

    case "ai": {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGradient(ctx, colour, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner core — a model runs inside this one.
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(PALETTE.gold, 0.92);
      ctx.fill();
      break;
    }

    case "step":
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGradient(ctx, colour, r);
      ctx.fill();
      break;
    }
  }

  ctx.shadowBlur = 0;

  // Dashed pulsing ring — we need something from you here. This is the mechanic
  // that turns exploration into a returned round, so it outranks selection.
  if (unmet && !dimmed) {
    const pulse = (Math.sin(t * 2.4) + 1) / 2;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -t * 14;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  if (selected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Labels are drawn in a second pass so no bubble ever covers a neighbour's text.
 * Culled below a screen-space size — this is legibility, not level-of-detail
 * (LOD is day 3). `scale` is the current zoom.
 */
export function drawLabel(ctx, n, scale, { dimmed } = {}) {
  if (dimmed) return;
  const screenR = n.r * scale;
  if (screenR < 10) return;                     // too small to caption honestly

  // Two lines, the way n8n and make.com caption a module: the *thing* in bold,
  // what it does underneath in a lighter weight. A reader scans the top line
  // across the whole row and only drops to the second line where they care.
  //
  // That only works if the top line is short. A node with a sentence for a
  // label gets truncated here rather than wrapped — wrapping turns a row of
  // bubbles into a wall of text, which is the thing this is escaping.
  const label = n.src.label || "";
  // Who or what is involved — platforms, the person in the loop, the system of
  // record. This is the subtext because it's the question a reader asks second,
  // straight after "what is this": *who touches it?* `action` is the fallback
  // for nodes authored before stakeholders existed.
  const action = (n.src.stakeholder || []).join(" · ") || n.src.action || "";

  const size = Math.max(11, Math.min(14, n.r * 0.42)) / scale;
  const subSize = size * 0.82;

  ctx.save();
  // Captions ride the ambient offset with their bubble. A label that stays put
  // while its bubble drifts detaches from it, and at these amplitudes the two
  // would visibly disagree.
  ctx.translate(n.x + (n.ax || 0), n.y + (n.ay || 0) + n.r * (n.ar || 1) + 6 / scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // A halo, so labels stay readable over edges and neighbouring bubbles. It is
  // the *page* colour, so on a dark canvas it has to be dark — the near-white
  // halo this used to carry was built for the light page and outlined every
  // caption in glare once the map went dark.
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = "rgba(7,12,17,0.88)";
  ctx.lineJoin = "round";

  // The room this caption owns, in the same units the text is being drawn in.
  // Set by assignLabelWidths() in layout.js from the distance to this node's
  // nearest neighbour *in its own vertical band* — the renderer deliberately
  // doesn't recompute it, because it's a settled-layout fact, not a per-frame
  // one, and this loop runs 60 times a second. The fallback only covers a
  // caller that draws before the layout has settled.
  const room = (n.labelWidth || 200);

  // Satoshi, at the weight the website sets its headings in. `ctx.font` takes a
  // font string and knows nothing about the CSS cascade, so the canvas is the
  // one place in this app that has to name the family explicitly — everything
  // in the DOM inherits it from `html, body` in index.html.
  //
  // 500, not 600: index.html loads 400/500/700, and asking for a weight that
  // isn't in that link tag gets a synthesised face — subtly heavier and wrongly
  // spaced next to the real one in the chrome beside it.
  ctx.font = `500 ${size}px ${FONT}`;
  const line = fit(ctx, label, room);
  ctx.strokeText(line, 0, 0);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(line, 0, 0);

  // The subtext drops out first when the map is zoomed out — at that size it's
  // unreadable anyway, and losing it keeps the primary line clean.
  if (action && screenR >= 11.5) {
    const y = size * 1.25;
    ctx.font = `400 ${subSize}px ${FONT}`;
    const sub = fit(ctx, action, room);
    ctx.strokeText(sub, 0, y);
    ctx.fillStyle = PALETTE.inkSub;
    ctx.fillText(sub, 0, y);
  }

  // The caption stops here, at two lines, on purpose.
  //
  // An earlier pass faded the node's whole contract in underneath — what feeds
  // it, what you get back, what we need, what we're assuming — staged on click
  // and zoom. It was rejected on sight and the reason is worth keeping: four
  // lines under every bubble turns a map into a wall of text, which is the
  // exact thing the two-line caption exists to escape, and it competes with the
  // panel rather than leading to it. Detail belongs in something you open, not
  // in something you zoom. See NodeStory.jsx.
  ctx.restore();
}

/**
 * Trim text to a measured width rather than a character count — the same 24
 * characters are wildly different widths in "AI match" and "Multilingual".
 * Cuts on a word boundary where there is one; a mid-word ellipsis reads as a bug.
 */
function fit(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;

  // Binary search the longest prefix that fits, then retreat to a space.
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  if (lo <= 1) return "";                       // no honest way to caption this

  const cut = text.slice(0, lo);
  const space = cut.lastIndexOf(" ");
  return (space > lo * 0.55 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

/**
 * Topmost node under a graph-space point, or null.
 *
 * Tests against the *drawn* position, not the resting one — `ax`/`ay`/`ar` are
 * whatever the last painted frame wrote, so the circle this tests is the circle
 * on screen. That equality is the reason the ambient offset is stored on the
 * node rather than recomputed here from the clock: a hit test running on a
 * pointer event has no frame time, and re-deriving one would put it a few
 * milliseconds off the pixels the reader is actually aiming at.
 */
export function hitTest(simNodes, x, y) {
  for (let i = simNodes.length - 1; i >= 0; i--) {
    const n = simNodes[i];
    const dx = x - (n.x + (n.ax || 0));
    const dy = y - (n.y + (n.ay || 0));
    if (Math.hypot(dx, dy) <= n.r * (n.ar || 1) + 4) return n;
  }
  return null;
}
