// ---------------------------------------------------------------------------
// The Living Proposal — /p/:token
// ---------------------------------------------------------------------------
// Day 1 renders the graph as a plain list of nodes with their needs and gives.
// This is deliberate: the canvas (day 2) replaces exactly one component here,
// so a bad canvas day costs polish rather than the pilot. Resist styling this.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ProposalCanvas from "./ProposalCanvas.jsx";
import { formatMetric, graphCounts, countChips } from "./proposalCanvas/units.js";
import { readNode, isAnswered, KIND_LABEL, ACTOR_LABEL } from "./proposalCanvas/nodeContract.js";
import NodePanel from "./NodePanel.jsx";
import NodeStory from "./NodeStory.jsx";
import ExplainerPlayer from "./ExplainerPlayer.jsx";
import ProposalActs, { ActsPill } from "./ProposalActs.jsx";
import NodeGlyph from "./proposalCanvas/NodeGlyph.jsx";
import { compileExplainers } from "@shared/explainerScript";
import {
  DARK, MOTION, RADIUS, darkGlass, liquidGlass, atmosphere, grainOverlay,
  pill, pillOn, pillHuman, pillHumanOn,
  segmentTrack, segment, segmentOn, segmentRule, BREAKPOINT,
  solidDark, ghostDark, fieldDark, eyebrow,
} from "./proposalCanvas/theme.js";

const api = (token, path) => `/api/lp/p/${encodeURIComponent(token)}${path}`;

/**
 * Move a container's scroll position, and actually arrive.
 *
 * A plain `scrollTop` assignment, with the *animation* delegated to CSS
 * `scroll-behavior: smooth` on the container. Two earlier attempts failed for
 * the same underlying reason and it's worth recording:
 *
 *   - `scrollTo({ behavior: "smooth" })` returned without error and left
 *     `scrollTop` untouched.
 *   - Hand-rolling the easing in rAF fared no better — the callback never ran.
 *
 * Both depend on the compositor, and rAF is throttled to nothing whenever the
 * tab isn't painting. So a reader who opens the acts and switches tab would
 * come back to a page that never moved. Assignment always lands; CSS animates
 * it when there's a compositor to animate with, and honours reduced-motion
 * itself. The guaranteed outcome and the nice one stop being the same code.
 */
function scrollContainerTo(el, top) {
  if (!el) return;
  el.scrollTo({ top, behavior: "smooth" });
  // The guarantee. Every animated scroll path — `behavior: "smooth"`, CSS
  // `scroll-behavior`, or hand-rolled rAF easing — needs a compositor, and a
  // tab that isn't painting has none: the call returns cleanly and the page
  // never moves. A timer is not on that clock, so it can check whether the
  // glide actually happened and land the scroll outright if it didn't.
  window.setTimeout(() => {
    if (Math.abs(el.scrollTop - top) > 4) el.scrollTo({ top, behavior: "auto" });
  }, 600);
}

// Below this the map stops being the better reading — there isn't enough room
// for a bubble and its label at a legible size, and a partner opening this on a
// phone is better served by the list.
const NARROW = 860;

// Count required/optional needs over an arbitrary node subset, so the counters
// respond to the deliverable rail rather than always showing the whole graph.
// Mirrors countNeeds() on the server — that one stays authoritative for the total.
function countNeeds(nodes, inputs) {
  const answered = new Set(
    (inputs || [])
      .filter((i) => i.file_path != null || (i.value != null && String(i.value).trim() !== ""))
      .map((i) => `${i.node_id}::${i.need_id}`)
  );
  let required = 0, done = 0, optional = 0, optionalDone = 0;
  for (const node of nodes || []) {
    for (const need of node.needs || []) {
      const hit = answered.has(`${node.id}::${need.id}`);
      if (need.required === false) { optional += 1; if (hit) optionalDone += 1; }
      else { required += 1; if (hit) done += 1; }
    }
  }
  return { required, answered: done, optional, optionalAnswered: optionalDone };
}

