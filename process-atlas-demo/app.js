/* ============================================================
   LEX OPS — Process Atlas
   View 1: force-directed org graph (no central node)
   View 2: department workflows side-by-side
   View 3: workflow focus window with zoom levels
   ============================================================ */

'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

const personById = id => ATLAS.people.find(p => p.id === id);
const toolById = id => ATLAS.tools.find(t => t.id === id);
const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('');
const firstName = id => (personById(id)?.name || id).split(' ')[0];

/* ------------------------------------------------------------
   Navigation
   ------------------------------------------------------------ */
const state = { dept: null, wf: null, zoom: 1 };

function setCrumbs(parts) {
  const el = $('#crumbs');
  el.innerHTML = '';
  parts.forEach((p, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '›';
      el.appendChild(sep);
    }
    const c = document.createElement(p.go ? 'button' : 'span');
    c.className = 'crumb ' + (p.go ? 'link' : 'here');
    c.textContent = p.label;
    if (p.go) c.addEventListener('click', p.go);
    el.appendChild(c);
  });
}

function showGraph() {
  state.dept = null;
  closeFocus();
  $('#view-dept').classList.remove('active');
  $('#view-graph').classList.add('active');
  setCrumbs([{ label: 'Teams Squared' }]);
}

function showDept(deptId) {
  const dept = ATLAS.departments.find(d => d.id === deptId);
  if (!dept) return;
  state.dept = dept;
  closeFocus();
  renderDept(dept);
  $('#view-graph').classList.remove('active');
  $('#view-dept').classList.add('active');
  setCrumbs([
    { label: 'Teams Squared', go: showGraph },
    { label: dept.name },
  ]);
}

function showWorkflow(wf) {
  state.wf = wf;
  state.zoom = 1;
  renderFocus(wf);
  $('#focus-overlay').classList.add('active');
  setCrumbs([
    { label: 'Teams Squared', go: showGraph },
    { label: state.dept.name, go: () => showDept(state.dept.id) },
    { label: wf.name },
  ]);
}

function closeFocus() {
  $('#focus-overlay').classList.remove('active');
  if (state.dept) {
    setCrumbs([
      { label: 'Teams Squared', go: showGraph },
      { label: state.dept.name },
    ]);
  }
  state.wf = null;
}

/* ============================================================
   VIEW 1 — Force-directed org graph
   No central node: the mesh emerges from shared people & tools.
   ============================================================ */
const graph = { nodes: [], links: [], sim: null };

function buildGraphData() {
  const nodes = [], links = [], idx = {};
  const add = n => { idx[n.id] = n; nodes.push(n); return n; };

  ATLAS.departments.forEach(d =>
    add({ id: 'd:' + d.id, kind: 'dept', label: d.name, r: 26, ref: d }));

  ATLAS.departments.forEach(d => d.workflows.forEach(w => {
    add({ id: 'w:' + w.id, kind: 'wf', label: w.name, r: 10, ref: w, deptId: d.id });
    links.push({ a: 'd:' + d.id, b: 'w:' + w.id, w: 2.2 });
  }));

  ATLAS.people.forEach(p => add({ id: 'p:' + p.id, kind: 'person', label: p.name, r: 5, ref: p }));
  ATLAS.tools.forEach(t => add({ id: 't:' + t.id, kind: 'tool', label: t.name, r: 4, ref: t }));

  ATLAS.departments.forEach(d => d.workflows.forEach(w => {
    w.people.forEach(p => idx['p:' + p] && links.push({ a: 'w:' + w.id, b: 'p:' + p, w: 1 }));
    w.tools.forEach(t => idx['t:' + t] && links.push({ a: 'w:' + w.id, b: 't:' + t, w: 0.7 }));
  }));

  // drop orphan tools/people (none expected, but safe)
  const linked = new Set(links.flatMap(l => [l.a, l.b]));
  graph.nodes = nodes.filter(n => n.kind === 'dept' || linked.has(n.id));
  graph.links = links.map(l => ({ s: idx[l.a], t: idx[l.b], w: l.w }));
}

