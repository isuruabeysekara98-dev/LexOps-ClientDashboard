// ---------------------------------------------------------------------------
// Mission Control — the real-time workflow map.
// ---------------------------------------------------------------------------
// TS Mission Control PRD v0.1, §6 P0: "a real time view of Teams Squared as a
// graph, expressed in terms of workflows, and people as nodes". §7 asks for two
// of them: a workflow map with a filter, a start and a stop; and a hierarchy
// map with a person filter, most senior to most junior.
//
// This component owns *state and chrome only*. It renders through the existing
// <ProposalCanvas>, and every colour, radius, glyph and motion constant comes
// from proposalCanvas/theme.js and language.js. There is deliberately no second
// renderer and no second palette here: a workflow map that drifts from the
// proposal map is two products, and the whole argument of the canvas module is
// that the difference between graph products is layout config, not a fork.
//
// THE FILTER GREYS, IT DOES NOT REMOVE.
// Both filters resolve to `dimmedIds`, the prop ProposalCanvas already has for
// exactly this. Filtering by removal was the first cut and it was wrong: taking
// the other five workflows off the canvas loses the one thing the map is for,
// which is seeing that the thread you are looking at sits inside a bigger
// picture and hands off into it. Greyed work is context, not noise — so it
// stays drawn, stays dim, and the view re-frames onto what is lit.
// ---------------------------------------------------------------------------
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import ProposalCanvas from "./ProposalCanvas.jsx";
import NodeGlyph from "./proposalCanvas/NodeGlyph.jsx";
import CopilotPanel from "./missionControl/CopilotPanel.jsx";
import { PALETTE, colourFor } from "./proposalCanvas/language.js";
import { KIND_LABEL } from "./proposalCanvas/nodeContract.js";
import {
  DARK, RADIUS, liquidGlass, atmosphere, grainOverlay, eyebrow,
  pill, pillOn, pillHuman, pillHumanOn,
  segmentTrack, segment, segmentOn, segmentRule, fieldDark,
} from "./proposalCanvas/theme.js";
import {
  THREADS, PEOPLE, TIER_LABEL, CAPTURE, CHANNELS,
  buildWorkflowGraph, buildPeopleGraph,
  threadById, stepById, neighboursOf, touchpointsFor, workflowsFor,
} from "../data/missionControl.js";

/* What a thread's terminal state actually means — PRD §7 wants a stop, and
   "the last bubble" is not the same fact as "how it ended". */
const STOP_CAP = {
  closed: { text: "Ends closed", colour: PALETTE.green },
  stalled: { text: "Ends unresolved", colour: PALETTE.red },
  pending: { text: "Ends awaiting review", colour: PALETTE.amber },
  weak: { text: "Not a thread", colour: PALETTE.primaryLight },
};

const EVIDENCE_GLOSS = {
  committed: null,
  scoped: "Strong evidence — a shared artifact links this, but no quote proves the handoff.",
  exploratory: "Weak evidence — keyword similarity only. Not a confirmed link.",
};

const KIND_GLOSS = {
  trigger: "This is what sets the work off.",
  step: "Ordinary work — nobody is deciding anything here.",
  ai: "A model did part of this, alongside the person.",
  hitl: "A person decides here — this one does not run itself.",
  gate: "The path splits here, on someone's call.",
  artifact: "Something was produced here that the firm keeps.",
  system: "A channel the work lived in. Touchpoints orbit it.",
};

function Stat({ n, label }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n}</div>
      <div style={{ ...eyebrow, fontSize: 9.5, marginTop: 5, color: DARK.textFaint }}>{label}</div>
    </div>
  );
}

/** Coverage, as a ring. The most important number on the page is how little of
 *  the week was actually recorded, so it is never more than a glance away. */
function CoverageRing({ pct }) {
  const r = 18, c = 2 * Math.PI * r, on = (c * pct) / 100;
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(157,181,201,0.25)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={PALETTE.primary} strokeWidth="4"
        strokeDasharray={`${on.toFixed(1)} ${c.toFixed(1)}`} strokeLinecap="round"
        transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={DARK.text}>{pct}%</text>
    </svg>
  );
}