export default function LivingProposalPage({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // node_id::need_id -> current draft value, so typing stays responsive and
  // autosave-on-blur can compare against what the server last confirmed.
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [openNodes, setOpenNodes] = useState({});

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentBack, setSentBack] = useState(false);
  // Set once the client has closed the loop from their side. Drives the
  // full-page confirmation below — `sentBack` alone can't, because a send-back
  // is a turn in an ongoing conversation while an approval ends it.
  const [approved, setApproved] = useState(false);

  // "all", or a deliverable id. Same mechanic day 3 reuses for scenario chips.
  const [deliverable, setDeliverable] = useState("all");

  // The two lenses. Both are just ways of choosing which nodes to dim, so they
  // ride the exact `dimmedIds` lever the rail and the explainer already use —
  // no new drawing path. Trust lens is a boolean; scenario is an id or null.
  const [trustLens, setTrustLens] = useState(false);
  const [scenario, setScenario] = useState(null);

  // The canvas is the default reading. The list stays available because a map
  // is a poor form on a small screen, and because it is the accessible path.
  // `null` means "follow the screen". Only an explicit toggle pins it, so a
  // window that starts narrow and gets widened still arrives at the map.
  const [view, setView] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  // The running explainer, and the map state it is driving. `stage` is null
  // whenever no film is playing, which is what hands the map back to the rail —
  // see the `dimmedIds` resolution below.
  const [explainerId, setExplainerId] = useState(null);
  const [stage, setStage] = useState(null);

  // Acts III–V. `actsSeen` kills the pill's throb permanently once it has done
  // its job — a control that keeps pulsing at someone who has already used it
  // is a control they learn to ignore.
  const [actsOpen, setActsOpen] = useState(false);
  const [actsSeen, setActsSeen] = useState(false);

  // The map is sized to the window, so it has to re-measure. Width also decides
  // which of the two readings we're in at all.
  const [viewport, setViewport] = useState(() => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // How tall the floating chrome actually is, measured rather than assumed.
  // The identity card grows with the headline and the count chips, and the rail
  // grows with the number of deliverables — a hard-coded height is wrong on the
  // first proposal that has three of something.
  const cardRef = useRef(null);
  const railRef = useRef(null);
  const [chromeH, setChromeH] = useState(0);
  useEffect(() => {
    const read = () => {
      const h = Math.max(
        cardRef.current?.offsetHeight || 0,
        railRef.current?.offsetHeight || 0
      );
      // Ignore sub-pixel churn: this feeds the layout, and a changing inset
      // rebuilds the force simulation.
      setChromeH((prev) => (Math.abs(prev - h) > 4 ? h : prev));
    };
    read();
    const ro = new ResizeObserver(read);
    if (cardRef.current) ro.observe(cardRef.current);
    if (railRef.current) ro.observe(railRef.current);
    return () => ro.disconnect();
  });

  // ?perf=1 shows the frame counter. Measured on day 2, not day 7.
  const perfMode = typeof window !== "undefined" && window.location.search.includes("perf=1");

  const openedOnce = useRef({});
  const scrollRef = useRef(null);
  const actsRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(api(token, ""));
      if (!res.ok) {
        setError(res.status === 404 ? "This link isn't valid. Check the address, or reply to the email we sent." : "Something went wrong loading your proposal.");
        return;
      }
      const json = await res.json();
      setData(json);
      const seeded = {};
      for (const input of json.inputs || []) {
        if (input.value != null) seeded[`${input.node_id}::${input.need_id}`] = input.value;
      }
      setDrafts(seeded);
    } catch {
      setError("Couldn't reach the server. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const inputFor = useCallback(
    (nodeId, needId) => (data?.inputs || []).find((i) => i.node_id === nodeId && i.need_id === needId),
    [data]
  );

  function applyResult(json, key) {
    setData((prev) => {
      if (!prev) return prev;
      const rest = (prev.inputs || []).filter(
        (i) => !(i.node_id === json.input.node_id && i.need_id === json.input.need_id)
      );
      return { ...prev, inputs: [...rest, json.input], progress: json.progress || prev.progress };
    });
    setSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
  }

  async function saveAnswer(nodeId, needId, value) {
    const key = `${nodeId}::${needId}`;
    const existing = inputFor(nodeId, needId);
    const previous = existing?.value ?? "";
    if (String(value ?? "") === String(previous ?? "")) return; // nothing changed

    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch(api(token, "/answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, need_id: needId, value }),
      });
      if (!res.ok) throw new Error("save failed");
      applyResult(await res.json(), key);
    } catch {
      setError("An answer didn't save. Check your connection — nothing you typed has been lost.");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function uploadFile(nodeId, needId, file) {
    const key = `${nodeId}::${needId}`;
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("node_id", nodeId);
      form.append("need_id", needId);
      const res = await fetch(api(token, "/upload"), { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "upload failed");
      applyResult(await res.json(), key);
    } catch (err) {
      setError(err.message || "That file didn't upload.");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  // Stable across renders: the explainer player takes this through effects, and
  // a fresh identity every render re-runs them — which for the completion event
  // means one row per render rather than one per playthrough.
  const trackEvent = useCallback((type, nodeId, meta) => {
    fetch(api(token, "/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, node_id: nodeId, meta }),
      keepalive: true,
    }).catch(() => {});
  }, [token]);

  // ---- explainers ---------------------------------------------------------
  // Authored where the proposal has them, compiled from the stages where it
  // doesn't — so a graph a team member authored this morning has films on it
  // without anyone writing a beat script. See shared/explainerScript.ts.
  //
  // Memoised, and it has to be. `compileExplainers` builds fresh beat objects
  // on every call, so recompiling per render handed the player a new `beat`
  // each time; its staging effect keys off that object, called back into
  // `setStage`, and re-rendered — an infinite loop that only appeared on
  // *compiled* explainers, because authored ones return the stored array by
  // reference and are stable by accident.
  const explainers = useMemo(
    () => compileExplainers(data?.graph || {}),
    [data?.graph],
  );

  // Above the early returns, with the other hooks: these are `useCallback`, and
  // a hook below a conditional return changes the hook order between the
  // loading render and the loaded one.
  //
  // Stable identities are the point of wrapping them at all — the player drives
  // effects off these, so a fresh identity every render would restage the map,
  // and reallocate the dim set, on every frame the clock ticks.
  // Take the reader into the acts when they open. An effect, because effects
  // run after commit — which is the first moment `actsRef` actually points at
  // anything. The pill promised "there's more"; landing them at the top of an
  // unchanged screen makes it look like the button did nothing.
  useEffect(() => {
    if (!actsOpen) return;
    const el = scrollRef.current;
    const acts = actsRef.current;
    if (el && acts) scrollContainerTo(el, acts.offsetTop);
  }, [actsOpen]);

  const onExplainerStage = useCallback((next) => setStage(next), []);

  const startExplainer = useCallback((e) => {
    setExplainerId((cur) => (cur === e.id ? null : e.id));
    setComposerOpen(false);
    trackEvent("explainer_started", e.anchor || null, { explainer: e.id, compiled: !!e.compiled });
  }, [trackEvent]);

  const stopExplainer = useCallback(() => {
    setExplainerId(null);
    setStage(null);
  }, []);

  // General feedback — a note with no node_id. Deliberately not routed through
  // send-back: a client with a reaction and nine unanswered questions should be
  // able to give us the reaction without committing the turn back to us.
  const submitFeedback = useCallback(async (body) => {
    const res = await fetch(api(token, "/note"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "comment", body }),
    });
    if (!res.ok) throw new Error("note failed");
    return res.json();
  }, [token]);

  const onExplainerEvent = useCallback(
    (type, meta) => trackEvent(type, meta?.node || null, meta),
    [trackEvent],
  );

  function toggleNode(nodeId) {
    setOpenNodes((o) => {
      const next = !o[nodeId];
      if (next && !openedOnce.current[nodeId]) {
        openedOnce.current[nodeId] = true;
        trackEvent("node_opened", nodeId);
      }
      return { ...o, [nodeId]: next };
    });
  }

  async function sendBack() {
    setSending(true);
    try {
      const res = await fetch(api(token, "/send-back"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("send failed");
      await res.json();
      setSentBack(true);
    } catch {
      setError("That didn't send. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  async function approve() {
    setSending(true);
    try {
      const res = await fetch(api(token, "/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "approve failed");
      setApproved(true);
      trackEvent("approved", null);
    } catch (e) {
      setError(e.message || "That didn't go through. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <ProposalLoading />;

  if (error && !data) return <Shell><p style={{ color: DARK.pain }}>{error}</p></Shell>;

  // ---- The confirmation page --------------------------------------------
  // A full page rather than a line inside Act VI. Submitting is the one moment
  // the client has done something irreversible-feeling, and leaving them on the
  // same screen with the same button — now doing nothing — reads as though it
  // didn't work. It also says what happens next and by when: unset expectations
  // are what make people stop checking (LIVING-PROPOSAL-PLAN.md §6b).
  if (approved || sentBack) {
    const pdf = data?.proposal?.pdf_url || null;
    return (
      <Shell>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 0 40px", textAlign: "center" }}>
          <div style={{
            width: 54, height: 54, borderRadius: "50%", margin: "0 auto 22px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: approved ? "rgba(79,191,135,0.14)" : "rgba(111,168,206,0.16)",
            border: `1px solid ${approved ? "rgba(79,191,135,0.5)" : "rgba(111,168,206,0.5)"}`,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke={approved ? "#4FBF87" : "#6FA8CE"} strokeWidth="2.2"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <h1 className="lp-thanks-h" style={{ fontWeight: 500, margin: "0 0 12px", color: DARK.text }}>
            {approved ? "Thank you — that's approved." : "Thank you — that's with us now."}
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.65, color: DARK.textSub, margin: "0 0 8px" }}>
            {approved ? (
              <>
                We've let the team know. Someone will be in touch to agree a start date and
                confirm the first steps — you don't need to do anything else here.
              </>
            ) : (
              <>
                You sent {total.answered} of {total.required}. We'll read through it and come back
                with an updated version within two working days.
              </>
            )}
          </p>

          {!approved && (
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: DARK.textMeta, margin: "0 0 26px" }}>
              This page stays live. Anything you add still reaches us, and the updated version
              will appear right here — the link doesn't change.
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
            {pdf && (
              <a href={pdf} target="_blank" rel="noopener noreferrer"
                 onClick={() => trackEvent("proposal_downloaded", null)}
                 style={{ ...primaryButton, textDecoration: "none" }}>
                Download the full proposal
              </a>
            )}
            {!approved && (
              <button onClick={() => setSentBack(false)} style={{ ...primaryButton, background: "transparent", border: `1px solid ${DARK.border}`, color: DARK.textSub }}>
                Back to the proposal
              </button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  if (!data?.graph) {
    return (
      <Shell>
        <h1>{data?.proposal?.name || "Your proposal"}</h1>
        <p>This proposal doesn't have a map yet. We'll email you as soon as it's ready.</p>
      </Shell>
    );
  }

  const { graph, proposal } = data;
  const allNodes = graph.nodes || [];
  // `graph.deliverables` carries the labels and summaries, but the column
  // arrived in the migration after it was applied — so fall back to the ids the
  // nodes themselves carry. The rail then works on a database that predates the
  // column; only the wording is worse until it's re-run.
  const deliverables = graph.deliverables?.length
    ? graph.deliverables
    : [...new Set(allNodes.map((n) => n.deliverable).filter(Boolean))].map((id) => ({
        id,
        label: id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        derived: true,
      }));
  const hasRail = deliverables.length > 1;

  // Who owns the top-right column this frame. The rail lives there by default;
  // an open node (which mounts NodeStory) and a running explainer both take it,
  // and a film takes it whether or not its current beat has selected a node —
  // otherwise the key flickers back in between two `select` beats, which reads
  // as a bug rather than as a rail.
  // A running film no longer counts here: it can't open a story any more, and
  // its own card is bottom-left, so the two never collide.
  const rightColumnBusy = !!selectedId;

  const nodes = hasRail && deliverable !== "all"
    ? allNodes.filter((n) => n.deliverable === deliverable)
    : allNodes;

  // Counters follow the rail. `total` is always the whole graph, so the send-back
  // copy never claims you're done when you've only finished one deliverable.
  const progress = countNeeds(nodes, data.inputs);
  const total = countNeeds(allNodes, data.inputs);

  const active = deliverables.find((d) => d.id === deliverable);
  const metric = active?.metric || graph.headline_metric;

  // Computed plainly rather than memoised — these graphs are tens of nodes, and
  // hooks can't run below the early returns above.
  const unmetIds = new Set(
    allNodes
      .filter((n) => (n.needs || []).some(
        (need) => need.required !== false && !isAnswered(inputFor(n.id, need.id))))
      .map((n) => n.id)
  );

  // The rail dims rather than removes, so the reader keeps the shape of the whole
  // engagement in view while reading one part of it.
  //
  // A running explainer takes the same lever: for the length of the film it owns
  // the focus, and the rail's selection is suspended rather than merged. Merging
  // the two was the first thing tried and it reads as a bug — a beat focusing an
  // Outcome 2 node while the rail is pinned to Outcome 1 dims every node in the
  // beat, so the film plays over a blank map.
  const activeExplainer = explainers.find((e) => e.id === explainerId) || null;

  // Which deliverable each scenario belongs to, read from the nodes that carry
  // it — a scenario is only meaningful inside one outcome. Grouped for the
  // dropdown so the reader picks "a case within Docs & deadlines", never a bare
  // list mixing both outcomes' branches.
  const scenarioDeliverable = new Map();
  for (const n of allNodes) {
    for (const sid of n.scenarios || []) {
      if (!scenarioDeliverable.has(sid) && n.deliverable) scenarioDeliverable.set(sid, n.deliverable);
    }
  }
  const scenarioGroups = deliverables
    .map((d) => ({
      deliverable: d,
      scenarios: (graph.scenarios || []).filter((s) => scenarioDeliverable.get(s.id) === d.id),
    }))
    .filter((g) => g.scenarios.length);
  // Scenarios whose nodes carry no deliverable (single-deliverable graphs) fall
  // through to one ungrouped bucket.
  const looseScenarios = (graph.scenarios || []).filter((s) => !scenarioDeliverable.get(s.id));

  // Where a person is still on the hook — the question the trust lens answers.
  // Same predicate the node contract and the canvas colour grammar use for amber.
  const isHumanNode = (n) =>
    n.kind === "hitl" || n.kind === "gate" ||
    n.actor === "human_client" || n.actor === "human_lexops";
  const humanCount = allNodes.filter(isHumanNode).length;

  // Every lens is just a set of ids to dim. The rail, the trust lens and the
  // scenario chip each contribute one, and they compose by union — dimming the
  // union means keeping the *intersection* visible, which is what "Outcome 1
  // AND where a human signs" should mean. A running explainer still owns the
  // map outright: mid-film the lenses are suspended, exactly like the rail.
  let dimmedIds = null;
  if (stage) {
    dimmedIds = stage.dimmed;
  } else {
    const dim = new Set();
    if (hasRail && deliverable !== "all") {
      for (const n of allNodes) if (n.deliverable !== deliverable) dim.add(n.id);
    }
    if (trustLens) {
      for (const n of allNodes) if (!isHumanNode(n)) dim.add(n.id);
    }
    if (scenario) {
      // A scenario belongs to one deliverable, so picking it focuses that
      // deliverable — like following one router branch in a make.com flow. The
      // other outcome isn't part of this case-type question, so it dims whole.
      // Within the focused deliverable: a node with no scenarios is trunk (every
      // case passes through) and stays lit; a node that names scenarios lights
      // only if it names this one.
      const focus = scenarioDeliverable.get(scenario);
      for (const n of allNodes) {
        if (focus && n.deliverable !== focus) { dim.add(n.id); continue; }
        const s = n.scenarios || [];
        if (s.length && !s.includes(scenario)) dim.add(n.id);
      }
    }
    dimmedIds = dim.size ? dim : null;
  }

  // What the canvas draws a ring around. A film's beat may point at a node, and
  // pointing is all it does now.
  const ringedId = stage?.selected ?? selectedId;

  // What opens the node story: a click, and only a click.
  //
  // This used to read `stage?.selected ?? selectedId`, so a `select` beat threw
  // the story panel open mid-film — and because the panel is a *second*
  // explanation, the reader got the film's line about one idea and a five-card
  // walkthrough of one node side by side, each with its own Next button and its
  // own progress bar. A running film owns the screen. The beat still highlights
  // its node through `ringedId` above, which is what it was actually for.
  const selectedNode = allNodes.find((n) => n.id === selectedId) || null;

  // Node lookup for the story's Input/Output cards, which name the neighbouring
  // steps rather than describing the edge.
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));

  // `null` when the graph carries no figure — the headline then simply doesn't
  // appear, rather than appearing with an invented unit.
  const shownMetric = formatMetric(metric);
  // Counts run over the whole graph, because the canvas dims rather than
  // removes: they have to describe what's actually on screen.
  const chips = countChips(graphCounts(allNodes, unmetIds));

  function openNode(id) {
    setSelectedId(id);
    if (!openedOnce.current[id]) {
      openedOnce.current[id] = true;
      trackEvent("node_opened", id);
    }
  }

  // The panel body, for both readings. Every node goes through the contract
  // first, so the map, the list and the panel cannot describe it differently.
  const panelProps = {
    drafts,
    onDraft: (key, v) => setDrafts((d) => ({ ...d, [key]: v })),
    onSave: saveAnswer,
    onUpload: uploadFile,
    saving,
    saved,
  };

  function nodeBody(node, variant = "inline") {
    return <NodePanel node={readNode(node, inputFor)} variant={variant} {...panelProps} />;
  }

  // ---- the two readings ---------------------------------------------------
  // Narrow screens, and the List toggle, get the document. Everything else gets
  // the map. They share every piece of state and the whole panel body — the
  // difference is chrome, not behaviour.
  const isNarrow = viewport.w < NARROW;
  const effectiveView = view ?? (isNarrow ? "list" : "map");
  const documentMode = isNarrow || effectiveView === "list";

  function documentLayout() {
  return (
    <Shell>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, color: DARK.textSub }}>{proposal.client_name}</p>
        <h1 style={{ margin: "4px 0 8px" }}>{proposal.name || "Your proposal"}</h1>
        {shownMetric && (
          <p style={{ fontSize: 22, margin: "0 0 4px" }}>
            <strong>{shownMetric.amount}</strong>{shownMetric.bare ? "" : " "}{shownMetric.unit}
            {shownMetric.basis ? <span style={{ fontSize: 13, color: DARK.textSub }}> — {shownMetric.basis}</span> : null}
          </p>
        )}
        {graph.headline && <p style={{ margin: 0 }}>{graph.headline}</p>}

        {/* Counts, not claims. Every one of these is read off the graph the
            canvas is drawing, so the reader can check it by counting bubbles. */}
        {chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14 }}>
            {chips.map((c) => (
              <span key={c.key} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <strong style={{ fontSize: 19, color: CHIP_COLOUR[c.tone] }}>{c.value}</strong>
                <span style={{ fontSize: 13, color: DARK.textSub }}>{c.label}</span>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* The deliverable rail. One link, one graph, a chip per piece of work.
          Day 3 renders this as chips over the canvas and adds scenarios beside it. */}
      {hasRail && (
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <RailChip
            label={`All (${allNodes.length})`}
            active={deliverable === "all"}
            onClick={() => { setDeliverable("all"); trackEvent("deliverable_selected", null, { deliverable: "all" }); }}
          />
          {deliverables.map((d) => {
            const count = allNodes.filter((n) => n.deliverable === d.id).length;
            return (
              <RailChip
                key={d.id}
                label={`${d.label} (${count})`}
                active={deliverable === d.id}
                onClick={() => { setDeliverable(d.id); trackEvent("deliverable_selected", null, { deliverable: d.id }); }}
              />
            );
          })}
        </nav>
      )}

      {active?.summary && (
        <p style={{ margin: "0 0 12px", color: DARK.textSub }}>{active.summary}</p>
      )}

      {/* Two readings of the same proposal, so this is a segmented control and
          not two buttons: a track with a hairline between the segments, and the
          selected one raised out of the glass rather than filled in. */}
      <div style={{ marginBottom: 12 }}>
        <div style={segmentTrack} role="tablist">
          <button
            role="tab"
            aria-selected={effectiveView === "map"}
            style={effectiveView === "map" ? segmentOn : segment}
            onClick={() => setView("map")}
          >
            Map
          </button>
          <span style={segmentRule} aria-hidden />
          <button
            role="tab"
            aria-selected={effectiveView === "list"}
            style={effectiveView === "list" ? segmentOn : segment}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      {/* Open loops. Persistent, and visible before anything else. */}
      <section style={box}>
        <strong>
          {progress.answered} of {progress.required} things we need from you
        </strong>
        {progress.optional > 0 && (
          <span style={{ color: DARK.textSub }}> · {progress.optionalAnswered} of {progress.optional} optional</span>
        )}
        {deliverable !== "all" && (
          <span style={{ color: DARK.textSub }}> · in {active?.label}</span>
        )}
        {progress.answered < progress.required && (
          <p style={{ margin: "6px 0 0", color: DARK.textSub, fontSize: 14 }}>
            You don't need all of them to send this back.
          </p>
        )}
        {deliverable !== "all" && total.required !== progress.required && (
          <p style={{ margin: "6px 0 0", color: DARK.textSub, fontSize: 14 }}>
            Across everything: {total.answered} of {total.required}.
          </p>
        )}
      </section>

      {error && (
        <p style={{
          color: DARK.pain, padding: 10, borderRadius: RADIUS.inner,
          borderWidth: 1, borderStyle: "solid", borderColor: "rgba(232,99,90,0.45)",
          background: "rgba(232,99,90,0.08)",
        }}>{error}</p>
      )}

      {/* The map. Clicking a bubble opens the panel day 1 already built — the
          canvas replaced the list, not the input capture underneath it. */}
      {effectiveView === "map" && (
        <ProposalCanvas
          nodes={allNodes}
          edges={graph.edges || []}
          preset={graph.preset || "pipeline"}
          /* Stable reference — a fresh [] each render would re-run the layout effect */
          scenarios={graph.scenarios}
          unmetIds={unmetIds}
          dimmedIds={dimmedIds}
          selectedId={selectedId}
          onSelect={openNode}
          height={520}
          perf={perfMode}
        />
      )}

      {/* Inline, never modal. Burying this behind a modal was v1's core defect. */}
      {effectiveView === "map" && selectedNode && (
        <section style={{ ...box, borderLeft: `4px solid ${unmetIds.has(selectedNode.id) ? DARK.human : DARK.machine}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <strong style={{ fontSize: 17 }}>{selectedNode.label}</strong>
              <div style={{ color: DARK.textSub, fontSize: 13, marginTop: 2 }}>
                {KIND_LABEL[selectedNode.kind] || selectedNode.kind}
                {selectedNode.actor ? ` · ${ACTOR_LABEL[selectedNode.actor] || selectedNode.actor}` : ""}
                {selectedNode.cluster ? ` · ${selectedNode.cluster}` : ""}
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ ...primaryButton, padding: "4px 10px" }}>
              Close
            </button>
          </div>
          {nodeBody(selectedNode)}
        </section>
      )}

      {effectiveView === "map" && !selectedNode && (
        <p style={{ color: DARK.textSub, marginTop: 0 }}>
          {unmetIds.size > 0
            ? `${unmetIds.size} bubble${unmetIds.size === 1 ? " has" : "s have"} a dashed amber ring — that's where we still need something from you.`
            : "Click any bubble to see what happens there and what you get back."}
        </p>
      )}

      {effectiveView === "list" && (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {nodes.map((node) => {
            const needs = node.needs || [];
            const unmet = needs.filter(
              (n) => n.required !== false && !isAnswered(inputFor(node.id, n.id))
            ).length;
            const open = !!openNodes[node.id];

            return (
              <li key={node.id} style={{ ...box, borderLeft: `4px solid ${unmet ? DARK.human : DARK.borderFaint}` }}>
                <button onClick={() => toggleNode(node.id)} style={nodeButton}>
                  <span>
                    <strong>{node.label}</strong>
                    <span style={{ color: DARK.textSub, fontSize: 13 }}>
                      {"  "}· {KIND_LABEL[node.kind] || node.kind}
                      {node.actor ? ` · ${ACTOR_LABEL[node.actor] || node.actor}` : ""}
                      {node.cluster ? ` · ${node.cluster}` : ""}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, color: unmet ? DARK.human : DARK.textSub }}>
                    {unmet > 0 ? `${unmet} needed` : needs.length ? "complete" : ""} {open ? "▲" : "▼"}
                  </span>
                </button>
                {open && nodeBody(node)}
              </li>
            );
          })}
        </ol>
      )}

      {/* Act VI, day-1 form: everything outstanding, one submit, always live. */}
      {/* Both closing moves live here. `sentBack` no longer branches — it takes
          over the whole page now, so a confirmation inside this box would be
          unreachable. */}
      <section style={{ ...box, marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Send this back to us</h2>
        <p style={{ color: DARK.textSub }}>
          You have {total.answered} of {total.required} filled in. Send it whenever you're
          ready — we'd rather have partial answers now than complete ones in three weeks.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything you want to flag? (optional)"
          rows={4}
          style={{ ...field, marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={sendBack} disabled={sending} style={primaryButton}>
            {sending ? "Sending…" : "Send back to LexOps"}
          </button>
          {/* Deliberately the quieter of the two. Approving ends the
              conversation, so it shouldn't be the button you hit by reflex on
              the way past — and it says what it commits you to before you do. */}
          <button
            onClick={approve}
            disabled={sending}
            style={{ ...primaryButton, background: "transparent", border: `1px solid ${DARK.border}`, color: DARK.textSub }}
            title="Tell us you're happy with this proposal as it stands"
          >
            {sending ? "…" : "Approve this proposal"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: DARK.textMeta, margin: "10px 0 0", lineHeight: 1.5 }}>
          Approving tells us you're happy to proceed and closes this round. Sending it back keeps
          the conversation going — we'll revise and return it.
        </p>
      </section>

      {/* ------------------------------------------------------------------ *
       * Acts III–VI, on the phone.
       * ------------------------------------------------------------------ *
       * These were map-only until now, and that was an oversight rather than
       * a decision: `mapLayout()` was the sole place ProposalActs and
       * ExplainerPlayer were ever mounted, so every narrow-screen visitor got
       * the node list and nothing else — no roadmap, no investment figure, no
       * maintenance options, no film. Today's actual persuasion content was
       * the part a partner on a phone could not reach, and partners open email
       * on phones.
       *
       * `NodeStory` staying map-only IS deliberate and stays that way — a
       * story is a poor form for scanning, and this list is the accessible
       * path. Acts and the explainer had no such argument anywhere.
       *
       * `scrollRoot` is null here on purpose. In the map reading the acts live
       * inside a `position: fixed` scroller, so their IntersectionObservers
       * have to be told to observe against that container. Here the document
       * itself scrolls, which is the implicit root — passing a ref would break
       * every reveal.
       * ------------------------------------------------------------------ */}
      {explainers.length > 0 && !activeExplainer && (
        <section style={{ ...box, marginTop: 24 }}>
          <p style={{ ...railHeading, marginTop: 0 }}>Watch</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {explainers.map((e) => (
              <button key={e.id} type="button" onClick={() => startExplainer(e)} style={ghostButton}>
                {e.title}
                <span style={{ color: DARK.textFaint, marginLeft: 5 }}>{Math.round(e.seconds)}s</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeExplainer && (
        <ExplainerPlayer
          explainer={activeExplainer}
          allNodes={allNodes}
          onStage={onExplainerStage}
          onClose={stopExplainer}
          onEvent={onExplainerEvent}
          inline
        />
      )}

      <ProposalActs
        sections={graph.sections || null}
        deliverables={deliverables}
        nodes={allNodes}
        proposal={proposal}
        scrollRoot={null}
        rootRef={actsRef}
        onFeedback={submitFeedback}
        onEvent={trackEvent}
      />
    </Shell>
  );
  }

  // -------------------------------------------------------------------------
  // The map reading — the canvas is the page.
  // -------------------------------------------------------------------------
  // Chrome floats over the map as glass; nothing pushes the canvas around. That
  // is not only taste: the panel overlays rather than displaces because
  // narrowing the canvas rebuilds the force layout, and every bubble — including
  // the one just clicked — would move out from under the cursor.
  function mapLayout() {
    const stageH = viewport.h;

    // The card narrows on a smaller window instead of the map's share of the
    // screen shrinking. Previously the inset was capped as a fraction of the
    // window while the card stayed 300px wide, so between 860 and ~1100px the
    // card won and sat on top of the first column of bubbles.
    const cardWidth = Math.min(300, Math.max(232, viewport.w * 0.24));

    return (
      // The scroll container. `overflow` only opens up once the acts are
      // showing, so a proposal nobody has expanded behaves exactly as before:
      // one fixed screen, no scrollbar, nothing below the fold to miss.
      <div
        ref={scrollRef}
        style={{
          ...mapRoot,
          overflowY: actsOpen ? "auto" : "hidden",
          // Deliberately no `scrollBehavior: smooth` here: it would make even
          // the fallback assignment in `scrollContainerTo` animated, and so
          // subject to the very compositor problem the fallback exists to
          // survive. The glide is requested per-call instead.
        }}
      >
      {/* The stage pins while the acts scroll up over it — the plan's "canvas
          pins for its act, then releases and the narrative continues". Sticky
          rather than fixed so it participates in the scroll container, and
          `position: sticky` still establishes the containing block every piece
          of floating glass below is absolutely positioned against. */}
      <div style={mapStage}>
        {/* Film grain over the bloom. Sits inside the pinned stage rather than
            on the scroll container, so it stays locked to the viewport instead
            of sliding away as the acts scroll up — a texture that scrolls reads
            as a pattern, and the point of grain is that you never catch it
            moving. `pointerEvents: none`, so it never eats a click on a bubble. */}
        <div style={grainOverlay} aria-hidden />
        {/* `selectedId` here is `ringedId`, not the click state: a film's beat
            can point at the node it's talking about, and drawing that ring is
            the whole of what a `select` beat does now. */}
        <ProposalCanvas
          nodes={allNodes}
          edges={graph.edges || []}
          preset={graph.preset || "pipeline"}
          scenarios={graph.scenarios}
          unmetIds={unmetIds}
          dimmedIds={dimmedIds}
          selectedId={ringedId}
          onSelect={openNode}
          height={stageH}
          perf={perfMode}
          bare
          /* Where the glass sits. Capped as a *fraction* of the window, not a
             fixed pixel count: at 1280 a flat 372+296 left the map 610px, it
             fitted at 0.45×, and every bubble fell under the size where a
             caption is legible — so the map lost its labels to its own chrome.
             The rail only exists on a multi-deliverable proposal, so a
             single-deliverable map gets the right-hand side back. */
          /* Two candidate boxes; the canvas fits into whichever gives the graph
             the larger scale.

             Beside the chrome (the old behaviour) suits a tall graph. But most
             of these graphs are wide and short, and that box left the map
             fitted to ~half the window with the entire lower screen empty —
             the chrome sits at the *top*, so reserving a full-height left
             column to avoid a 300px-tall card threw away everything beneath it.

             Below the chrome is the second box: full width, starting under
             whichever of the card and rail is taller. A short wide graph fits
             it at a much larger scale, which is what puts the dead space back
             to work and pushes bubbles above the size where captions vanish. */
          insets={[
            {
              // Beside the chrome. The left edge is derived from the card's own
              // width rather than a fraction of the window, so the card can
              // never sit on top of the first column the way it used to.
              top: 20,
              bottom: DOCK_RESERVE,
              left: cardWidth + 32,
              right: hasRail ? topRight.width + 32 : 28,
            },
            {
              // Below the chrome, full width. `chromeH` is measured, so this
              // tracks a card that grew a third line of headline.
              top: 18 + (chromeH || 240) + 16,
              bottom: DOCK_RESERVE,
              left: 28,
              right: 28,
            },
          ]}
        />

        {/* Who this is and what it's worth. Top-left, because that's where a
            reader starts, and it's the one thing that must survive a glance. */}
        <div ref={cardRef} style={{ ...glass, ...topLeft, width: cardWidth }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: DARK.textFaint }}>
            {proposal.client_name}
          </p>
          <h1 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.25, fontWeight: 600 }}>
            {proposal.name || "Your proposal"}
          </h1>

          {/* The counts. Just the title above, then what the map contains —
              every figure read off the graph, so the reader can check it by
              counting bubbles. The metric line and headline sentence were
              removed: the raw "15 minutes per task" read as unfinished, and the
              shorter the card, the more screen the map gets. */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 13 }}>
              {chips.map((c) => (
                <span key={c.key} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <strong style={{ fontSize: 18, color: CHIP_COLOUR[c.tone], fontVariantNumeric: "tabular-nums", minWidth: 22 }}>{c.value}</strong>
                  <span style={{ fontSize: 13, color: DARK.textSub }}>{c.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* The films. In the identity card because that's where a reader
              starts, and because an explainer is the answer to "what am I
              looking at" — which is the question being asked at exactly this
              point, before anything has been clicked. */}
          {explainers.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${DARK.borderFaint}` }}>
              <p style={railHeading}>Watch</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {explainers.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => startExplainer(e)}
                    style={{
                      ...ghostButton,
                      padding: "5px 10px",
                      fontSize: 12.5,
                      borderColor: explainerId === e.id ? DARK.accentLift : DARK.border,
                      background: explainerId === e.id ? DARK.surfaceActive : ghostButton.background,
                      color: explainerId === e.id ? "#FFFFFF" : DARK.text,
                    }}
                  >
                    {e.title}
                    <span style={{ color: DARK.textFaint, marginLeft: 5 }}>{Math.round(e.seconds)}s</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right rail: the colour key, and the deliverable toggle where there's
            more than one piece of work. The key moved here from the canvas so
            the map itself carries no chrome — crisper, and it means the legend
            has a fixed home instead of floating over bubbles.

            It yields the column whenever something else claims it. The node
            story and the node panel are both `top: 18, right: 18` at 380 wide
            and the rail is 264 — so an open story covered the key's top but
            left its bottom sticking out underneath, and a film that opens a
            story put the reader in front of both at once.

            Faded, not unmounted, and that distinction is load-bearing: the rail
            is one of the two elements `chromeH` measures, so removing it from
            the DOM would shrink the inset, re-fit the force layout, and move
            every bubble while someone is mid-sentence. Opacity costs nothing
            and the measurement stays honest.

            `visibility` carries the state and `opacity` only decorates it. An
            opacity transition needs a compositor, and a tab that isn't painting
            doesn't have one — measured here: `pointerEvents` flipped to `none`
            instantly while the opacity stayed pinned at 1, leaving the rail
            fully visible and completely unclickable. That is worse than either
            state on its own. `visibility` isn't interpolated, so it lands
            whether or not anything is painting. Same lesson as the scroll glide
            and the investment ticker: never let an animation own the only copy
            of a state. */}
        <div
          ref={railRef}
          aria-hidden={rightColumnBusy}
          style={{
            ...glass, ...topRight,
            visibility: rightColumnBusy ? "hidden" : "visible",
            opacity: rightColumnBusy ? 0 : 1,
            pointerEvents: rightColumnBusy ? "none" : "auto",
            transition: `opacity ${MOTION.base} ${MOTION.ease}`,
          }}
        >
          {/* Colour says who does it. */}
          <p style={{ ...railHeading, marginTop: 0 }}>Who does it</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {LEGEND.map((l) => (
              <span key={l.label} style={keyRow}>
                <NodeGlyph kind={l.kind} colour={l.colour} size={17} />
                {l.label}
              </span>
            ))}
          </div>

          {/* Shape says what kind of thing it is. This half of the grammar has
              been on the canvas since the first draw pass and has never been
              explained anywhere — so every ring, core and facet read as
              decoration rather than as meaning. */}
          <p style={{ ...railHeading, marginTop: 13, paddingTop: 11, borderTop: `1px solid ${DARK.borderFaint}` }}>
            What it is
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SHAPE_KEY.map((s) => (
              <span key={s.label} style={keyRow}>
                <NodeGlyph kind={s.kind} colour={s.colour || DARK.machine} size={17} />
                {s.label}
              </span>
            ))}
          </div>

          {hasRail && (
            <>
              <p style={{ ...railHeading, marginTop: 13, paddingTop: 11, borderTop: `1px solid ${DARK.borderFaint}` }}>The work</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <RailChip
                  label={`Everything (${allNodes.length})`}
                  active={deliverable === "all"}
                  onClick={() => { setDeliverable("all"); trackEvent("deliverable_selected", null, { deliverable: "all" }); }}
                  block
                />
                {deliverables.map((d) => (
                  <RailChip
                    key={d.id}
                    label={`${d.label} (${allNodes.filter((n) => n.deliverable === d.id).length})`}
                    active={deliverable === d.id}
                    onClick={() => { setDeliverable(d.id); trackEvent("deliverable_selected", null, { deliverable: d.id }); }}
                    block
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* The lenses. Two ways of asking the map a question — "where does a
            person still sign?" and "what happens for this kind of matter?" —
            that both work by dimming. Barebones for now: a toggle and a row of
            chips. Suppressed while a film owns the map. */}
        {!stage && (
          <div style={{ ...glass, ...lensBar }}>
            <button
              type="button"
              onClick={() => { setTrustLens((v) => !v); setScenario(null); trackEvent("trust_lens", null, { on: !trustLens }); }}
              style={trustLens ? lensToggleOn : lensToggle}
            >
              {trustLens
                ? `${humanCount} human checkpoint${humanCount === 1 ? "" : "s"} — nothing leaves unreviewed`
                : "Where does a person still sign?"}
            </button>

            {(graph.scenarios || []).length > 1 && (
              <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 11.5, color: DARK.textFaint, whiteSpace: "nowrap" }}>Follow a case</span>
                <select
                  value={scenario || ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    setScenario(v);
                    setTrustLens(false);
                    if (v) trackEvent("scenario_selected", null, { scenario: v });
                  }}
                  style={scenarioSelect}
                >
                  <option value="">Show the whole flow</option>
                  {/* Grouped by deliverable — the label above each set names the
                      outcome, so no branch reads out of context. */}
                  {scenarioGroups.map((g) => (
                    <optgroup key={g.deliverable.id} label={g.deliverable.label}>
                      {g.scenarios.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </optgroup>
                  ))}
                  {looseScenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {/* The dock. Open loops and the send button, always reachable, never in
            the way of the map. */}
        <div style={{ ...glass, ...dock }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* Just the open loop. The counts moved to the identity card, the
                amber-ring hint went with them — the dock's one job is "what do
                you still owe us", and the buttons to act on it. */}
            <span style={{ fontSize: 13 }}>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{total.answered} of {total.required}</strong>
              <span style={{ color: DARK.textSub }}> things we need from you</span>
            </span>

            <span style={{ display: "flex", gap: 7, marginLeft: "auto" }}>
              <button onClick={() => setView("list")} style={ghostButton}>Read as a list</button>
              <button onClick={() => setComposerOpen(true)} style={solidButton}>Send back</button>
            </span>
          </div>
        </div>

        {/* The opened node, read a card at a time. Slides over, never
            displaces, never modal — a modal over the map was v1's core defect.
            The list reading keeps the all-at-once NodePanel: a story is a poor
            form for someone scanning, and the list is the accessible path. */}
        {selectedNode && (
          <NodeStory
            node={readNode(selectedNode, inputFor)}
            edges={graph.edges || []}
            nodesById={nodesById}
            onClose={() => setSelectedId(null)}
            {...panelProps}
          />
        )}

        {/* The composer. Same send-back, given somewhere to live that isn't the
            bottom of a scroll. */}
        {composerOpen && (
          <aside style={{ ...glass, ...composer }}>
            {/* No `sentBack` branch here either — sending takes over the page,
                so this composer is only ever the pre-send state. */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>Send this back to us</h2>
              <button onClick={() => setComposerOpen(false)} style={closeButton} aria-label="Close">×</button>
            </div>
            <p style={{ margin: "6px 0 10px", fontSize: 13, color: DARK.textSub, lineHeight: 1.5 }}>
              You have {total.answered} of {total.required} filled in. Send it whenever you're
              ready — we'd rather have partial answers now than complete ones in three weeks.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you want to flag? (optional)"
              rows={3}
              style={{ ...field, marginBottom: 10 }}
            />
            <button onClick={sendBack} disabled={sending} style={solidButton}>
              {sending ? "Sending…" : "Send back to LexOps"}
            </button>
            <button
              onClick={approve}
              disabled={sending}
              style={{ ...ghostButton, marginTop: 8, width: "100%" }}
              title="Tell us you're happy with this proposal as it stands"
            >
              {sending ? "…" : "Approve this proposal"}
            </button>
            <p style={{ fontSize: 11.5, color: DARK.textMeta, margin: "8px 0 0", lineHeight: 1.45 }}>
              Approving closes this round. Sending it back keeps it going.
            </p>
          </aside>
        )}

        {/* The way onward. Hidden while a film is running or the composer is
            open — both already own the bottom of the screen, and three things
            competing there is how a reader ends up pressing none of them. */}
        {!activeExplainer && !composerOpen && (
          <ActsPill
            open={actsOpen}
            seen={actsSeen}
            onToggle={() => {
              const next = !actsOpen;
              setActsOpen(next);
              setActsSeen(true);

              if (next) {
                trackEvent("acts_opened", null, {});
                // Take them there. Opening a section below the fold and leaving
                // the reader at the top is how a segue turns into a dead end —
                // the pill said "there's more", so the page has to go and show
                // them, and from there normal scrolling continues into Act IV.
                //
                // The scroll itself is an effect, not here: the acts mount on
                // this state change, so anything scheduled from the handler —
                // including a double rAF — can still run before React commits,
                // with `actsRef.current` null and nothing to scroll to.
              } else {
                // Collapsing from a scrolled position would leave the container
                // scrolled with nothing below it — a blank screen and no way back.
                scrollContainerTo(scrollRef.current, 0);
              }
            }}
          />
        )}

        {activeExplainer && (
          <ExplainerPlayer
            explainer={activeExplainer}
            allNodes={allNodes}
            onStage={onExplainerStage}
            onClose={stopExplainer}
            onEvent={onExplainerEvent}
          />
        )}

        {/* Lifted clear of the player, which owns the bottom-left slot while a
            film is running. An error hidden behind a caption card is an error
            nobody acts on. */}
        {error && (
          <div style={{ ...glass, ...errorToast, bottom: activeExplainer ? 250 : 84 }}>{error}</div>
        )}
      </div>

      {/* Acts III–V, in the scroll flow beneath the pinned stage. Mounted only
          when opened so the IntersectionObservers inside don't run — and don't
          fire their reveals — against a section nobody has asked for. */}
      {actsOpen && (
        <ProposalActs
          sections={graph.sections || null}
          deliverables={deliverables}
          nodes={allNodes}
          proposal={proposal}
          scrollRoot={scrollRef}
          rootRef={actsRef}
          onFeedback={submitFeedback}
          onEvent={trackEvent}
        />
      )}
      </div>
    );
  }

  return documentMode ? documentLayout() : mapLayout();
}

// One chip in the deliverable rail. `block` is the map reading, where the rail
// stacks in a glass card; inline is the document reading.
function RailChip({ label, active, onClick, block }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: block ? "6px 10px" : "6px 12px",
        font: "inherit", fontSize: block ? 13 : 14, cursor: "pointer",
        textAlign: block ? "left" : "center",
        width: block ? "100%" : undefined,
        // Rounded square, not a pill — these are things you read down a list,
        // and the reference reserves full pills for things you toggle.
        borderRadius: RADIUS.inner,
        // The strong light border in *both* states. A tab whose outline fades
        // out when it isn't selected reads as disabled rather than as available
        // — the selected one should gain a fill, not be the only one with an
        // edge.
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "rgba(157,181,201,0.75)" : DARK.borderStrong,
        // Raised out of the glass rather than filled with brand blue: a column
        // of saturated blue rows competes with the map it is filtering.
        background: active ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px) saturate(1.5)",
        WebkitBackdropFilter: "blur(14px) saturate(1.5)",
        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.22)" : "none",
        color: active ? DARK.text : DARK.textSub,
        transition: `background ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease}, color ${MOTION.base} ${MOTION.ease}`,
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Barely-there chrome. Day 3 replaces all of this.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// The loading screen.
// ---------------------------------------------------------------------------
// This is the first thing a partner sees after clicking a link in an email, and
// it was one line of unstyled body text on a white page — a fair chunk of the
// "does this feel expensive" judgement is made before the graph ever arrives.
//
// It assembles out of the map's own grammar rather than showing a spinner: the
// five glyphs are the same shapes the canvas draws, pulsing in sequence, so the
// wait is spent teaching the vocabulary the map is about to use. A generic
// spinner would be a wasted three seconds and would belong to no product.
//
// Everything is CSS keyframes — no rAF, no state, no timers. This screen has to
// survive being rendered in a tab that isn't compositing, which is the exact
// failure mode that has bitten every animated thing in this file (see
// `scrollContainerTo`, and the investment ticker's timer guarantee). CSS
// animation costs nothing when it doesn't run, and nothing here depends on it
// having run.
const LOADING_CSS = `
@keyframes lp-load-pulse {
  0%, 100% { opacity: 0.22; transform: translateY(0) scale(0.94); }
  50%      { opacity: 1;    transform: translateY(-3px) scale(1); }
}
@keyframes lp-load-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
.lp-load-glyph { animation: lp-load-pulse 1.8s ease-in-out infinite; }
.lp-load-sweep { animation: lp-load-sweep 1.6s cubic-bezier(.4,0,.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .lp-load-glyph { animation: none; opacity: 0.85; }
  .lp-load-sweep { animation: none; transform: none; width: 100%; }
}
`;

// The order the map itself reads in: work enters, a machine acts, a model runs,
// a person decides, a thing is produced. It is the whole product in five shapes.
const LOADING_GLYPHS = [
  { kind: "trigger", colour: DARK.machine },
  { kind: "step", colour: DARK.machine },
  { kind: "ai", colour: DARK.machine },
  { kind: "hitl", colour: DARK.human },
  { kind: "artifact", colour: DARK.locked },
];

function ProposalLoading() {
  return (
    <div style={loadingRoot}>
      <style>{LOADING_CSS}</style>
      <div style={grainOverlay} aria-hidden />

      <div style={loadingCard} role="status" aria-live="polite">
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 22 }}>
          {LOADING_GLYPHS.map((g, i) => (
            <span
              key={g.kind}
              className="lp-load-glyph"
              // Staggered, so they read left to right as a sequence rather than
              // blinking in unison — the map flows left to right too.
              style={{ animationDelay: `${i * 160}ms`, display: "block" }}
              aria-hidden
            >
              <NodeGlyph kind={g.kind} colour={g.colour} size={22} />
            </span>
          ))}
        </div>

        <p style={{ ...eyebrow, textAlign: "center", marginBottom: 8 }}>Your proposal</p>
        <h1 style={loadingTitle}>Laying out the map</h1>
        <p style={loadingSub}>One moment — we&apos;re arranging the steps in your workflow.</p>

        {/* An indeterminate sweep rather than a percentage: we genuinely don't
            know how long this takes, and a progress bar that invents a figure
            is the same dishonesty as the ticker starting at zero. */}
        <div style={loadingTrack}>
          <div className="lp-load-sweep" style={loadingBeam} />
        </div>
      </div>
    </div>
  );
}

const loadingRoot = {
  position: "fixed", inset: 0, overflow: "hidden",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: atmosphere, color: DARK.text, padding: 24,
};
const loadingCard = { position: "relative", zIndex: 1, width: "100%", maxWidth: 380, textAlign: "center" };
const loadingTitle = {
  margin: "0 0 8px", fontSize: 26, lineHeight: "31px", fontWeight: 500,
  letterSpacing: "-0.01em", color: DARK.text,
};
const loadingSub = { margin: "0 0 26px", fontSize: 13.5, lineHeight: 1.55, color: DARK.textSub };
const loadingTrack = {
  position: "relative", height: 2, borderRadius: 999, overflow: "hidden",
  background: DARK.borderFaint,
};
const loadingBeam = {
  position: "absolute", inset: 0, width: "40%", borderRadius: 999,
  background: `linear-gradient(90deg, transparent, ${DARK.machine}, transparent)`,
};

// ---------------------------------------------------------------------------
// The document reading's responsive scale.
// ---------------------------------------------------------------------------
// Media queries rather than a JS listener — same reasoning as ACTS_CSS in
// ProposalActs.jsx. The reading column is 720px, so it takes a tighter ramp
// than the site's full-bleed 20 → 32 → 48 → 80: past `sm` the column is
// already centred with space either side, and adding 80px of padding inside it
// would narrow the text to well under a comfortable measure.
const PAGE_CSS = `
.lp-shell { padding: 32px; }
.lp-shell h1 { font-size: 30px; line-height: 1.2; letter-spacing: -0.01em; }
.lp-thanks-h { font-size: 27px; }
@media (max-width: ${BREAKPOINT.md - 1}px) {
  .lp-shell { padding: 24px; }
  .lp-shell h1 { font-size: 25px; }
  .lp-thanks-h { font-size: 23px; }
}
@media (max-width: ${BREAKPOINT.sm - 1}px) {
  .lp-shell { padding: 20px; }
  .lp-shell h1 { font-size: 21px; line-height: 1.25; }
  .lp-thanks-h { font-size: 20px; }
  /* Long node labels and client names are the two strings most likely to
     overflow a 320px column — neither is under our control. */
  .lp-shell { overflow-wrap: anywhere; }
}
`;

function Shell({ children }) {
  return (
    <div className="lp-shell" style={{
      maxWidth: 720, margin: "0 auto", lineHeight: 1.5,
      // No `fontFamily` — Satoshi is set on `html, body` in index.html and this
      // used to override it back to system-ui, which is why the loading and
      // error states were the one place in the flow that wasn't on brand.
      color: DARK.text, minHeight: "100vh", background: atmosphere,
    }}>
      <style>{PAGE_CSS}</style>
      {children}
    </div>
  );
}

// Same semantics as the canvas: amber is where a person still decides.
//
// These are the *lifted* dark-field values from theme.js, not the deck's. The
// chips and the legend used to carry the PDF's purple `#633dc0` and its
// `#e08a00` amber while the canvas beside them had already moved to the
// website's slate blue — so the key told the reader one colour and the bubble
// it described was another. One source now: if a hue changes, it changes in
// theme.js and both move together.
const CHIP_COLOUR = {
  amber: DARK.human,
  purple: DARK.machine,
  green: DARK.locked,
  ink: DARK.text,
};

// The colour key. Lives in the right rail now, not floating over the map. Kept
// short on purpose — three colours the reader needs, not the whole taxonomy.
const LEGEND = [
  { kind: "step", colour: DARK.machine, label: "Machine" },
  { kind: "hitl", colour: DARK.human, label: "A person decides" },
  { kind: "artifact", colour: DARK.locked, label: "Produced & locked" },
];

// The other half of the grammar. Ordered by how often the reader meets it on a
// map, not by the taxonomy's own order — `unmet` is last because it's a state
// rather than a kind, and it's the one that asks them for something.
const SHAPE_KEY = [
  { kind: "trigger", label: "Where work enters" },
  { kind: "ai", label: "A model runs here" },
  { kind: "gate", colour: DARK.human, label: "A decision or branch" },
  { kind: "system", colour: DARK.machine, label: "A system of record" },
  { kind: "unmet", label: "We need something from you" },
];

const keyRow = {
  display: "flex", alignItems: "center", gap: 8,
  fontSize: 12.5, lineHeight: 1.35, color: DARK.textSub,
};

// ---------------------------------------------------------------------------
// The map reading's chrome.
// ---------------------------------------------------------------------------
// Liquid glass lives here and nowhere else — on a handful of DOM elements.
// `backdrop-filter` is GPU-expensive per element, and putting it anywhere near
// the bubbles is what turns a 60fps map into a slideshow.
// The page is dark, and it is dark *here* — the canvas draws transparent in
// bare mode, so this background is the map's actual ground. It used to be
// `#FAFBFC`, which meant the canvas's lifted dark-mode hues (chosen to hold
// against near-black) were being painted onto white paper: washed-out pastels
// on a bright page, the single biggest reason the map didn't read as premium.
//
// `vignette` rather than a flat fill, because a flat near-black reads as an
// unstyled background; a radial lift behind the centre makes the same colour
// read as depth. Painted once here, never per frame by the canvas.
const mapRoot = {
  position: "fixed", inset: 0, overflow: "hidden",
  color: DARK.text, background: atmosphere,
};

// The pinned first screen. `height: 100vh` rather than 100% because it lives in
// a scroll container now — a percentage height against a scrolling parent
// collapses. Sticky keeps the map on screen while the acts ride up over it.
const mapStage = { position: "sticky", top: 0, height: "100vh", flexShrink: 0 };

// A card is a tinted surface with a strong light border — not clear glass. On a
// near-black page clear glass reads as a slightly lighter hole in the
// background; the brand blue at low alpha, outlined in the light slate at real
// opacity, reads as an object deliberately placed on top of the map.
const glass = { position: "absolute", ...liquidGlass, padding: 16 };

// 300 rather than 336: the inset below has to clear this card exactly, and every
// pixel of card width is a pixel the map doesn't get.
// Dock (18) + legend (76, ~34 tall) + the segue pill above it (120, ~36 tall).
// Constant rather than conditional on the pill actually showing: a changing
// inset re-fits the force layout, and bubbles that move while someone is
// reading are worse than a little unused height.
const DOCK_RESERVE = 168;

/** Cap a block of copy at n lines. */
const clamp = (lines) => ({
  display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines,
  overflow: "hidden",
});

// Width is set per-render from the viewport (see `cardWidth` in mapLayout);
// this only carries position.
const topLeft  = { top: 18, left: 18 };
// The rail carries two keys now (colour and shape) on top of Watch and the
// deliverable list, so it needs a ceiling and its own scroll — on a short
// laptop screen the previous version would have run off the bottom of the
// viewport, taking the deliverable filter with it.
const topRight = {
  top: 18, right: 18, width: 264,
  maxHeight: "calc(100vh - 36px - 168px)", overflowY: "auto",
};
const dock     = { bottom: 18, left: 18, right: 18, padding: "11px 16px" };

// The lens bar sits at the top, centred between the identity card (left) and the
// rail (right). It used to live above the dock, but the roadmap pill is also
// bottom-centre and the two collided. The map letterboxes with empty space up
// top, so this clears the bubbles. Barebones — the glam pass gives these real
// states and motion.
const lensBar = {
  top: 18, left: "50%", transform: "translateX(-50%)",
  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
  justifyContent: "center",
  maxWidth: 560, padding: "8px 14px",
};
// Borders are longhand, not the `border` shorthand: the "on" variants and the
// dashed "Show all" override single properties, and mixing shorthand with a
// longhand override is a React styling warning.
// The trust lens is the one control allowed to break the blue scheme: amber
// means "a person decides" everywhere else in this product, and the lens is the
// control that asks about exactly that. Everything else on the bar is blue.
const lensToggle = pillHuman;
const lensToggleOn = pillHumanOn;
const scenarioSelect = {
  ...pill,
  padding: "5px 10px",
  maxWidth: 240,
  // A native <select> inherits none of the page's colours on its options list,
  // so the closed control is styled here and the popup is the OS's. Setting a
  // dark background without also setting the text colour is what produces the
  // unreadable dark-on-dark select in most hand-rolled dark themes.
  color: DARK.text,
  background: "rgba(7,12,17,0.72)",
};
// Sits above the dock, clear of it, and scrolls on its own so a node with nine
// needs never pushes the send button off the screen.
const panel    = {
  top: 18, right: 18, width: 380, maxHeight: "calc(100vh - 120px)",
  overflowY: "auto", padding: "15px 17px 18px",
};
const composer = { bottom: 84, right: 18, width: 380, padding: "15px 17px 17px" };
const errorToast = {
  bottom: 84, left: 18, maxWidth: 420, padding: "11px 14px",
  // The lifted red from theme.js. `#b3261e` is a light-page error colour and
  // effectively disappears against the dark card behind it.
  fontSize: 13, color: DARK.pain, borderColor: "rgba(232,99,90,0.45)",
};

const railHeading = { ...eyebrow, margin: "0 0 7px" };

const solidButton = solidDark;
const ghostButton = ghostDark;
const closeButton = {
  border: "none", background: "none", cursor: "pointer", fontSize: 22,
  lineHeight: 1, color: DARK.textFaint, padding: "0 2px",
  transition: `color ${MOTION.fast} ${MOTION.ease}`,
};

// ---------------------------------------------------------------------------
// The document reading — the phone fallback, and the List toggle.
// ---------------------------------------------------------------------------
// These go dark too. A narrow-screen visitor getting a white page while every
// wide-screen visitor gets the dark map is two products, and the phone reading
// is the one a partner actually opens first (they read email on phones).
const box = {
  border: `1px solid ${DARK.border}`, borderRadius: 12,
  background: DARK.card, padding: 14, marginBottom: 12,
};
const h3 = {
  ...eyebrow, fontSize: 12, letterSpacing: "0.08em",
  color: DARK.textSub, margin: "0 0 6px",
};
const field = { ...fieldDark, padding: 8, fontSize: 15 };
const nodeButton = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12, background: "none", border: "none", padding: 0, font: "inherit",
  textAlign: "left", cursor: "pointer",
};
// Was a bare native <button> — which on a dark page renders as the OS's light
// grey chrome, the one control on the document reading that gave the theme away.
const primaryButton = { ...solidDark, padding: "10px 18px", fontSize: 15 };