function initGraph() {
  const svg = $('#graph-svg');
  const W = svg.clientWidth, H = svg.clientHeight;
  if (W < 50 || H < 50) { setTimeout(initGraph, 120); return; } // hidden/zero-size — wait for layout
  buildGraphData();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // seed positions: departments on a loose ring (no centre), satellites nearby
  const depts = graph.nodes.filter(n => n.kind === 'dept');
  depts.forEach((d, i) => {
    const a = (i / depts.length) * Math.PI * 2 - Math.PI / 2;
    d.x = W / 2 + Math.cos(a) * Math.min(W, H) * 0.26;
    d.y = H / 2 + Math.sin(a) * Math.min(W, H) * 0.26;
  });
  graph.nodes.forEach(n => {
    if (n.kind === 'dept') return;
    const anchor = n.deptId ? graph.nodes.find(d => d.id === 'd:' + n.deptId) : null;
    const bx = anchor ? anchor.x : W / 2, by = anchor ? anchor.y : H / 2;
    n.x = bx + (Math.random() - 0.5) * 260;
    n.y = by + (Math.random() - 0.5) * 260;
  });
  graph.nodes.forEach(n => { n.vx = 0; n.vy = 0; });

  // per-node organic wander (Topology-style perpetual drift)
  graph.nodes.forEach(n => {
    n.wf1 = 0.12 + Math.random() * 0.25;   // wander frequencies
    n.wf2 = 0.09 + Math.random() * 0.2;
    n.wp1 = Math.random() * Math.PI * 2;   // phases
    n.wp2 = Math.random() * Math.PI * 2;
    n.wamp = n.kind === 'dept' ? 0.006 : 0.016; // heavy nodes drift less
  });

  // build DOM
  const particleLayer = document.createElementNS(SVGNS, 'g');
  const linkLayer = document.createElementNS(SVGNS, 'g');
  const pulseLayer = document.createElementNS(SVGNS, 'g');
  const nodeLayer = document.createElementNS(SVGNS, 'g');
  svg.innerHTML = '';
  svg.appendChild(particleLayer);
  svg.appendChild(linkLayer);
  svg.appendChild(pulseLayer);
  svg.appendChild(nodeLayer);

  // ambient particle field
  graph.particles = [];
  for (let i = 0; i < 70; i++) {
    const el = document.createElementNS(SVGNS, 'circle');
    const r = 0.6 + Math.random() * 1.3;
    el.setAttribute('r', r);
    el.setAttribute('fill', Math.random() < 0.16 ? 'rgba(232,212,77,0.35)' : 'rgba(150,170,230,0.22)');
    particleLayer.appendChild(el);
    graph.particles.push({
      el, x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      ph: Math.random() * Math.PI * 2, fr: 0.2 + Math.random() * 0.4,
    });
  }

  // data pulses that travel along edges
  graph.pulses = [];
  graph.pulseLayer = pulseLayer;

  graph.links.forEach(l => {
    const el = document.createElementNS(SVGNS, 'line');
    el.setAttribute('class', 'g-link');
    linkLayer.appendChild(el);
    l.el = el;
  });

  const tooltip = $('#g-tooltip');

  graph.nodes.forEach(n => {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'g-node ' + n.kind);
    const hit = document.createElementNS(SVGNS, 'circle'); // enlarged invisible hit target
    hit.setAttribute('class', 'hitc');
    hit.setAttribute('r', Math.max(n.r + 12, 18));
    g.appendChild(hit);
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', n.r);
    g.appendChild(c);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dy', n.kind === 'dept' ? n.r + 20 : n.r + 13);
    t.textContent = n.kind === 'wf' ? n.label : (n.kind === 'dept' ? n.label : n.label.split(' ')[0]);
    g.appendChild(t);
    nodeLayer.appendChild(g);
    n.el = g;

    const neighbors = new Set();
    graph.links.forEach(l => {
      if (l.s === n) neighbors.add(l.t);
      if (l.t === n) neighbors.add(l.s);
    });

    g.addEventListener('mouseenter', e => {
      graph.nodes.forEach(m => m.el.classList.toggle('dim', m !== n && !neighbors.has(m)));
      graph.nodes.forEach(m => m.el.classList.toggle('hl', m === n || neighbors.has(m)));
      graph.links.forEach(l => {
        const on = l.s === n || l.t === n;
        l.el.classList.toggle('hl', on);
        l.el.classList.toggle('dim', !on);
      });
      const kindLabel = { dept: 'Department', wf: 'Workflow', person: n.ref.role || 'Team member', tool: 'Shared tool' }[n.kind];
      tooltip.innerHTML = `<div class="tt-title">${n.label}</div><div class="tt-sub">${kindLabel}</div>` +
        (n.kind === 'dept' ? `<div class="tt-cta">Double-click to open workflows →</div>` : '') +
        (n.kind === 'wf' ? `<div class="tt-cta">Double-click to focus →</div>` : '');
      tooltip.style.opacity = 1;
    });
    g.addEventListener('mousemove', e => {
      tooltip.style.left = (e.clientX + 16) + 'px';
      tooltip.style.top = (e.clientY + 8) + 'px';
    });
    g.addEventListener('mouseleave', () => {
      graph.nodes.forEach(m => { m.el.classList.remove('dim'); m.el.classList.remove('hl'); });
      graph.links.forEach(l => { l.el.classList.remove('hl'); l.el.classList.remove('dim'); });
      tooltip.style.opacity = 0;
    });
    g.addEventListener('dblclick', () => {
      if (n.kind === 'dept') showDept(n.ref.id);
      if (n.kind === 'wf') { showDept(n.deptId); showWorkflow(n.ref); }
    });

    // drag
    let drag = null;
    g.addEventListener('pointerdown', e => {
      drag = { dx: n.x - e.clientX, dy: n.y - e.clientY };
      n.fixed = true;
      g.setPointerCapture(e.pointerId);
      graph.heat = 0.12;
      e.stopPropagation();
    });
    g.addEventListener('pointermove', e => {
      if (!drag) return;
      n.x = e.clientX + drag.dx;
      n.y = e.clientY + drag.dy;
      graph.heat = 0.5;
    });
    g.addEventListener('pointerup', () => { drag = null; n.fixed = false; });
  });

  graph.W = W; graph.H = H;
  graph.heat = 1;
  runSim();
}

