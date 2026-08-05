// ---------------------------------------------------------------------------
// The canvas — d3-force layout, Canvas2D renderer.
// ---------------------------------------------------------------------------
// Day 2 of PORTAL-5-DAY-PLAN.md. This component replaces exactly one thing from
// day 1: the <ol> of nodes. Everything around it — the panel, autosave, upload,
// progress, send-back — is untouched and does not know the canvas exists.
//
// Two constraints from LIVING-PROPOSAL-PLAN.md §2b that are easy to lose later:
//   1. Liquid glass on chrome, never on bubbles. `backdrop-filter` is
//      GPU-expensive per element; bubbles get depth from gradients in canvas.
//   2. Physics settles, then freezes. Continuously jiggling bubbles are
//      unreadable and, worse, they make click targets move.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, useCallback } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { buildSimulation, depthBands, assignLabelWidths } from "./proposalCanvas/layout.js";
import { drawEdge, drawNode, drawLabel, hitTest, clearGradientCache, ambient } from "./proposalCanvas/draw.js";
import { PALETTE } from "./proposalCanvas/language.js";
import { DARK, darkGlass, MOTION } from "./proposalCanvas/theme.js";

const FREEZE_ALPHA = 0.01;   // §2b: freeze here, re-heat on interaction

/** Flatten one or more inset boxes to a primitive, so the layout effect can
 *  depend on their *values* rather than on a fresh object identity per render. */
function insetKey(boxes) {
  const list = Array.isArray(boxes) ? boxes : [boxes];
  return list
    .map((b) => `${b?.top ?? 0},${b?.right ?? 0},${b?.bottom ?? 0},${b?.left ?? 0}`)
    .join("|");
}


