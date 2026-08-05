// ---------------------------------------------------------------------------
// The explainer player — a 10-second film that runs *on the map*.
// ---------------------------------------------------------------------------
// Structurally this is the LexOps promo animatic (`lexops-promo/app/film`):
// one rAF clock, an array of beats each with a duration, and a local progress
// `t` (0..1) handed to whatever the beat renders — so pausing freezes the film
// exactly where it is rather than snapping to a keyframe.
//
// The one deliberate departure, and it's the whole point: the promo film draws
// its own boards. This draws nothing. Each beat is a line of copy plus an
// operation against the graph that is *already on screen* — `focus` lights a
// set of nodes and dims the rest, `select` opens one. That is what makes an
// explainer un-driftable: it addresses the same node ids the canvas does, so a
// renamed label or a moved bubble is picked up for free, and there is no render
// pipeline, no storage, and no video file to go stale against the graph.
//
// The schema contract (supabase/living_proposal.sql) is:
//   { id, anchor, seconds, title, beats: [{ dur, line, sub?, focus[], select? }] }
//
// Ten seconds is a cap, not a target. It's the length of thing a partner will
// watch without deciding they're being sold to — and the beats are sized so the
// last one lands on the claim you want them holding when it stops.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DARK, darkGlass, ghostDark, eyebrow as eyebrowBase } from "./proposalCanvas/theme.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** progress of t through the window [a,b], clamped — the film's `seg` */
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

/**
 * Drives an explainer over the canvas.
 *
 * `onStage` is the only way this touches the map: it hands back the focus set
 * and the selected node for the current beat, and the page feeds those to
 * ProposalCanvas as `dimmedIds` / `selectedId`. Passing `null` hands control
 * back to the rail, which is what has to happen the moment the film stops —
 * otherwise the map is left dimmed with no way to un-dim it.
 */