function runSim() {
  const { nodes, links } = graph;
  let t = 0;
  function tick() {
    t += 0.016;
    const alpha = Math.max(graph.heat, 0.02); // structure ~at rest; wander supplies the life
    graph.heat *= 0.97;

    // organic wander: every node breathes through the field
    nodes.forEach(n => {
      if (n.fixed) return;
      n.vx += Math.sin(t * n.wf1 + n.wp1) * n.wamp + Math.cos(t * n.wf2 + n.wp2) * n.wamp * 0.6;
      n.vy += Math.cos(t * n.wf1 + n.wp2) * n.wamp + Math.sin(t * n.wf2 + n.wp1) * n.wamp * 0.6;
    });

    // link springs
    links.forEach(l => {
      const rest = l.s.kind === 'dept' || l.t.kind === 'dept' ? 150 : 92;
      const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = ((d - rest) / d) * 0.03 * l.w * alpha;
      if (!l.s.fixed) { l.s.vx += dx * f; l.s.vy += dy * f; }
      if (!l.t.fixed) { l.t.vx -= dx * f; l.t.vy -= dy * f; }
    });

    // repulsion (n^2 fine at ~80 nodes)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - .5; dy = Math.random() - .5; d2 = 1; }
        if (d2 > 160000) continue;
        const k = (a.kind === 'dept' && b.kind === 'dept' ? 22000 : 5200) * alpha / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * k, fy = (dy / d) * k;
        if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
        if (!b.fixed) { b.vx += fx; b.vy += fy; }
      }
    }

    // gentle centering + bounds
    nodes.forEach(n => {
      if (n.fixed) { n.vx = 0; n.vy = 0; return; }
      n.vx += (graph.W / 2 - n.x) * 0.006 * alpha;
      n.vy += (graph.H / 2 - n.y) * 0.008 * alpha;
      n.vx *= 0.85; n.vy *= 0.85;
      const sp = Math.hypot(n.vx, n.vy);            // clamp — keeps the sim silky, never explosive
      if (sp > 6) { n.vx *= 6 / sp; n.vy *= 6 / sp; }
      n.x += n.vx; n.y += n.vy;
      const m = n.r + 14;
      n.x = Math.max(m, Math.min(graph.W - m, n.x));
      n.y = Math.max(m + 10, Math.min(graph.H - m, n.y));
    });

    links.forEach(l => {
      l.el.setAttribute('x1', l.s.x); l.el.setAttribute('y1', l.s.y);
      l.el.setAttribute('x2', l.t.x); l.el.setAttribute('y2', l.t.y);
    });
    nodes.forEach(n => n.el.setAttribute('transform', `translate(${n.x},${n.y})`));

    // ambient particle field — slow drift with sinusoidal sway, wrap at edges
    graph.particles.forEach(p => {
      p.x += p.vx + Math.sin(t * p.fr + p.ph) * 0.06;
      p.y += p.vy + Math.cos(t * p.fr * 0.8 + p.ph) * 0.06;
      if (p.x < -4) p.x = graph.W + 4; if (p.x > graph.W + 4) p.x = -4;
      if (p.y < -4) p.y = graph.H + 4; if (p.y > graph.H + 4) p.y = -4;
      p.el.setAttribute('cx', p.x); p.el.setAttribute('cy', p.y);
      p.el.setAttribute('opacity', 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.fr * 1.7 + p.ph)));
    });

    // data pulses traveling along random edges
    if (Math.random() < 0.06 && graph.pulses.length < 14) {
      const link = links[Math.floor(Math.random() * links.length)];
      const el = document.createElementNS(SVGNS, 'circle');
      el.setAttribute('r', 2.2);
      el.setAttribute('fill', '#6f8cff');
      el.setAttribute('filter', 'drop-shadow(0 0 4px rgba(90,120,255,0.9))');
      graph.pulseLayer.appendChild(el);
      graph.pulses.push({ el, link, p: 0, sp: 0.006 + Math.random() * 0.008, rev: Math.random() < 0.5 });
    }
    graph.pulses = graph.pulses.filter(pl => {
      pl.p += pl.sp;
      if (pl.p >= 1) { pl.el.remove(); return false; }
      const k = pl.rev ? 1 - pl.p : pl.p;
      const x = pl.link.s.x + (pl.link.t.x - pl.link.s.x) * k;
      const y = pl.link.s.y + (pl.link.t.y - pl.link.s.y) * k;
      const fade = Math.sin(pl.p * Math.PI); // ease in/out opacity
      pl.el.setAttribute('cx', x); pl.el.setAttribute('cy', y);
      pl.el.setAttribute('opacity', fade * 0.9);
      return true;
    });

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   VIEW 2 — Department workflows
   ============================================================ */
