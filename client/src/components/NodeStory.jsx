// ---------------------------------------------------------------------------
// The node story — one bubble, read a card at a time.
// ---------------------------------------------------------------------------
// Replaces the semantic-zoom experiment: fading a node's whole contract in
// underneath its bubble turned the map into a wall of text and competed with
// the panel instead of leading to it. Detail belongs in something you open.
//
// So this is the Instagram-story reading. Click a bubble, get one thing at a
// time — what happens, what goes in, what comes out, what we need from you —
// with a segment bar, a Next button, arrow keys, and a swipe on touch. The
// typewriter is doing real work: it sets the pace, so a partner reads the
// sentence instead of scanning past it, and it makes "there is another card"
// obvious without a hint.
//
// **No icons.** No ticks, no arrows, no tildes in the copy. Section headings
// carry the meaning and the words do the rest. Decorative glyphs on every line
// are the single clearest tell of machine-written copy, and this is a document
// a law firm sends to a client.
//
// The last card holds the *actual* answer fields, reusing `NeedField` from
// NodePanel — the story is a reading of the same contract, never a second
// surface that can disagree with it. Typing is never blocked by the animation:
// any card with fields skips straight to its final state.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { PALETTE } from "./proposalCanvas/language.js";
import { NeedField } from "./NodePanel.jsx";
import { DARK, darkGlass, ghostDark, solidDark, eyebrow } from "./proposalCanvas/theme.js";
import NodeGlyph from "./proposalCanvas/NodeGlyph.jsx";

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/**
 * Reveals `text` a character at a time. Returns the whole string immediately
 * when the card is interactive, when motion is reduced, or once the reader has
 * asked for it — nobody should have to wait on an animation to read.
 */
function useTypewriter(text, { skip = false, cps = 55 } = {}) {
  const [n, setN] = useState(skip ? text.length : 0);
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip || reduceMotion()) { setN(text.length); setDone(true); return; }
    setN(0);
    setDone(false);
    if (!text) { setDone(true); return; }

    // An interval, not rAF: this must keep running in a background tab, and
    // rAF is throttled to nothing there — a reader who switches away mid-card
    // would come back to a half-typed sentence that never finishes.
    const ms = Math.max(8, Math.round(1000 / cps));
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, ms);
    return () => clearInterval(id);
  }, [text, skip, cps]);

  return { shown: text.slice(0, n), done, finish: () => { setN(text.length); setDone(true); } };
}

/**
 * Build the cards for one node.
 *
 * Cards that would be empty are dropped rather than shown saying "none" — an
 * empty card is a card the reader taps through for nothing. The exception is
 * needs, which says so explicitly: a client counting what they owe has to be
 * able to see the zeros.
 */
function buildCards(node, upstream, downstream) {
  const cards = [];

  if (node.description) {
    cards.push({ id: "what", heading: "What happens here", body: node.description });
  }

  cards.push({
    id: "input",
    heading: "Input",
    body: upstream.length
      ? `Comes from ${listSentence(upstream)}.`
      : "This is where the work starts. Nothing upstream feeds it.",
  });

  cards.push({
    id: "output",
    heading: "Output",
    body: node.gives.length
      ? node.gives.map((g) => (g.detail ? `${g.label} — ${g.detail}` : g.label)).join(" ")
      : downstream.length
        ? `Passes to ${listSentence(downstream)}.`
        : "Nothing leaves this step.",
  });

  cards.push({
    id: "needs",
    heading: "What we need from you",
    body: node.needs.length
      ? ""                                   // the fields speak for themselves
      : "Nothing. This one runs without anything from you.",
    fields: node.needs.length > 0,
  });

  if (node.assumptions.length) {
    cards.push({
      id: "assuming",
      heading: "What we're assuming",
      body: node.assumptions.join(" "),
    });
  }

  return cards;
}

