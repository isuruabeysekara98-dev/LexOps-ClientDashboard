// ---------------------------------------------------------------------------
// Graph arrangement — ONE layered layout, shared by the editor and the canvas.
// ---------------------------------------------------------------------------
// This lived inside LivingProposalEditorPage as `autoArrange`, and the client
// canvas had a completely separate d3-force layout of its own. The same graph
// therefore read as a clean left-to-right chain in the admin and as an
// overlapping cluster to the client — two layouts of one proposal, and the one
// nobody had approved was the one being sent out.
//
// It is a Sugiyama-style layered arrangement:
//
//   1. Longest-path layering assigns each node a column.
//   2. An edge spanning more than one column gets a dummy in each column it
//      skips, so the ordering pass can see long edges at all. This is the
//      single biggest source of crossings when omitted.
//   3. Repeated median sweeps reorder each column by the median slot of its
//      neighbours in the column just settled, alternating direction.
//
// The sweep is a heuristic, not a minimiser, and on some shapes one pass makes
// things worse — so every candidate is scored by actual drawn crossings and the
// best wins. The first candidate is authored order, top-aligned, which is what
// the layout used to emit; nothing is chosen over it unless it measurably
// crosses less. Worst case you get back the arrangement you started with.
//
// Coordinates are the editor's grid (135px columns, 62px rows). The client
// canvas fits the bounding box to the viewport, so the absolute scale never
// matters — only the shape, which is the thing being preserved.
// ---------------------------------------------------------------------------

export function analyseGraph(nodes, edges) {
  const ids = nodes.map((n) => n.id).filter(Boolean);
  const idSet = new Set(ids);
  // `_i` is the index in the *authored* array. The preview draws a filtered
  // subset, so without it a click-to-delete would remove the wrong row.
  const valid = edges.map((e, i) => ({ ...e, _i: i })).filter((e) => idSet.has(e.from) && idSet.has(e.to));

  const succs = new Map(ids.map((id) => [id, []]));
  const preds = new Map(ids.map((id) => [id, []]));
  for (const e of valid) { succs.get(e.from).push(e.to); preds.get(e.to).push(e.from); }

  // Longest-path layering. A cycle is legal input here — the form doesn't
  // forbid one — so the layer is clamped to the node count. Without the clamp
  // each pass pushes a cycle's layers up by the length of the cycle, reaching
  // O(n²) columns: a 150-node graph with one loop laid out ~22,500 columns wide.
  const cap = Math.max(0, ids.length - 1);
  const layer = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of valid) {
      const want = Math.min(layer.get(e.from) + 1, cap);
      if (want > layer.get(e.to)) { layer.set(e.to, want); changed = true; }
    }
    if (!changed) break;
  }

  // Connected components, read undirected — two islands mean two maps.
  const seen = new Set();
  let islands = 0;
  for (const id of ids) {
    if (seen.has(id)) continue;
    islands++;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...succs.get(cur), ...preds.get(cur));
    }
  }

  const orphans = ids.filter((id) => !succs.get(id).length && !preds.get(id).length);
  return { ids, idSet, valid, layer, islands, orphans };
}

/**
 * Lay a graph out in columns. Pure — no React, no state.
 *
 * @returns Map<nodeId, {x, y}>. Nodes with no id, and nodes the layering
 *          never reached, are simply absent; callers decide what to do with
 *          them rather than being handed a fabricated position.
 */