function renderDept(dept) {
  $('#dept-title').textContent = dept.name;
  $('#dept-blurb').textContent = dept.blurb;
  $('#dept-lead').textContent = 'Led by ' + dept.lead;

  $('#dept-stats').innerHTML = '';

  const grid = $('#wf-grid');
  grid.innerHTML = '';
  [...dept.workflows].sort((a, b) => b.cases - a.cases).forEach((wf, i) => {
    const card = document.createElement('div');
    card.className = 'wf-card';
    card.style.animationDelay = (0.06 * i) + 's';
    card.innerHTML = `
      <div class="wf-card-top">
        <span class="wf-code">${wf.code}</span>
        <span class="wf-cases"># ${fmt(wf.cases)} cases</span>
      </div>
      <div class="wf-name">${wf.name}</div>
      <div class="wf-desc">${wf.desc}</div>
      <div class="wf-mini">${miniPath(wf)}</div>
      <div class="wf-meta">
        <div class="wf-facepile">${wf.people.slice(0, 4).map(p =>
          `<div class="face" title="${personById(p)?.name || p}">${initials(personById(p)?.name || p)}</div>`).join('')}</div>
        <span class="wf-open">Open workflow <span>→</span></span>
      </div>`;
    card.addEventListener('click', () => showWorkflow(wf));
    grid.appendChild(card);
  });
}