const listSentence = (items) =>
  items.length === 1 ? items[0]
  : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export default function NodeStory({
  node,                       // the contract, from readNode()
  edges = [],
  nodesById = new Map(),
  drafts, onDraft, onSave, onUpload, saving, saved,
  onClose,
}) {
  const [i, setI] = useState(0);
  const touch = useRef(null);

  const { upstream, downstream } = useMemo(() => {
    const label = (id) => nodesById.get(id)?.label || id;
    return {
      upstream: edges.filter((e) => e.to === node?.id).map((e) => label(e.from)),
      downstream: edges.filter((e) => e.from === node?.id).map((e) => label(e.to)),
    };
  }, [edges, nodesById, node?.id]);

  const cards = useMemo(
    () => (node ? buildCards(node, upstream, downstream) : []),
    [node, upstream, downstream],
  );

  // Back to card one whenever a different bubble is opened.
  useEffect(() => { setI(0); }, [node?.id]);

  const card = cards[i];
  const typing = useTypewriter(card?.body || "", { skip: !!card?.fields });

  const last = i >= cards.length - 1;
  const next = () => (last ? onClose?.() : setI((v) => v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  // A tap advances, but only once the sentence has finished — otherwise the
  // first tap completes the line, which is the convention every story UI uses
  // and the one thing readers try instinctively.
  const advance = () => (typing.done ? next() : typing.finish());

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose?.(); return; }
      // Never steal the arrow keys from someone typing into a need.
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); advance(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!node || !card) return null;

  return (
    <div
      style={shell}
      role="group"
      aria-label={`${node.label}, card ${i + 1} of ${cards.length}`}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (dx < -45) advance();
        else if (dx > 45) prev();
      }}
    >
      {/* Segment bar — how many cards, and where you are. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {cards.map((c, n) => (
          <div key={c.id} style={track}>
            <div style={{ ...fill, width: n < i ? "100%" : n === i ? (typing.done ? "100%" : "45%") : "0%" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {/* Glyph beside the kind, so the shape on the map and the words for
              it arrive together. */}
          <p style={{ ...meta, display: "flex", alignItems: "center", gap: 7 }}>
            <NodeGlyph kind={node.kind} colour={node.tone} size={15} />
            <span>
              {node.kindLabel}
              {node.actorLabel ? ` · ${node.actorLabel}` : ""}
            </span>
          </p>
          {/* What this kind of node promises, in the reader's language. The
              panel has always shown this; the story dropped it, which meant the
              one reading that leads with the shape was the one that never said
              what the shape meant. */}
          {node.kindGloss && (
            <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.45, color: DARK.textFaint }}>
              {node.kindGloss}
            </p>
          )}
          <h2 style={{ margin: "3px 0 0", fontSize: 19, lineHeight: 1.25, fontWeight: 600 }}>
            {node.label}
          </h2>
          {node.stakeholder.length > 0 && (
            <p style={{ margin: "3px 0 0", fontSize: 13, color: DARK.textSub }}>
              {node.stakeholder.join(" · ")}
            </p>
          )}
        </div>
        <button onClick={onClose} style={closeBtn} aria-label="Close">Close</button>
      </div>

      <div style={{ marginTop: 16, minHeight: 132 }}>
        <p style={heading}>{card.heading}</p>

        {card.body && (
          <p style={body}>
            {typing.shown}
            {!typing.done && <span style={caret}>|</span>}
          </p>
        )}

        {card.fields && (
          <div style={{ marginTop: 4 }}>
            {node.needs.map((need) => (
              <NeedField
                key={need.id}
                need={need}
                draft={drafts[need.key] ?? ""}
                onDraft={(v) => onDraft(need.key, v)}
                onSave={(v) => onSave(node.id, need.id, v)}
                onUpload={(f) => onUpload(node.id, need.id, f)}
                saving={!!saving[need.key]}
                saved={!!saved[need.key]}
              />
            ))}
          </div>
        )}
      </div>

      <div style={controls}>
        <button
          type="button"
          onClick={prev}
          disabled={i === 0}
          style={{ ...ghost, opacity: i === 0 ? 0.35 : 1, cursor: i === 0 ? "default" : "pointer" }}
        >
          Back
        </button>
        <span style={{ fontSize: 12, color: DARK.textFaint, fontVariantNumeric: "tabular-nums" }}>
          {i + 1} of {cards.length}
        </span>
        <button type="button" onClick={advance} style={solid}>
          {last ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- styles -------------------------------- */

// The story sits directly over the map, so it takes the opaque card fill rather
// than the translucent one — this is the surface a reader is asked to read a
// paragraph on, and prose over drifting bubbles is unreadable at any blur.
const shell = {
  position: "absolute", top: 18, right: 18, width: 380,
  maxHeight: "calc(100vh - 120px)", overflowY: "auto",
  padding: "14px 17px 14px", zIndex: 7,
  ...darkGlass,
  background: DARK.cardDeep,
};
const track = { height: 3, flex: 1, borderRadius: 2, background: DARK.borderFaint, overflow: "hidden" };
const fill = { height: "100%", borderRadius: 2, background: PALETTE.primary, transition: "width 200ms linear" };
const meta = { ...eyebrow };
const heading = { ...eyebrow, margin: "0 0 7px", fontSize: 11.5, color: PALETTE.primary };
const body = { margin: 0, fontSize: 14.5, lineHeight: 1.6, color: DARK.text };
const caret = { color: PALETTE.primary, fontWeight: 300 };
const controls = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
  marginTop: 14, paddingTop: 11, borderTop: `1px solid ${DARK.borderFaint}`,
};
const ghost = { ...ghostDark, padding: "6px 13px", fontSize: 13, borderRadius: 8 };
const solid = { ...solidDark, padding: "6px 17px", fontSize: 13, borderRadius: 8 };
const closeBtn = {
  ...ghostDark, padding: "4px 10px", fontSize: 12, borderRadius: 7,
  background: "transparent", color: DARK.textSub,
};