export function arrangeNodes(nodes, edges) {
    const { ids, valid, layer } = analyseGraph(nodes || [], edges || []);
    // An empty Map rather than `undefined`: every caller does `.get`/`.size` on
    // the result, and the editor's old early-`return` was safe only because it
    // returned into a void context.
    if (!ids.length) return new Map();

    const depth = ids.reduce((m, id) => Math.max(m, layer.get(id)), 0);
    const cols = Array.from({ length: depth + 1 }, () => []);
    for (const id of ids) cols[layer.get(id)].push(id);

    // Adjacency over the expanded graph — real nodes plus dummies — kept as
    // two directed halves so a sweep can read only the side already settled.
    const up = new Map(), down = new Map();
    const link = (a, b) => {
      if (!down.has(a)) down.set(a, []);
      if (!up.has(b)) up.set(b, []);
      down.get(a).push(b);
      up.get(b).push(a);
    };

    // Dummies are object keys, not strings. Ids are author-supplied and can
    // arrive from loaded JSON without passing through slugify, so any sentinel
    // string is a collision waiting to happen; an object literal can't be one.
    for (const e of valid) {
      let a = e.from, b = e.to;
      let la = layer.get(a), lb = layer.get(b);
      // A cycle survives layering, so an edge can point backwards. Read it
      // forwards — ordering cares about the pair, not the direction.
      if (la > lb) { [a, b] = [b, a]; [la, lb] = [lb, la]; }
      if (la === lb) continue; // same column: the sweep has nothing to say
      let prev = a;
      for (let l = la + 1; l < lb; l++) {
        const key = { dummy: true };
        cols[l].push(key);
        link(prev, key);
        prev = key;
      }
      link(prev, b);
    }

    const pos = new Map();
    const reindex = (l) => cols[l].forEach((k, i) => pos.set(k, i));
    cols.forEach((_, l) => reindex(l));

    const medianOf = (k, side) => {
      const ns = side.get(k);
      if (!ns || !ns.length) return pos.get(k);
      const ps = ns.map((n) => pos.get(n)).sort((x, y) => x - y);
      const m = ps.length >> 1;
      return ps.length % 2 ? ps[m] : (ps[m - 1] + ps[m]) / 2;
    };

    // Candidates are scored on the geometry actually drawn — straight segments
    // between real node centres — not on index-space crossings over the
    // expanded graph. The two disagree: dummy rows and column centring both
    // move real nodes, so an arrangement can win in index space and still look
    // worse on the canvas. Scoring what the eye reads is the only way the
    // "never worse than we started" guarantee below actually holds.
    //
    // Dummies keep their slot in the arrangement. That reserved row is what
    // holds a long edge straight rather than letting it cut across the column
    // it passes through — it just doesn't get a position of its own.
    const layoutOf = ({ cols: arrangement, centred }) => {
      const tallest = arrangement.reduce((m, c) => Math.max(m, c.length), 0);
      const out = new Map();
      arrangement.forEach((col, l) => {
        const top = centred ? (tallest - col.length) / 2 : 0;
        col.forEach((k, r) => {
          if (typeof k !== "string") return; // a dummy draws nothing
          out.set(k, { x: 70 + l * 135, y: Math.round(54 + (top + r) * 62) });
        });
      });
      return out;
    };

    // Two nodes never share a slot, so equal coordinates mean the same node —
    // and edges meeting at a shared endpoint are not crossing, they're joining.
    const turn = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    const same = (p, q) => p.x === q.x && p.y === q.y;
    const drawn = valid.filter((e) => e.from !== e.to);
    const crossings = (candidate) => {
      const at = layoutOf(candidate);
      const segs = drawn.map((e) => [at.get(e.from), at.get(e.to)]).filter(([a, b]) => a && b);
      let total = 0;
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
          const [a, b] = segs[i], [c, d] = segs[j];
          if (same(a, c) || same(a, d) || same(b, c) || same(b, d)) continue;
          if (turn(a, b, c) !== turn(a, b, d) && turn(c, d, a) !== turn(c, d, b)) total++;
        }
      }
      return total;
    };

    // Reserved dummy rows and column centring each help on most shapes and hurt
    // on some, so neither is assumed — both are offered as candidates and
    // measured. Ordered best-looking first, and ties keep the incumbent, so a
    // draw resolves to the centred layout rather than a ragged top-aligned one.
    //
    // The very first candidate is authored order, no dummy rows, top-aligned:
    // exactly what this function used to emit. Nothing can be chosen over it
    // unless it measurably crosses less, which is what makes pressing the
    // button safe — at worst it gives back the arrangement you already had.
    let best = { cols: cols.map((c) => c.filter((k) => typeof k === "string")), centred: false };
    let bestScore = crossings(best);
    const consider = (arrangement) => {
      const solid = arrangement.map((c) => c.filter((k) => typeof k === "string"));
      for (const candidate of [
        { cols: arrangement, centred: true },
        { cols: solid, centred: true },
        { cols: arrangement, centred: false },
        { cols: solid, centred: false },
      ]) {
        const score = crossings(candidate);
        if (score < bestScore) {
          bestScore = score;
          best = { cols: candidate.cols.map((c) => c.slice()), centred: candidate.centred };
        }
      }
    };
    consider(cols);

    for (let pass = 0; pass < 8 && bestScore > 0; pass++) {
      const forward = pass % 2 === 0;
      const lanes = cols.map((_, l) => l);
      for (const l of forward ? lanes.slice(1) : lanes.slice(0, -1).reverse()) {
        const side = forward ? up : down;
        const scored = cols[l].map((k, i) => ({ k, i, m: medianOf(k, side) }));
        scored.sort((p, q) => p.m - q.m || p.i - q.i); // index breaks ties: stable
        cols[l] = scored.map((s) => s.k);
        reindex(l);
      }
      consider(cols);
    }

    const next = layoutOf(best);

    return next;
}