function miniPath(wf) {
  const n = wf.steps.length;
  const W = 300, H = 34, y = 17;
  const xs = wf.steps.map((_, i) => 12 + (i * (W - 24)) / (n - 1));
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  s += `<line x1="${xs[0]}" y1="${y}" x2="${xs[n - 1]}" y2="${y}" stroke="#dfe4f0" stroke-width="2"/>`;
  // hint of variants
  wf.variants.slice(0, 2).forEach((v, k) => {
    const i = Math.min(2 + k * 2, n - 2);
    s += `<path d="M ${xs[i]} ${y} Q ${(xs[i] + xs[i + 1]) / 2} ${k % 2 ? y + 12 : y - 12} ${xs[i + 1]} ${y}" fill="none" stroke="#c3ccf0" stroke-width="1.4"/>`;
  });
  xs.forEach((x, i) => {
    s += `<circle cx="${x}" cy="${y}" r="${i === 0 || i === n - 1 ? 4 : 3}" fill="${i === 0 ? '#3b5bff' : i === n - 1 ? '#23c48e' : '#0d1b3e'}"/>`;
  });
  return s + '</svg>';
}

/* ============================================================
   VIEW 3 — Workflow focus window + zoomable process map
   Zoom 1: most-traversed path (the spine)
   Zoom 2: + major variants (share ≥ 8%)
   Zoom 3: + all variants, rework loops, back-and-forth
   ============================================================ */
const ZOOM_LABELS = ['Common path', 'Major variants', 'All traversals'];

function renderZoomSegs() {
  $('#zoom-segs').innerHTML = ZOOM_LABELS.map((l, i) =>
    `<button class="zoom-seg" data-z="${i + 1}"><span class="seg-dot">${i + 1}</span>${l}</button>`).join('');
  $$('#zoom-segs .zoom-seg').forEach(b => b.addEventListener('click', () => setZoom(+b.dataset.z)));
}

function renderFocus(wf) {
  $('#focus-eyebrow').textContent = state.dept.name + ' · ' + wf.code;
  $('#focus-title').textContent = wf.name;

  const variantPct = Math.round(wf.variants.reduce((s, v) => s + v.share, 0) * 100);
  $('#focus-rail').innerHTML = `
    <div class="rail-metric"><div class="rm-label">Cases</div><div class="rm-value">${fmt(wf.cases)}</div><div class="rm-sub">observed traversals</div></div>
    <div class="rail-metric"><div class="rm-label">Activities</div><div class="rm-value">${wf.steps.length}</div><div class="rm-sub">on the common path</div></div>
    <div class="rail-metric"><div class="rm-label">Variants</div><div class="rm-value">${wf.variants.length + 1}</div><div class="rm-sub">${variantPct}% deviate from spine</div></div>
    <div class="rail-divider"></div>
    <div class="dp-section-label">People in the loop</div>
    <div class="rail-people">${wf.people.map(p => {
      const person = personById(p);
      return `<div class="rail-person"><div class="face">${initials(person.name)}</div>${person.name}</div>`;
    }).join('')}</div>
    <div class="rail-divider"></div>
    <div class="dp-section-label">Systems touched</div>
    <div class="rail-people">${wf.tools.map(t => `<div class="rail-person">· ${toolById(t)?.name || t}</div>`).join('')}</div>`;

  buildProcessMap(wf);
  applyZoom();
}

function setZoom(z) {
  state.zoom = Math.max(1, Math.min(3, z));
  applyZoom();
}

function applyZoom() {
  const z = state.zoom;
  $$('#zoom-segs .zoom-seg').forEach(b => {
    const bz = +b.dataset.z;
    b.classList.toggle('active', bz === z);
    b.classList.toggle('done', bz < z);
  });
  $('#zoom-out').disabled = z === 1;
  $('#zoom-in').disabled = z === 3;
  const stage = $('#process-stage');
  stage.style.transform = `scale(${0.86 + z * 0.07})`;
  $$('.zl', stage).forEach(el => {
    const lvl = +el.dataset.zl;
    el.classList.toggle('zoom-hidden', lvl > z);
  });
  closeDetail();
}