function KeyRow({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5,
      color: DARK.textSub, marginBottom: 7, lineHeight: 1.3 }}>
      <span style={{ flex: "none", display: "flex" }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
function LineIcon({ colour, dash, w = 2 }) {
  return (
    <svg width="22" height="10" aria-hidden="true">
      <line x1="1" y1="5" x2="21" y2="5" stroke={colour} strokeWidth={w} strokeDasharray={dash || undefined} />
    </svg>
  );
}

export default function MissionControlPage({ navigate, onLogout }) {
  const [view, setView] = useState("wf");            // wf | people
  const [wfFocus, setWfFocus] = useState("confirmed");
  const [wfPerson, setWfPerson] = useState("all");
  const [person, setPerson] = useState("all");
  const [lensHuman, setLensHuman] = useState(false);
  const [lensEvidence, setLensEvidence] = useState(false);
  const [lensChannel, setLensChannel] = useState(false);
  const [includeWeak, setIncludeWeak] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [keyOpen, setKeyOpen] = useState(true);

  /* ProposalCanvas takes an explicit height because the layout depends on it —
     the pipeline preset spreads its lanes across it. This is a full-height
     console rather than a card in a document, so it has to be measured rather
     than guessed, and re-measured when the window changes. */
  const stageRef = useRef(null);
  const [stageH, setStageH] = useState(640);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setStageH((prev) => {
      const h = Math.max(420, Math.round(el.clientHeight));
      return Math.abs(prev - h) > 8 ? h : prev;
    });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(
    () => (view === "wf" ? buildWorkflowGraph({ withChannels: lensChannel })
                         : buildPeopleGraph({ includeWeak })),
    [view, lensChannel, includeWeak],
  );

  /* Scenario lists must be referentially stable or ProposalCanvas re-runs its
     layout effect every render and the physics never settles. */
  const scenarios = useMemo(
    () => (view === "wf"
      ? THREADS.map((t) => ({ id: t.id, label: `${t.n} ${t.name}` }))
      : [1, 2, 3, 4, 5].map((n) => ({ id: `tier${n}`, label: `Tier ${n}` }))),
    [view],
  );

  /** Which threads the workflow filter puts in focus. */
  const litThreads = useMemo(() => {
    if (wfFocus === "all") return THREADS;
    if (wfFocus === "confirmed") return THREADS.filter((t) => !t.unconfirmed);
    if (wfFocus === "unconfirmed") return THREADS.filter((t) => t.unconfirmed);
    return THREADS.filter((t) => t.id === wfFocus);
  }, [wfFocus]);

  // ---- the grey-out ------------------------------------------------------
  const dimmedIds = useMemo(() => {
    const dim = new Set();
    if (view === "wf") {
      const lit = new Set(litThreads.map((t) => t.id));
      for (const n of graph.nodes) {
        const mc = n.mc || {};
        if (!lit.has(mc.threadId)) { dim.add(n.id); continue; }
        if (wfPerson !== "all" && !mc.isChannel && mc.who !== wfPerson) { dim.add(n.id); continue; }
        if (lensHuman && n.kind !== "hitl" && n.kind !== "gate") { dim.add(n.id); continue; }
        if (lensEvidence && n.confidence !== "committed") dim.add(n.id);
      }
    } else if (person !== "all") {
      const near = neighboursOf(person, includeWeak);
      for (const n of graph.nodes) {
        if (n.id !== person && !near[n.id]) dim.add(n.id);
      }
    } else if (lensHuman) {
      for (const n of graph.nodes) if (!PEOPLE[n.id]?.decision) dim.add(n.id);
    }
    return dim;
  }, [view, graph, litThreads, wfPerson, person, lensHuman, lensEvidence, includeWeak]);

  const openNode = useCallback((id) => setSelectedId((prev) => (prev === id ? null : id)), []);

  // ---- headline counts, all derived ---------------------------------------
  const stats = useMemo(() => {
    if (view === "wf") {
      let steps = 0, handoffs = 0, human = 0, outputs = 0;
      for (const th of litThreads) {
        steps += th.steps.length;
        for (const s of th.steps) {
          if (s.kind === "hitl" || s.kind === "gate") human += 1;
          if (s.kind === "artifact") outputs += 1;
        }
        for (const l of th.links) {
          const a = th.steps.find((s) => s.id === l.from);
          const b = th.steps.find((s) => s.id === l.to);
          if (a && b && a.who !== b.who) handoffs += 1;
        }
      }
      return [
        { n: litThreads.length, label: "Workflows" },
        { n: steps, label: "Touchpoints" },
        { n: handoffs, label: "Handoffs" },
        { n: human, label: "Human checkpoints" },
        { n: outputs, label: "Outputs" },
        { n: litThreads.filter((t) => t.status !== "closed").length, label: "Not closed" },
      ];
    }
    const ids = Object.keys(PEOPLE);
    const total = ids.reduce((a, id) => a + touchpointsFor(id, includeWeak), 0) / 2;
    return [
      { n: ids.length, label: "People" },
      { n: Math.round(total), label: "Touchpoints" },
      { n: ids.filter((i) => PEOPLE[i].decision).length, label: "Decision makers" },
      { n: ids.filter((i) => !PEOPLE[i].clip).length, label: "No footage" },
    ];
  }, [view, litThreads, includeWeak]);

  const selected = selectedId ? graph.nodes.find((n) => n.id === selectedId) : null;

  return (
    <div style={{
      minHeight: "100vh", background: DARK.bg, backgroundImage: atmosphere,
      color: DARK.text, fontFamily: "'Satoshi', sans-serif",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      <div style={grainOverlay} />

      {/* ---------------------------------------------------------------- */}
      <header style={{
        position: "relative", zIndex: 2, display: "flex", alignItems: "center",
        gap: 18, padding: "16px 24px", borderBottom: `1px solid ${DARK.borderFaint}`,
      }}>
        <button onClick={() => navigate("/")} style={{
          ...pill, padding: "6px 12px", background: "transparent", cursor: "pointer",
        }}>← Back</button>

        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Mission Control
          </h1>
          <div style={{ fontSize: 11.5, color: DARK.textFaint, marginTop: 2 }}>
            Teams Squared · workflow intelligence · 19–25 Aug 2026
          </div>
        </div>

        <div style={{ ...segmentTrack, marginLeft: 12 }}>
          <button style={view === "wf" ? segmentOn : segment}
            aria-pressed={view === "wf"}
            onClick={() => { setView("wf"); setSelectedId(null); }}>Workflows</button>
          <div style={segmentRule} />
          <button style={view === "people" ? segmentOn : segment}
            aria-pressed={view === "people"}
            onClick={() => { setView("people"); setSelectedId(null); }}>People</button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
          {stats.map((s) => <Stat key={s.label} n={s.n} label={s.label} />)}
        </div>

        <button onClick={onLogout} style={{ ...pill, marginLeft: 8 }}>Sign out</button>
      </header>

      <div style={{ position: "relative", zIndex: 2, display: "flex", flex: 1, minHeight: 0 }}>
        {/* ---- left rail: the filters -------------------------------------- */}
        <aside style={{
          width: 286, flex: "none", padding: "18px 16px 24px",
          borderRight: `1px solid ${DARK.borderFaint}`, overflowY: "auto",
        }}>
          {view === "wf" ? (
            <>
              <label style={{ ...eyebrow, display: "block", marginBottom: 7 }} htmlFor="mc-wf">
                Bring a workflow forward
              </label>
              <select id="mc-wf" style={fieldDark} value={wfFocus}
                onChange={(e) => { setWfFocus(e.target.value); setSelectedId(null); }}>
                <option value="all">Everything lit (6)</option>
                <option value="confirmed">Confirmed only (3)</option>
                <option value="unconfirmed">Unconfirmed only (3)</option>
                <optgroup label="One workflow, rest greyed">
                  {THREADS.map((t) => <option key={t.id} value={t.id}>{t.n} — {t.name}</option>)}
                </optgroup>
              </select>

              <label style={{ ...eyebrow, display: "block", margin: "18px 0 7px" }} htmlFor="mc-wfp">
                Bring a person forward
              </label>
              <select id="mc-wfp" style={fieldDark} value={wfPerson}
                onChange={(e) => setWfPerson(e.target.value)}>
                <option value="all">Everyone lit</option>
                {Object.values(PEOPLE).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div style={{ ...eyebrow, margin: "20px 0 8px" }}>Lenses</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button style={lensHuman ? pillHumanOn : pillHuman} aria-pressed={lensHuman}
                  onClick={() => setLensHuman((v) => !v)}>Where a person decides</button>
                <button style={lensEvidence ? pillOn : pill} aria-pressed={lensEvidence}
                  onClick={() => setLensEvidence((v) => !v)}>Explicit evidence only</button>
                <button style={lensChannel ? pillOn : pill} aria-pressed={lensChannel}
                  onClick={() => setLensChannel((v) => !v)}>Show channels</button>
              </div>

              <div style={{ ...eyebrow, margin: "22px 0 8px", display: "flex", justifyContent: "space-between" }}>
                <span>Workflows</span>
                <span style={{ color: DARK.textFaint }}>{litThreads.length} of {THREADS.length} lit</span>
              </div>
              {THREADS.map((t) => {
                const lit = litThreads.some((x) => x.id === t.id);
                const cap = STOP_CAP[t.status];
                return (
                  <button key={t.id}
                    onClick={() => { setWfFocus((f) => (f === t.id ? "all" : t.id)); setSelectedId(null); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 5,
                      borderRadius: RADIUS.inner, cursor: "pointer",
                      border: `1px solid ${wfFocus === t.id ? DARK.borderStrong : "transparent"}`,
                      background: wfFocus === t.id ? DARK.card : "transparent",
                      color: DARK.text, opacity: lit ? 1 : 0.38,
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{t.n}  {t.name}</div>
                    <div style={{ fontSize: 11, color: DARK.textFaint, marginTop: 4, display: "flex", gap: 9 }}>
                      <span style={{ color: cap.colour }}>{t.statusLabel}</span>
                      <span>{t.steps.length} touchpoints</span>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <label style={{ ...eyebrow, display: "block", marginBottom: 7 }} htmlFor="mc-p">
                Bring a person forward
              </label>
              <select id="mc-p" style={fieldDark} value={person}
                onChange={(e) => { setPerson(e.target.value); setSelectedId(e.target.value === "all" ? null : e.target.value); }}>
                <option value="all">Everyone lit (10)</option>
                {[1, 2, 3, 4, 5].map((tier) => (
                  <optgroup key={tier} label={`Tier ${tier}`}>
                    {Object.values(PEOPLE).filter((p) => p.tier === tier)
                      .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>

              <div style={{ ...eyebrow, margin: "20px 0 8px" }}>Lenses</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button style={lensHuman ? pillHumanOn : pillHuman} aria-pressed={lensHuman}
                  onClick={() => setLensHuman((v) => !v)}>Decision makers only</button>
                <button style={includeWeak ? pillOn : pill} aria-pressed={includeWeak}
                  onClick={() => setIncludeWeak((v) => !v)}>Include weak ties</button>
              </div>

              <div style={{ ...eyebrow, margin: "22px 0 8px", display: "flex", justifyContent: "space-between" }}>
                <span>Most connected</span>
                <span style={{ color: DARK.textFaint }}>by touchpoints</span>
              </div>
              {Object.values(PEOPLE)
                .map((p) => ({ p, w: touchpointsFor(p.id, includeWeak), n: workflowsFor(p.id, includeWeak) }))
                .sort((a, b) => b.w - a.w)
                .map(({ p, w, n }) => {
                  const near = person !== "all" ? neighboursOf(person, includeWeak) : null;
                  const lit = !near || p.id === person || near[p.id];
                  return (
                    <button key={p.id}
                      onClick={() => {
                        const next = person === p.id ? "all" : p.id;
                        setPerson(next); setSelectedId(next === "all" ? null : p.id);
                      }}
                      style={{
                        width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 5,
                        borderRadius: RADIUS.inner, cursor: "pointer",
                        border: `1px solid ${person === p.id ? DARK.borderStrong : "transparent"}`,
                        background: person === p.id ? DARK.card : "transparent",
                        color: DARK.text, opacity: lit ? 1 : 0.38,
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
                        <span style={{
                          width: 9, height: 9, borderRadius: "50%", flex: "none",
                          background: p.decision ? PALETTE.amber : PALETTE.primary,
                        }} />
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: DARK.textFaint, marginTop: 4, display: "flex", gap: 9, flexWrap: "wrap" }}>
                        <span>{w} touchpoints</span>
                        <span>{n} workflow{n === 1 ? "" : "s"}</span>
                        {p.decision && <span style={{ color: PALETTE.amber }}>Decides</span>}
                        {!p.clip && <span style={{ color: PALETTE.primaryLight }}>No clip</span>}
                      </div>
                    </button>
                  );
                })}
            </>
          )}

          {/* Coverage. Present on both views on purpose — it qualifies everything. */}
          <div style={{
            marginTop: 22, padding: 13, borderRadius: RADIUS.inner,
            background: DARK.card, border: `1px solid ${DARK.border}`,
            display: "flex", gap: 13, alignItems: "center",
          }}>
            <CoverageRing pct={CAPTURE.pct} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{CAPTURE.hours} h</div>
              <div style={{ fontSize: 11.5, color: DARK.textFaint, lineHeight: 1.4, marginTop: 5 }}>
                captured across {CAPTURE.personDays} person-days. Everything outside it is
                inference — a gap may be work, not idle time.
              </div>
            </div>
          </div>
        </aside>

        {/* ---- the map ----------------------------------------------------- */}
        <main ref={stageRef} style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
          <ProposalCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            preset={view === "wf" ? "pipeline" : "program"}
            scenarios={scenarios}
            dimmedIds={dimmedIds}
            selectedId={selectedId}
            onSelect={openNode}
            height={stageH}
            bare
            /* keep the graph clear of the floating key and the panel */
            insets={[
              { top: 0, right: 282, bottom: 0, left: 0 },
              { top: 0, right: 0, bottom: 120, left: 0 },
            ]}
          />

          {/* the key */}
          <div style={{ ...liquidGlass, position: "absolute", right: 18, top: 18, width: 246, padding: "13px 15px", zIndex: 3 }}>
            <button onClick={() => setKeyOpen((v) => !v)}
              aria-expanded={keyOpen}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "none", border: "none", color: DARK.text, cursor: "pointer", padding: 0 }}>
              <span style={{ ...eyebrow, flex: 1, textAlign: "left" }}>The key</span>
              <span style={{ color: DARK.textFaint, transform: keyOpen ? "none" : "rotate(-90deg)", transition: "transform 240ms" }}>▾</span>
            </button>
            {keyOpen && (
              <div style={{ marginTop: 10 }}>
                {view === "wf" ? (
                  <>
                    <KeyRow icon={<NodeGlyph kind="trigger" colour={PALETTE.amber} />}><strong>Trigger</strong> — work enters here</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="step" colour={PALETTE.amber} />}><strong>Step</strong> — a person doing ordinary work</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="ai" colour={PALETTE.primary} />}><strong>AI-assisted</strong> — a model helped</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="gate" colour={PALETTE.amber} />}><strong>Decision</strong> — the path splits</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="hitl" colour={PALETTE.amber} />}><strong>Checkpoint</strong> — a person decides</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="artifact" colour={PALETTE.green} />}><strong>Output</strong> — produced and kept</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="system" colour={PALETTE.primaryLight} />}><strong>Channel</strong> — where it happened</KeyRow>
                    <KeyRow icon={<LineIcon colour={PALETTE.primary} />}>Explicit — a named handoff</KeyRow>
                    <KeyRow icon={<LineIcon colour={PALETTE.primary} dash="5 5" />}>Strong or weak — see the bubble's fade</KeyRow>
                    <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${DARK.borderFaint}`,
                      fontSize: 11, color: DARK.textFaint, lineHeight: 1.45 }}>
                      A faded bubble is weaker evidence, not lesser work. Amber everywhere is
                      the finding: none of this is automated.
                    </div>
                  </>
                ) : (
                  <>
                    <KeyRow icon={
                      <svg width="22" height="16" aria-hidden="true">
                        <circle cx="7" cy="8" r="4" fill="none" stroke={PALETTE.amber} strokeWidth="1.8" />
                        <circle cx="16" cy="8" r="6.4" fill="none" stroke={PALETTE.amber} strokeWidth="1.8" />
                      </svg>}>Bubble size = workflows carried</KeyRow>
                    <KeyRow icon={
                      <svg width="22" height="16" aria-hidden="true">
                        <line x1="2" y1="5" x2="20" y2="5" stroke={PALETTE.primary} strokeWidth="1.4" opacity=".55" />
                        <line x1="2" y1="12" x2="20" y2="12" stroke={PALETTE.primary} strokeWidth="4" opacity=".5" strokeLinecap="round" />
                      </svg>}>Line weight = observed touchpoints</KeyRow>
                    <KeyRow icon={<NodeGlyph kind="gate" colour={PALETTE.amber} />}><strong>Decision maker</strong> — gates others</KeyRow>
                    <KeyRow icon={<LineIcon colour={PALETTE.primaryLight} dash="5 5" w={1.2} />}>Reports to — inferred from sign-off</KeyRow>
                    <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${DARK.borderFaint}`,
                      fontSize: 11, color: DARK.textFaint, lineHeight: 1.45 }}>
                      A faded bubble is someone with no capture of their own. The hierarchy is a
                      hypothesis read off who signs off on what — click a person for the basis.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {selected && (
            <DetailPanel node={selected} view={view} onClose={() => setSelectedId(null)} />
          )}
        </main>

        {/* ---- copilot ----------------------------------------------------- */}
        <CopilotPanel
          view={view}
          onAct={(act) => {
            if (act.view) { setView(act.view); setSelectedId(null); }
            if (act.wf) { setWfFocus(act.wf); setWfPerson("all"); }
            if (act.person) { setPerson(act.person); setSelectedId(act.person); }
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Row({ k, children }) {
  return (
    <>
      <dt style={{ ...eyebrow, fontSize: 9.5, color: DARK.textFaint, paddingTop: 3 }}>{k}</dt>
      <dd style={{ margin: 0, color: DARK.text }}>{children}</dd>
    </>
  );
}

/** The inline panel. Never modal — the map has to stay visible beside it. */
function DetailPanel({ node, view, onClose }) {
  const mc = node.mc || {};

  let kicker, title, gloss, body;

  if (mc.isPerson) {
    const p = PEOPLE[mc.personId];
    const near = neighboursOf(mc.personId);
    const reports = Object.values(PEOPLE).filter((x) => x.reportsTo === mc.personId);
    const wfs = new Set();
    for (const t of Object.values(THREADS)) {
      if (t.steps.some((s) => s.who === mc.personId)) wfs.add(t.id);
    }
    kicker = `Person · Tier ${p.tier}`;
    title = p.name;
    gloss = p.decision ? "A decision maker — they gate other people's work." : null;
    body = (
      <>
        <p style={{ margin: "0 0 9px" }}>
          {p.role}{p.loc ? `, ${p.loc}` : ""}.{" "}
          {p.clip ? `Captured ${p.clip}.`
                  : <strong>No capture of their own — everything here is seen from someone else's screen.</strong>}
        </p>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", margin: "12px 0 0",
          paddingTop: 12, borderTop: `1px solid ${DARK.borderFaint}`, fontSize: 12 }}>
          <Row k="Reports to">{p.reportsTo ? PEOPLE[p.reportsTo].name : "— top of the observed chain"}</Row>
          <Row k="Basis">{p.basis}</Row>
          {reports.length > 0 && <Row k="Reported to by">{reports.map((x) => x.short).join(", ")}</Row>}
          <Row k="Workflows">
            {[...wfs].map((id) => `${threadById(id).n} ${threadById(id).name}`).join(" · ")}
          </Row>
          <Row k="Touchpoints">
            {touchpointsFor(mc.personId)} observed across {Object.keys(near).length} people
          </Row>
          <Row k="Works with">
            {Object.entries(near).map(([id, t]) => `${PEOPLE[id].short} ${t.w}×`).join(", ")}
          </Row>
        </dl>
      </>
    );
  } else if (mc.isChannel) {
    kicker = "Channel";
    title = node.label;
    gloss = KIND_GLOSS.system;
    body = <p style={{ margin: 0 }}>{node.description}</p>;
  } else {
    const found = stepById(node.id);
    const s = found?.step, th = found?.thread;
    const p = s ? PEOPLE[s.who] : null;
    const inbound = th ? th.links.filter((l) => l.to === s.id) : [];
    const outbound = th ? th.links.filter((l) => l.from === s.id) : [];
    kicker = `${KIND_LABEL[node.kind] || node.kind} · ${th ? `${th.n} ${th.name}` : ""}`;
    title = node.label;
    gloss = KIND_GLOSS[node.kind];
    body = (
      <>
        {s?.quote && (
          <div style={{ borderLeft: `2px solid ${PALETTE.primary}`, padding: "3px 0 3px 11px",
            margin: "10px 0", fontStyle: "italic", color: DARK.text }}>
            “{s.quote}”
          </div>
        )}
        <p style={{ margin: "0 0 9px" }}>{node.description}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", margin: "12px 0 0",
          paddingTop: 12, borderTop: `1px solid ${DARK.borderFaint}`, fontSize: 12 }}>
          <Row k="Who">{p ? `${p.name} — ${p.role}` : "—"}</Row>
          <Row k="When">{mc.at} UTC</Row>
          <Row k="Channel">{CHANNELS[mc.channel]?.label}</Row>
          <Row k="Leaves it">{mc.state}</Row>
          {inbound.length > 0 && (
            <Row k="Arrived via">
              {inbound.map((l) => `${stepById(l.from).step.label} (${l.tier})`).join(" · ")}
            </Row>
          )}
          <Row k="Next">
            {outbound.length
              ? outbound.map((l) => {
                  const nx = stepById(l.to).step;
                  return `${nx.label} → ${PEOPLE[nx.who].short}`;
                }).join(" · ")
              : <em>Nothing follows on camera</em>}
          </Row>
          {EVIDENCE_GLOSS[node.confidence] && <Row k="Evidence">{EVIDENCE_GLOSS[node.confidence]}</Row>}
          {mc.verified && (
            <Row k="Verified">
              Independently captured on two machines 68 seconds apart — the strongest link in the dataset.
            </Row>
          )}
          {mc.offcamera && (
            <Row k="Note">Reconstructed from a reference on someone else's screen. Not directly captured.</Row>
          )}
          {mc.stop && th && <Row k="Ends">{STOP_CAP[th.status].text} — {th.caveat}</Row>}
        </dl>
      </>
    );
  }

  return (
    <div style={{
      ...liquidGlass, position: "absolute", left: 18, bottom: 18, width: 340,
      padding: "16px 18px 17px", maxHeight: "calc(100% - 60px)", overflowY: "auto", zIndex: 4,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...eyebrow, fontSize: 10 }}>{kicker}</div>
          <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.25, marginTop: 3 }}>{title}</div>
          {gloss && <div style={{ fontSize: 11.5, color: PALETTE.amber, marginTop: 5, lineHeight: 1.4 }}>{gloss}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{
          background: "none", border: "none", color: DARK.textFaint, fontSize: 15, cursor: "pointer", padding: "2px 4px",
        }}>✕</button>
      </div>
      <div style={{ fontSize: 12.8, color: DARK.textSub, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}