export default function ProposalCanvas({
  nodes,
  edges,
  preset = "pipeline",
  scenarios,             // [{id,label}] — drives the vertical axis
  unmetIds,              // Set of node ids with unmet required needs
  dimmedIds,             // Set of node ids filtered out by the rail (or null)
  selectedId,
  onSelect,
  height = 520,
  perf = false,
  // `bare` is the map reading: the canvas *is* the page, so it drops its card
  // border and its stack of explanatory paragraphs, and the page's own glass
  // chrome carries everything instead. Keeping both would double the copy and
  // put text in the flow underneath a full-height canvas, where nobody sees it.
  bare = false,
  // The area the floating chrome leaves free. The graph is fitted into *this*
  // rather than into the raw viewport, because a bubble underneath a glass card
  // is a bubble nobody can click — and the first column is exactly where the
  // headline card wants to sit.
  inset = null,
  // Candidate free boxes, best-fit wins. Chrome clusters at the top of the
  // screen, so "beside it" and "below it" are both valid readings of where the
  // map may live — and which is better depends entirely on the graph's aspect
  // ratio, which the page can't know. Passing both and letting the fit choose
  // is what stops a wide, short graph being squeezed into a full-height column
  // beside a card that's only 300px tall.
  insets = null,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const zoomRef = useRef(null);

  // Everything the render loop touches lives in refs — React state in a 60fps
  // loop is how you get a re-render per frame.
  const stateRef = useRef({
    simNodes: [], simLinks: [], clusters: [], sim: null,
    transform: zoomIdentity, hovered: null, t0: performance.now(), dpr: 1,
  });

  // Width is state, not a ref, because the *layout* depends on it: the pipeline
  // preset spreads clusters across the available width. A phone rotation has to
  // rebuild the forces, not just stretch the bitmap.
  const [width, setWidth] = useState(0);
  const [fps, setFps] = useState(0);
  const [hasHover, setHasHover] = useState(false);
  // Column captions are DOM, so they have to be state. Keeping them in the ref
  // meant the caption never appeared.
  const [columns, setColumns] = useState([]);
  // The scenarios the layout actually used. Falls back to discovering them from
  // the nodes when the graph has no declared list, so the caption stays honest.
  const [activeScenarios, setActiveScenarios] = useState([]);

  const liveRef = useRef({ unmetIds, dimmedIds, selectedId });
  liveRef.current = { unmetIds, dimmedIds, selectedId };

  // ---- track the available width -----------------------------------------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const read = () => {
      const w = Math.round(wrap.clientWidth || 0);
      // Ignore sub-pixel churn; anything real changes by more than a few px.
      setWidth((prev) => (Math.abs(prev - w) > 4 ? w : prev));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(wrap);
    // ResizeObserver is dormant while the document is hidden, so catch up when
    // the tab comes back rather than painting at a stale size.
    document.addEventListener("visibilitychange", read);
    window.addEventListener("orientationchange", read);
    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  // ---- build / rebuild the simulation ------------------------------------
  useEffect(() => {
    if (!nodes?.length || !width) return;
    const s = stateRef.current;

    const { sim, simNodes, simLinks, scenarioOrder } = buildSimulation(nodes, edges, preset, width, height, scenarios);
    sim.stop();   // we drive ticking from our own loop, so physics and paint stay in step

    s.sim = sim;
    s.simNodes = simNodes;
    s.simLinks = simLinks;
    setColumns(depthBands(simNodes));
    setActiveScenarios(scenarioOrder || []);
    s.t0 = performance.now();

    // Pre-settle off-screen so the map arrives composed rather than visibly
    // flying into place.
    for (let i = 0; i < 140 && sim.alpha() > 0.06; i++) sim.tick();

    // Caption budgets are neighbour-derived, so they can only be worked out once
    // the nodes have stopped moving — a node competes with whoever ends up in
    // its vertical band, which the forces decide. Done here, not per frame:
    // it's O(n²) and the answer doesn't change once the map is still.
    assignLabelWidths(simNodes);
    s.captionsSettled = false;

    // Fit to the viewport. Doing it here (not in the zoom effect) means a resize
    // re-fits, which is what makes rotation on a phone behave.
    const canvas = canvasRef.current;
    if (canvas && zoomRef.current && simNodes.length) {
      const pad = 54;
      const minX = Math.min(...simNodes.map((n) => n.x - n.r)) - pad;
      const maxX = Math.max(...simNodes.map((n) => n.x + n.r)) + pad;
      const minY = Math.min(...simNodes.map((n) => n.y - n.r)) - pad;
      const maxY = Math.max(...simNodes.map((n) => n.y + n.r)) + pad;

      // Fit into whatever the chrome leaves, then centre inside that — not
      // inside the viewport. Each candidate box is guarded so a narrow window
      // can't produce a negative one and send the transform to NaN.
      const graphW = maxX - minX, graphH = maxY - minY;
      const boxes = (insets?.length ? insets : [inset || {}]).map((b) => {
        const l = b.left ?? 0, r = b.right ?? 0, t = b.top ?? 0, bt = b.bottom ?? 0;
        const availW = Math.max(220, width - l - r);
        const availH = Math.max(220, height - t - bt);
        return {
          l, t, availW, availH,
          k: Math.max(0.35, Math.min(1.4, Math.min(availW / graphW, availH / graphH))),
        };
      });

      // Biggest scale wins. Ties break towards the earlier box, so the page's
      // preferred reading survives when neither is better.
      const best = boxes.reduce((a, b) => (b.k > a.k + 0.001 ? b : a));

      const t = zoomIdentity
        .translate(
          best.l + best.availW / 2 - ((minX + maxX) / 2) * best.k,
          best.t + best.availH / 2 - ((minY + maxY) / 2) * best.k
        )
        .scale(best.k);
      select(canvas).call(zoomRef.current.transform, t);
    }

    return () => sim.stop();
    // Insets are depended on as a flattened string, not as the object or array:
    // a fresh `{...}` or `[...]` from the parent on every render would rebuild
    // the simulation on every render, and the map would never settle.
  }, [nodes, edges, preset, height, width, scenarios, insetKey(insets || inset)]);

  // ---- zoom + pan ---------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const zoomBehaviour = d3Zoom()
      .scaleExtent([0.35, 4])
      .on("zoom", (event) => { stateRef.current.transform = event.transform; });
    zoomRef.current = zoomBehaviour;
    select(canvas).call(zoomBehaviour).on("dblclick.zoom", null);
    return () => { select(canvas).on(".zoom", null); };
  }, []);

  // ---- size the backing store --------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // cap: retina phones
    stateRef.current.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    clearGradientCache();
  }, [width, height]);

  // ---- the render loop ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let raf = 0, frames = 0, lastFpsAt = performance.now();

    function paint(now) {
      const s = stateRef.current;
      const { unmetIds: unmet, dimmedIds: dimmed, selectedId: sel } = liveRef.current;
      const t = (now - s.t0) / 1000;

      // Physics settles, then freezes. Click targets stop moving.
      if (s.sim && s.sim.alpha() > FREEZE_ALPHA) s.sim.tick();
      else if (s.sim && !s.captionsSettled) {
        // The pre-settle pass hands the last few ticks to this loop, so the
        // budgets it computed are a tick or two stale. Re-derive them once, at
        // the positions that are now final, and never again.
        s.captionsSettled = true;
        assignLabelWidths(s.simNodes);
      }

      // The map keeps breathing after the forces stop. This writes each node's
      // ambient offset for the frame; edges, bubbles, captions and the hit test
      // all read those same three fields, so the drawing and the click targets
      // can't drift apart. See the header of draw.js for why this is a renderer
      // concern and not a live simulation.
      ambient(s.simNodes, t);

      const { transform: tr, dpr } = s;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(tr.x, tr.y);
      ctx.scale(tr.k, tr.k);

      for (const l of s.simLinks) {
        drawEdge(ctx, l, { dimmed: dimmed && (dimmed.has(l.source.id) || dimmed.has(l.target.id)) });
      }
      for (const n of s.simNodes) {
        drawNode(ctx, n, {
          t,
          unmet: unmet?.has(n.id),
          selected: sel === n.id,
          hovered: s.hovered === n.id,
          dimmed: dimmed?.has(n.id),
        });
      }
      // Labels last — no bubble covers a neighbour's caption.
      for (const n of s.simNodes) {
        drawLabel(ctx, n, tr.k, { dimmed: dimmed?.has(n.id) });
      }
      ctx.restore();
    }

    function frame(now) {
      paint(now);
      frames++;
      if (now - lastFpsAt >= 500) {
        const measured = Math.round((frames * 1000) / (now - lastFpsAt));
        if (perf) setFps(measured);
        window.__canvasPerf = { fps: measured, nodes: stateRef.current.simNodes.length, preset };
        frames = 0;
        lastFpsAt = now;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Synchronous frame-cost benchmark. rAF is throttled to nothing whenever the
    // tab isn't compositing, so an fps counter can't be trusted in a background
    // tab — but the cost of one frame can. Under 16.7ms is the 60fps budget;
    // under 33.3ms is the 30fps phone budget.
    window.__canvasBench = (iterations = 240) => {
      const samples = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        paint(performance.now());
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      const at = (p) => +samples[Math.min(samples.length - 1, Math.floor(samples.length * p))].toFixed(2);
      const s = stateRef.current;
      const xs = s.simNodes.map((n) => n.x), ys = s.simNodes.map((n) => n.y);
      return {
        nodes: s.simNodes.length,
        edges: s.simLinks.length,
        preset,
        canvas: `${width}×${height} @${s.dpr}x`,
        median: at(0.5),
        p95: at(0.95),
        impliedFps: Math.round(1000 / Math.max(at(0.5), 0.01)),
        // Layout diagnostics — a blank canvas is almost always NaN positions or
        // a transform that put the graph off-screen.
        bounds: xs.length ? {
          x: [Math.round(Math.min(...xs)), Math.round(Math.max(...xs))],
          y: [Math.round(Math.min(...ys)), Math.round(Math.max(...ys))],
          nan: xs.filter((v) => !Number.isFinite(v)).length + ys.filter((v) => !Number.isFinite(v)).length,
        } : null,
        transform: { k: +s.transform.k.toFixed(3), x: Math.round(s.transform.x), y: Math.round(s.transform.y) },
        // Screen-space centres, so a hit test can be checked without a mouse.
        // `labelWidth` rides along because caption collisions are the one layout
        // fault you cannot see in the centres alone — it is the budget the
        // renderer trims against, in graph units.
        screen: s.simNodes.map((n) => ({
          id: n.id,
          x: Math.round(s.transform.applyX(n.x)),
          y: Math.round(s.transform.applyY(n.y)),
          r: Math.round(n.r * s.transform.k),
          labelWidth: Math.round(n.labelWidth || 0),
        })),
      };
    };

    return () => { cancelAnimationFrame(raf); delete window.__canvasBench; };
  }, [width, height, preset, perf]);

  // ---- pointer ------------------------------------------------------------
  const toGraph = useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return stateRef.current.transform.invert([event.clientX - rect.left, event.clientY - rect.top]);
  }, []);

  const onMove = useCallback((event) => {
    const s = stateRef.current;
    const [gx, gy] = toGraph(event);
    const id = hitTest(s.simNodes, gx, gy)?.id ?? null;
    if (id !== s.hovered) {
      s.hovered = id;
      setHasHover(!!id);
    }
  }, [toGraph]);

  const onClick = useCallback((event) => {
    const [gx, gy] = toGraph(event);
    const hit = hitTest(stateRef.current.simNodes, gx, gy);
    if (hit) onSelect?.(hit.id);
  }, [toGraph, onSelect]);

  const bands = columns;

  return (
    <div
      ref={wrapRef}
      style={bare
        ? { position: "absolute", inset: 0 }
        : { position: "relative", width: "100%", marginBottom: 12 }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={onMove}
        onMouseLeave={() => { stateRef.current.hovered = null; setHasHover(false); }}
        onClick={onClick}
        style={{
          display: "block",
          width: "100%",
          height,
          background: bare ? "transparent" : PALETTE.paper,
          // The card reading draws its own dark ground, so it needs the strong
          // light border to sit on the page rather than bleed into it. The map
          // reading is edge-to-edge and the page owns the vignette behind it.
          border: bare ? "none" : `1px solid ${DARK.border}`,
          borderRadius: bare ? 0 : 10,
          cursor: hasHover ? "pointer" : "grab",
          touchAction: "none",
        }}
      />

      {/* In bare (map-is-the-page) mode the page owns the colour key — it lives
          in the right rail now, so the canvas draws no legend of its own. The
          card layout still gets the built-in one. */}
      {!bare && <Legend bare={false} axis={null} />}

      {perf && (
        <div style={{
          position: "absolute", top: 8, right: 8, padding: "4px 8px",
          background: "rgba(35,42,52,0.82)", color: "#fff", fontSize: 12,
          borderRadius: 6, fontVariantNumeric: "tabular-nums",
        }}>
          {fps} fps · {nodes?.length || 0} nodes · {preset}
        </div>
      )}

      {!bare && (
        <>
          {bands.length > 1 && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETTE.inkSub }}>
              <strong style={{ color: PALETTE.ink }}>Left to right</strong> is what has to happen
              before what: {bands.map((b) => b.label).join(" → ")}
            </p>
          )}
          {activeScenarios.length > 1 && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: PALETTE.inkSub }}>
              <strong style={{ color: PALETTE.ink }}>Up and down</strong> is where case types split —
              the middle is the path every matter takes, and the further out a bubble sits the fewer
              case types reach it.
            </p>
          )}
          <p style={{ margin: "2px 0 0", fontSize: 12, color: PALETTE.inkSub }}>
            Scroll to zoom, drag to pan, click a bubble to open it.
          </p>
        </>
      )}
    </div>
  );
}