/* ---- process map construction ---- */
function buildProcessMap(wf) {
  const scroll = $('#process-scroll');
  const ROW = 128, CW = 224, CH = 62, CX = 480;
  const n = wf.steps.length;
  const topPad = 90, botPad = 280; // clearance so the completion banner scrolls above the zoom dock
  const H = topPad + n * ROW + botPad;
  const W = 960;

  const yOf = i => topPad + 40 + i * ROW;
  const stepIdx = {};
  wf.steps.forEach((s, i) => stepIdx[s.id] = i);

  const mk = (id, cls) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9"
      markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="${cls}"/></marker>`;
  let defs = mk('arr-spine', 'p-arrow-spine') + mk('arr-variant', 'p-arrow-variant') +
             mk('arr-rework', 'p-arrow-rework') + mk('arr-skip', 'p-arrow-skip');

  let out = `<svg id="pmap" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>`;

  const spineShare = 1 - wf.variants.reduce((s, v) => s + v.share, 0);
  const spineCases = Math.round(wf.cases * spineShare);
  const strokeFor = share => 1.6 + share * 6;

  /* terminals */
  out += `<g class="p-terminal"><circle cx="${CX}" cy="${topPad - 26}" r="14"/><text x="${CX}" y="${topPad - 22}" text-anchor="middle">▶</text>
          <text x="${CX + 24}" y="${topPad - 22}" style="font-size:10px;font-weight:700;fill:#8a94b0">Start · # ${fmt(wf.cases)}</text></g>`;
  const endY = yOf(n - 1) + CH / 2 + 58;
  out += `<g class="p-terminal"><circle cx="${CX}" cy="${endY}" r="14"/><text x="${CX}" y="${endY + 4}" text-anchor="middle">■</text>
          <text x="${CX + 24}" y="${endY + 4}" style="font-size:10px;font-weight:700;fill:#8a94b0">End · # ${fmt(wf.cases)}</text></g>`;

  // completion state: confirm what all traversals reach (peak-end)
  const bw = 340, bh = 58, bx = CX - bw / 2, by = endY + 32;
  out += `<g class="p-done">
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14"/>
    <circle class="d-check" cx="${bx + 30}" cy="${by + bh / 2}" r="11"/>
    <path d="M ${bx + 25} ${by + bh / 2} l 3.5 3.5 l 7 -7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="d-title" x="${bx + 52}" y="${by + 24}">All ${fmt(wf.cases)} cases reach completion</text>
    <text class="d-sub" x="${bx + 52}" y="${by + 42}">${wf.steps.length} activities · ${wf.variants.length + 1} distinct paths · owned by ${firstName(wf.steps[wf.steps.length - 1].owner)}</text>
  </g>`;
  out += edge(CX, topPad - 12, CX, yOf(0) - CH / 2, 'spine', strokeFor(1), 'arr-spine');
  out += edge(CX, yOf(n - 1) + CH / 2, CX, endY - 14, 'spine', strokeFor(1), 'arr-spine');

  /* spine edges */
  for (let i = 0; i < n - 1; i++) {
    const y1 = yOf(i) + CH / 2, y2 = yOf(i + 1) - CH / 2;
    out += edge(CX, y1, CX, y2, 'spine', strokeFor(spineShare), 'arr-spine');
    const durStep = wf.steps[i + 1];
    if (durStep.dur) out += durPill(CX + 22, (y1 + y2) / 2, durStep.dur);
  }

  /* variants */
  let sideL = 0, sideR = 0;
  wf.variants.forEach((v, vi) => {
    const zl = v.share >= 0.08 ? 2 : 3;
    const casesN = Math.round(wf.cases * v.share);
    const sw = strokeFor(v.share);

    if (v.type === 'rework') {
      const fi = stepIdx[v.from], ti = stepIdx[v.to];
      const y1 = yOf(fi), y2 = yOf(ti);
      const depth = 150 + (sideL++ % 3) * 46;
      const x0 = CX - CW / 2;
      const d = `M ${x0} ${y1} C ${x0 - depth} ${y1}, ${x0 - depth} ${y2}, ${x0} ${y2}`;
      out += `<g class="zl" data-zl="${zl === 2 && vi < 2 ? 3 : zl}">
        ${pathEdge(d, 'rework', Math.max(2, sw * 0.8), 'arr-rework')}
        <text class="p-variant-tag" x="${x0 - depth + 8}" y="${(y1 + y2) / 2 - 6}" text-anchor="start">↺ ${v.label}</text>
        <text class="p-variant-tag" x="${x0 - depth + 8}" y="${(y1 + y2) / 2 + 8}" text-anchor="start"># ${fmt(casesN)} cases</text></g>`;
    }

    if (v.type === 'skip') {
      const fi = stepIdx[v.from], ti = stepIdx[v.to];
      const y1 = yOf(fi), y2 = yOf(ti);
      const depth = 165 + (sideR++ % 3) * 46;
      const x0 = CX + CW / 2;
      const d = `M ${x0} ${y1} C ${x0 + depth} ${y1}, ${x0 + depth} ${y2}, ${x0} ${y2}`;
      out += `<g class="zl" data-zl="${zl}">
        ${pathEdge(d, 'skip', Math.max(1.6, sw * 0.7), 'arr-skip')}
        <text class="p-variant-tag" x="${x0 + depth - 8}" y="${(y1 + y2) / 2 - 6}" text-anchor="end">⤳ ${v.label}</text>
        <text class="p-variant-tag" x="${x0 + depth - 8}" y="${(y1 + y2) / 2 + 8}" text-anchor="end"># ${fmt(casesN)} cases</text></g>`;
    }

    if (v.type === 'detour') {
      const ai = stepIdx[v.after];
      const ri = v.rejoin ? stepIdx[v.rejoin] : null;
      const side = (vi % 2 === 0) ? 1 : -1;
      const dx = CX + side * 300;
      const yMid = ri != null ? (yOf(ai) + yOf(ri)) / 2 : yOf(ai) + ROW * 0.75;
      const st = v.steps[0];
      const y1 = yOf(ai) + CH / 2;
      out += `<g class="zl" data-zl="${zl}">`;
      out += pathEdge(`M ${CX + side * CW / 2} ${yOf(ai)} C ${dx - side * 40} ${yOf(ai)}, ${dx} ${yMid - 70}, ${dx} ${yMid - CH / 2}`, 'variant', Math.max(2, sw * 0.8), 'arr-variant');
      if (ri != null) {
        out += pathEdge(`M ${dx} ${yMid + CH / 2} C ${dx} ${yMid + 70}, ${dx - side * 40} ${yOf(ri)}, ${CX + side * CW / 2} ${yOf(ri)}`, 'variant', Math.max(2, sw * 0.8), 'arr-variant');
      }
      out += nodeCard(dx, yMid, CW - 20, CH - 6, st, casesN, true, wf, v);
      out += `<text class="p-variant-tag" x="${dx}" y="${yMid - CH / 2 - 10}" text-anchor="middle">${v.label} · # ${fmt(casesN)}</text>`;
      out += `</g>`;
    }
  });

  /* spine nodes on top */
  wf.steps.forEach((s, i) => {
    const stepCases = spineCases + Math.round(wf.cases * 0.28 * Math.max(0, 1 - i * 0.06));
    out += nodeCard(CX, yOf(i), CW, CH, s, Math.min(wf.cases, stepCases), false, wf, null);
  });

  out += '</svg>';
  $('#process-stage').innerHTML = out;
  $('#process-stage').style.width = W + 'px';
  scroll.scrollTop = 0;

  // node click → detail panel
  $$('#pmap .p-node').forEach(nd => {
    nd.addEventListener('click', e => {
      e.stopPropagation();
      $$('#pmap .p-node').forEach(m => m.classList.remove('selected'));
      nd.classList.add('selected');
      openDetail(wf, nd.dataset.label, +nd.dataset.cases, nd.dataset.owner, nd.dataset.tool);
    });
  });
  scroll.addEventListener('click', closeDetail);
}