export default function ExplainerPlayer({ explainer, allNodes, onStage, onClose, onEvent }) {
  const beats = explainer?.beats || [];
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(true);
  const elapsedRef = useRef(0);

  const starts = useMemo(() => {
    const acc = [];
    beats.forEach((b, i) => acc.push(i === 0 ? 0 : acc[i - 1] + beats[i - 1].dur));
    return acc;
  }, [beats]);
  const total = beats.length ? starts[beats.length - 1] + beats[beats.length - 1].dur : 0;

  // ---- the clock ----------------------------------------------------------
  // One rAF loop, elapsed kept in a ref: React state at 60fps is a re-render
  // per frame, and this is running on top of a canvas that has its own loop.
  useEffect(() => {
    if (!playing || !total) return;
    let raf = 0;
    let last = performance.now();
    const loop = (ts) => {
      elapsedRef.current = Math.min(total, elapsedRef.current + (ts - last) / 1000);
      last = ts;
      setNow(elapsedRef.current);
      if (elapsedRef.current >= total) { setPlaying(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  const beatIdx = useMemo(() => {
    let i = beats.length - 1;
    while (i > 0 && now < starts[i]) i--;
    return i;
  }, [now, starts, beats.length]);

  const beat = beats[beatIdx];
  const ended = total > 0 && now >= total;
  const t = beat ? clamp((now - starts[beatIdx]) / beat.dur) : 0;

  // ---- drive the map ------------------------------------------------------
  // Everything not in `focus` dims. Held one beat at a time rather than
  // animated per frame: the canvas re-reads dimmedIds from a ref each frame, so
  // a Set identity change per beat is all it needs, and a per-frame Set would
  // allocate 60 of them a second for no visible gain.
  // Keyed on the beat *index*, not the beat object. Depending on the object
  // makes this effect sensitive to how the caller produced it: a compiled
  // explainer is rebuilt on every render, so an identity dependency re-staged
  // the map every frame and looped through the parent's setState. The index and
  // the explainer id are all that actually changes a stage.
  useEffect(() => {
    if (!beat || !onStage) return;
    const focus = beat.focus?.length ? new Set(beat.focus) : null;
    const dimmed = focus
      ? new Set(allNodes.filter((n) => !focus.has(n.id)).map((n) => n.id))
      : null;
    onStage({ dimmed, selected: beat.select || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIdx, explainer?.id, allNodes, onStage]);

  // Hand the map back on the way out, whatever the exit route was.
  useEffect(() => () => onStage?.(null), [onStage]);

  // Once per playthrough, not once per render. `ended` stays true for as long
  // as the end card is up, so the effect alone would keep firing.
  const firedRef = useRef(false);
  useEffect(() => {
    if (ended && !firedRef.current) {
      firedRef.current = true;
      onEvent?.("explainer_completed", { explainer: explainer?.id });
    }
  }, [ended, onEvent, explainer?.id]);

  const replay = useCallback(() => {
    firedRef.current = false;
    elapsedRef.current = 0;
    setNow(0);
    setPlaying(true);
  }, []);

  const jump = useCallback((dir) => {
    const cur = elapsedRef.current;
    let i = beats.length - 1;
    while (i > 0 && cur < starts[i]) i--;
    // Tapping back inside the first second of a beat means "the previous one" —
    // otherwise back always restarts the beat you're already watching.
    const target = dir === 1
      ? Math.min(beats.length - 1, i + 1)
      : (cur - starts[i] > 1 ? i : Math.max(0, i - 1));
    elapsedRef.current = starts[target];
    setNow(starts[target]);
    setPlaying(true);
  }, [beats.length, starts]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === " ") { e.preventDefault(); ended ? replay() : setPlaying((p) => !p); }
      if (e.key === "ArrowRight") jump(1);
      if (e.key === "ArrowLeft") jump(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ended, replay, jump]);

  if (!beat) return null;

  // The caption rises the way the film's `Rise` does — opacity plus a small
  // drift, driven off the beat's own t so it re-runs on every beat and freezes
  // when the film is paused.
  const rise = easeOut(seg(t, 0, 0.18));
  const subRise = easeOut(seg(t, 0.22, 0.44));

  return (
    <div style={card} role="group" aria-label={`Explainer: ${explainer.title}`}>
      {/* Per-beat progress segments — the film's, and the same reason: a single
          bar can't show you how many beats are left. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 11 }}>
        {beats.map((b, i) => (
          <div key={i} style={track}>
            <div style={{ ...fill, width: `${(i < beatIdx ? 1 : i > beatIdx ? 0 : ended ? 1 : t) * 100}%` }} />
          </div>
        ))}
      </div>

      <p style={eyebrow}>{explainer.title}</p>

      <div style={{ minHeight: 62 }}>
        <p style={{ ...lineStyle, opacity: rise, transform: `translateY(${(1 - rise) * 8}px)` }}>
          {beat.line}
        </p>
        {beat.sub && (
          <p style={{ ...subStyle, opacity: subRise, transform: `translateY(${(1 - subRise) * 6}px)` }}>
            {beat.sub}
          </p>
        )}
      </div>

      <div style={controls}>
        <button type="button" onClick={() => jump(-1)} style={ghost} aria-label="Previous beat">Back</button>
        <button
          type="button"
          onClick={() => (ended ? replay() : setPlaying((p) => !p))}
          style={{ ...ghost, minWidth: 74 }}
        >
          {ended ? "Replay" : playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => jump(1)} style={ghost} aria-label="Next beat">Next</button>
        <span style={{ flex: 1 }} />
        <span style={clock}>
          0:{String(Math.floor(now)).padStart(2, "0")} / 0:{String(Math.round(total)).padStart(2, "0")}
        </span>
        <button type="button" onClick={onClose} style={ghost}>Close</button>
      </div>
    </div>
  );
}

/* --------------------------------- styles -------------------------------- */
// Same glass as the rest of the chrome. Bottom-left, above the dock: the map's
// left column is where the headline card already lives, so the reader's eye is
// there — and it keeps the right-hand side free for the node panel, which the
// `select` beats are opening as the film runs.
const card = {
  position: "absolute", bottom: 84, left: 18, width: 380, zIndex: 6,
  ...darkGlass,
  // The film's own line of copy is the point of this card, so it takes the
  // opaque fill rather than the translucent one — same call as NodeStory.
  background: DARK.cardDeep,
  padding: "13px 16px 12px",
};
const track = { height: 3, flex: 1, borderRadius: 2, background: DARK.borderFaint, overflow: "hidden" };
// The progress fill is the brand blue, not the deck's purple. It used to be
// `#633dc0` — the one place the PDF's palette was still leaking onto the map.
const fill = { height: "100%", borderRadius: 2, background: DARK.machine, transition: "width 60ms linear" };
const eyebrow = { ...eyebrowBase, margin: "0 0 7px" };
const lineStyle = { margin: 0, fontSize: 16.5, lineHeight: 1.35, fontWeight: 500, color: DARK.text };
const subStyle = { margin: "5px 0 0", fontSize: 13, lineHeight: 1.45, color: DARK.textSub };
const controls = {
  display: "flex", alignItems: "center", gap: 6, marginTop: 12,
  paddingTop: 10, borderTop: `1px solid ${DARK.borderFaint}`,
};
const ghost = { ...ghostDark, padding: "5px 10px", fontSize: 12.5, borderRadius: 7 };
const clock = { fontSize: 11.5, color: DARK.textFaint, fontVariantNumeric: "tabular-nums" };