// Liquid glass belongs here — on the chrome, a handful of DOM elements — and
// nowhere near the bubbles.
function Legend({ bare, axis }) {
  const items = [
    { colour: PALETTE.primary, label: "Machine" },
    { colour: PALETTE.amber, label: "A person decides" },
    { colour: PALETTE.green, label: "Produced & locked" },
  ];
  return (
    <div style={{
      position: "absolute", left: bare ? 18 : 10,
      // Clears the dock in the map reading, which owns the bottom edge.
      bottom: bare ? 76 : 12,
      display: "flex", gap: 12, maxWidth: bare ? 420 : undefined,
      padding: bare ? "8px 12px" : "6px 10px",
      borderRadius: bare ? 12 : 8, fontSize: 12, flexWrap: "wrap",
      alignItems: "center",
      ...darkGlass,
      borderRadius: bare ? 12 : 8,
      color: DARK.textSub,
    }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: i.colour }} />
          {i.label}
        </span>
      ))}
      {/* How to read the two axes, compressed to one line — the long-form
          version belongs in the card layout, where there's room for it. */}
      {axis?.bands && (
        <span style={{ flexBasis: "100%", color: PALETTE.inkSub, fontSize: 11.5, lineHeight: 1.45 }}>
          Left to right: {axis.bands}
          {axis.scenarios ? " · up and down is where case types split" : ""}
        </span>
      )}
    </div>
  );
}