function edge(x1, y1, x2, y2, cls, sw, marker) {
  return `<line class="p-edge ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${sw}" marker-end="url(#${marker})"/>`;
}
function pathEdge(d, cls, sw, marker) {
  return `<path class="p-edge ${cls}" d="${d}" stroke-width="${sw}" marker-end="url(#${marker})"/>`;
}
function durPill(x, y, dur) {
  const w = 14 + dur.length * 6.4;
  return `<g class="p-durpill"><rect x="${x}" y="${y - 11}" width="${w + 18}" height="22" rx="11"/>
    <circle class="clock" cx="${x + 12}" cy="${y}" r="5"/><path class="clock" d="M ${x + 12} ${y - 3} L ${x + 12} ${y} L ${x + 14.5} ${y + 1}"/>
    <text x="${x + 22}" y="${y + 3.5}">${dur}</text></g>`;
}
function nodeCard(cx, cy, w, h, step, cases, extra, wf, variant) {
  const x = cx - w / 2, y = cy - h / 2;
  const owner = firstName(step.owner);
  const tool = toolById(step.tool)?.name || step.tool;
  return `<g class="p-node ${extra ? 'extra' : ''}" data-label="${step.label}" data-cases="${cases}" data-owner="${step.owner}" data-tool="${step.tool}">
    <rect class="card" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>
    <circle class="n-dot" cx="${x + 20}" cy="${cy - 8}" r="6"/>
    <text class="n-label" x="${x + 34}" y="${cy - 4}">${step.label}</text>
    <text class="n-freq" x="${x + 34}" y="${cy + 14}"># ${fmt(cases)}</text>
    <text class="n-owner" x="${x + w - 12}" y="${cy + 14}" text-anchor="end">${owner} · ${tool}</text>
  </g>`;
}

/* ---- activity detail panel ---- */
function openDetail(wf, label, cases, ownerId, toolId) {
  const pct = Math.min(100, Math.round((cases / wf.cases) * 100));
  const person = personById(ownerId);
  const panel = $('#detail-panel');
  const ring = (p) => {
    const r = 13, c = 2 * Math.PI * r;
    return `<svg class="dp-ring" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="${r}" fill="none" stroke="#e4e8f2" stroke-width="4"/>
      <circle cx="17" cy="17" r="${r}" fill="none" stroke="#3b5bff" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${(p / 100) * c} ${c}" transform="rotate(-90 17 17)"/></svg>`;
  };
  panel.innerHTML = `
    <div class="dp-head">
      <div class="dp-title"><span class="dp-ico">⬡</span>${label}</div>
      <button class="dp-close" id="dp-close">✕</button>
    </div>
    <div class="dp-stats">
      <div class="dp-stat">${ring(pct)}<div><div class="big">${pct}% of cases</div><div class="small"># ${fmt(cases)} of ${fmt(wf.cases)}</div></div></div>
      <div class="dp-stat"><div class="dp-ring" style="display:grid;place-items:center;font-size:13px">#</div>
        <div><div class="big">${fmt(cases)} times</div><div class="small">Activity frequency</div></div></div>
      <div class="dp-stat"><div class="dp-ring" style="display:grid;place-items:center;font-size:12px">👤</div>
        <div><div class="big">${person?.name || ownerId}</div><div class="small">${toolById(toolId)?.name || toolId}</div></div></div>
    </div>
    <div class="dp-section-label">Filter cases</div>
    <div class="dp-filters">
      <button class="dp-filter primary"><span>with this activity</span><span class="cnt"># ${fmt(cases)} (${pct}%)</span></button>
      <button class="dp-filter"><span>without this activity</span><span class="cnt"># ${fmt(wf.cases - cases)} (${100 - pct}%)</span></button>
      <button class="dp-filter"><span>starting at this activity</span><span class="cnt">0 cases (0%)</span></button>
      <button class="dp-filter"><span>ending at this activity</span><span class="cnt"># ${fmt(Math.round(cases * 0.02))} (${Math.max(0, Math.round(pct * 0.02))}%)</span></button>
    </div>`;
  panel.classList.add('open');
  $('#dp-close').addEventListener('click', closeDetail);
}
function closeDetail() {
  $('#detail-panel').classList.remove('open');
  $$('#pmap .p-node').forEach(m => m.classList.remove('selected'));
}

/* ============================================================
   Boot
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  initGraph();
  renderZoomSegs();
  $('#gs-list').innerHTML = ATLAS.departments.map(d =>
    `<button class="gs-item" data-d="${d.id}">${d.name}<span class="gs-count">${d.workflows.length} workflows</span></button>`).join('');
  $$('#gs-list .gs-item').forEach(b => b.addEventListener('click', () => showDept(b.dataset.d)));
  showGraph();
  $('#zoom-in').addEventListener('click', () => setZoom(state.zoom + 1));
  $('#zoom-out').addEventListener('click', () => setZoom(state.zoom - 1));
  $('#focus-close').addEventListener('click', closeFocus);
  $('#focus-overlay').addEventListener('click', e => { if (e.target === $('#focus-overlay')) closeFocus(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.wf) closeFocus();
      else if (state.dept) showGraph();
    }
    if (state.wf && (e.key === '+' || e.key === '=')) setZoom(state.zoom + 1);
    if (state.wf && e.key === '-') setZoom(state.zoom - 1);
  });
});
