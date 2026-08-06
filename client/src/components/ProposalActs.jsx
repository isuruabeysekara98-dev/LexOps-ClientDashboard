// ---------------------------------------------------------------------------
// Acts III–V — roadmap, investment, and what "done" means.
// ---------------------------------------------------------------------------
// LIVING-PROPOSAL-PLAN.md: "Act III · Roadmap — Gantt bars drawing themselves in
// as you scroll", then Investment "tied back to the value ledger". The portal
// until now was Act II alone. The pill is the door; this is what's behind it.
//
// It toggles *down* rather than opening a modal. The map stays where it is and
// the page grows underneath it — so the gesture is "keep going", not "leave
// what you were reading". LivingProposalPage puts the canvas stage in a sticky
// 100vh block above this, which is what makes the map pin while these acts
// scroll up over it, and release when they're done.
//
// Every reveal is driven by IntersectionObserver rather than a scroll handler.
// A scroll listener firing at 60fps on top of a canvas that already runs its
// own rAF loop is how both end up dropping frames; an observer fires once per
// element, when it matters.
//
// Nothing here computes money. The total and the discount are stored rows
// (supabase/proposal_sections.sql) — the ticker animates *towards* a quoted
// number, it never derives one.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { DARK, MOTION, RADIUS, BREAKPOINT, fieldDark, eyebrow as eyebrowBase } from "./proposalCanvas/theme.js";

// The accent for the acts. Named for its role, not its hue, because it used to
// be the deck's purple `#633dc0` and the whole point of this pass is that the
// portal follows the website rather than the PDF.
const ACCENT = DARK.machine;
const LANE_TONE = {
  discovery: DARK.textFaint,
  build: DARK.machine,
  uat: DARK.human,    // amber — a person is in the loop, same as everywhere else
  golive: DARK.locked,
};

/**
 * Fires once when `ref` first comes into view.
 *
 * `rootRef` is the scroll container, and passing it is not optional here. With
 * the implicit root (the document viewport) nothing in these acts ever
 * revealed: the acts live inside a `position: fixed` element that scrolls
 * internally, so the *scroller's* box never moves relative to the viewport and
 * the intersection never recomputes. Observing against the container itself is
 * what makes scroll position mean anything.
 */
function useRevealed(ref, rootRef, rootMargin = "0px 0px -12% 0px") {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { root: rootRef?.current || null, rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootRef, shown, rootMargin]);
  return shown;
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

/**
 * Counts to `value` once revealed. Eases out, so it decelerates into the number
 * rather than stopping dead on it — a ticker that halts abruptly reads as a
 * page error rather than as a total landing.
 */
function useTicker(value, revealed, ms = 1100) {
  // `null` means "not counting", and the hook then reports the real figure.
  // Starting at 0 meant an Investment section that had never been revealed —
  // below the fold, or in any browser where the observer doesn't fire — sat
  // there rendering the client's project total as "$0".
  const [n, setN] = useState(null);
  useEffect(() => {
    if (!revealed) return;
    if (reduceMotion()) { setN(value); return; }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // The number must arrive even if the animation never runs. rAF is throttled
    // to nothing in a tab that isn't painting, and this counter starts at zero —
    // so without this a backgrounded reader sees their project total rendered as
    // "$0". Wrong by an order of magnitude and in the client's favour to
    // misread, which makes it the worst possible field to animate optimistically.
    // A timer isn't on the compositor's clock, so it can land the real figure.
    const guarantee = window.setTimeout(() => setN(value), ms + 250);

    return () => { cancelAnimationFrame(raf); window.clearTimeout(guarantee); };
  }, [value, revealed, ms]);
  return n ?? value;
}

const money = (n, currency = "AUD") =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-AU")}`;

/* ------------------------------- the pill -------------------------------- */

export function ActsPill({ open, onToggle, seen }) {
  return (
    <>
      <style>{CSS}</style>
      <div style={perch}>
        <button
          type="button"
          className={seen || open ? "lp-segue" : "lp-segue lp-segue--throb"}
          style={{ pointerEvents: "auto" }}
          onClick={onToggle}
          aria-expanded={open}
        >
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>↓</span>
          Roadmap, investment, what &ldquo;done&rdquo; means
        </button>
      </div>
    </>
  );
}

/* ------------------------------- the acts -------------------------------- */

// `deliverables` is no longer a prop: Act III was the only consumer, and it now
// reads the roadmap section alone.
export default function ProposalActs({ sections, nodes, proposal, scrollRoot, rootRef, onFeedback, onEvent }) {
  const roadmap = sections?.roadmap || null;
  const costing = sections?.costing || null;

  return (
    <div ref={rootRef} style={wrap}>
      <style>{ACTS_CSS}</style>
      {/* `deliverables` is deliberately not passed — Act III reads the roadmap
          section and nothing else, so a deliverable's metric can't become a
          timeline the client reads as a commitment. */}
      <RoadmapAct roadmap={roadmap} scrollRoot={scrollRoot} />
      <InvestmentAct costing={costing} scrollRoot={scrollRoot} onEvent={onEvent} />
      <MaintenanceAct maintenance={sections?.maintenance || null} scrollRoot={scrollRoot} />
      <FeedbackAct onSubmit={onFeedback} />
      <CloseAct proposal={proposal} onEvent={onEvent} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Responsive rules — real media queries, on the website's own breakpoints.
// ---------------------------------------------------------------------------
// CSS rather than a JS resize listener, for two reasons that have both already
// bitten this file. A listener re-renders the whole act tree on every resize
// frame, on top of a canvas that runs its own rAF loop; and it needs a
// compositor to be sampled at all, which the verification browser doesn't
// have — so a JS-driven layout can't be checked the way a media query can.
//
// Inline styles beat classes, so anything in here is deliberately NOT set
// inline on the element. Padding lives here; colour and radius stay inline.
//
// Breakpoints are `BREAKPOINT` from theme.js, which is `tokens.json` verbatim:
// 640 / 768 / 1024 / 1280, with the site's 20 → 32 → 48 → 80 gutter ramp.
const ACTS_CSS = `
.lp-act { padding-top: 56px; padding-bottom: 48px; padding-left: 80px; padding-right: 80px; }
.lp-act-h { font-size: 26px; line-height: 31px; }
.lp-lane-label { width: 158px; }
.lp-total { flex-wrap: nowrap; }
.lp-total-figure { font-size: 44px; }
.lp-plan-price { font-size: 40px; }

@media (max-width: ${BREAKPOINT.xl - 1}px) {
  .lp-act { padding-left: 48px; padding-right: 48px; }
}
@media (max-width: ${BREAKPOINT.md - 1}px) {
  .lp-act { padding-top: 44px; padding-bottom: 38px; padding-left: 32px; padding-right: 32px; }
  .lp-lane-label { width: 116px; }
  .lp-total-figure { font-size: 36px; }
  .lp-plan-price { font-size: 34px; }
}
@media (max-width: ${BREAKPOINT.sm - 1}px) {
  .lp-act { padding-top: 36px; padding-bottom: 32px; padding-left: 20px; padding-right: 20px; }
  /* The heading clamps the way the site's do — tokens.json H3 26px steps down
     rather than wrapping to three lines in a 375px column. */
  .lp-act-h { font-size: 21px; line-height: 26px; }
  /* 92px still holds a two-line lane name at 12.5px, and leaves the plot the
     larger share of a 375px screen. Below this the labels win and the chart
     stops being readable, which defeats the point of drawing one. */
  .lp-lane-label { width: 92px; font-size: 11.5px; }
  /* The total is a label and a big number side by side. On a phone that forces
     the figure to shrink until it stops being the hero of the act, so it wraps
     underneath at full size instead. */
  .lp-total { flex-wrap: wrap; }
  .lp-total-figure { font-size: 32px; }
  .lp-plan-price { font-size: 30px; }
}
`;

/* Act III — the Gantt draws itself in, bar by bar, then the weeks explain themselves. */
function RoadmapAct({ roadmap, scrollRoot }) {
  const ref = useRef(null);
  const shown = useRevealed(ref, scrollRoot);

  // The roadmap section is the only source of the timeline.
  //
  // This used to fall back to the deliverables' week metrics when no lanes were
  // authored, on the theory that a half-filled proposal should still get an
  // Act III rather than a gap. In practice it meant two fields meant the same
  // thing and neither said so: a "100" typed as a deliverable metric became a
  // 100-week bar on the client's timeline, silently overriding the `weeks: 4`
  // set on the roadmap itself. A guessed timeline a client might commit to is
  // worse than an absent one, so an unauthored roadmap now says so plainly.
  const lanes = roadmap?.lanes?.length ? roadmap.lanes : [];

  // The axis still has to cover its lanes — an authored `weeks` smaller than an
  // authored lane's `end_week` would otherwise push the bar outside the plot.
  const laneEnd = lanes.length
    ? Math.max(...lanes.map((l) => Number(l.end_week) || 0))
    : 0;
  const weeks = Math.max(1, Number(roadmap?.weeks) || 0, laneEnd);

  if (!lanes.length) {
    return (
      <Act anchorRef={ref} n="III" title="Roadmap" gloss="When each piece lands.">
        <Pending>The delivery timeline isn&apos;t set on this proposal yet.</Pending>
      </Act>
    );
  }

  return (
    <Act anchorRef={ref} n="III" title="Roadmap" gloss="When each piece lands.">
      {roadmap?.note && <p style={lede}>{roadmap.note}</p>}

      {/* One gridded plot rather than a stack of separate tracks.
          The week rules run *behind every lane at once*, unbroken top to
          bottom, which is what makes this read as a chart instead of as a
          column of progress bars — the earlier version drew each lane its own
          little track and put the ruler in a detached row above them, so
          nothing lined up vertically and no lane could be compared to another
          by eye. The labels sit outside the grid so the rules stay continuous. */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <div className="lp-lane-label" style={laneLabelCol}>
          {lanes.map((l) => (
            <span key={l.id} className="lp-lane-label" style={laneLabel}>{l.label}</span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={plotArea(weeks)}>
            {lanes.map((l, i) => {
              // Clamped as well as scaled. `weeks` above guarantees the axis
              // covers every lane, but a lane with a negative or missing
              // start/end — or an end before its start — would still compute a
              // stray offset, and one bad row shouldn't break the page layout.
              const s = Math.max(0, Number(l.start_week) || 0);
              const e = Math.max(s, Number(l.end_week) || 0);
              const left = Math.min(100, (s / weeks) * 100);
              const width = Math.min(100 - left, ((e - s) / weeks) * 100);
              const tone = LANE_TONE[l.kind] || ACCENT;
              return (
                <div key={l.id} style={laneRow}>
                  <div
                    style={{
                      ...laneBar,
                      left: `${left}%`,
                      width: shown ? `${width}%` : 0,
                      // A line, lit along its length — flat fills at this
                      // thickness read as a bar chart, and the gradient is what
                      // gives it the drawn-on quality.
                      background: `linear-gradient(90deg, ${tone}99 0%, ${tone} 100%)`,
                      boxShadow: `0 0 14px ${tone}55`,
                      // Lane by lane: each waits its turn, so the eye follows
                      // the build left to right instead of everything arriving
                      // at once.
                      transitionDelay: `${i * 110}ms`,
                    }}
                  />
                  {/* The endpoint, the way a line chart marks its last reading.
                      Sits on the rule the lane finishes on. */}
                  <span
                    style={{
                      ...laneDot,
                      left: `${left + width}%`,
                      background: tone,
                      opacity: shown ? 1 : 0,
                      transitionDelay: `${i * 110 + 500}ms`,
                    }}
                  />
                  <span
                    style={{
                      ...laneWeeks,
                      left: `calc(${left + width}% + 10px)`,
                      opacity: shown ? 1 : 0,
                      transitionDelay: `${i * 110 + 500}ms`,
                    }}
                  >
                    {l.end_week - l.start_week}w
                  </span>
                </div>
              );
            })}
          </div>

          {/* The axis, under the grid it belongs to. Only the ends are labelled
              — a tick per week is unreadable past about eight of them, and the
              rules already carry the counting. */}
          <div style={ganttAxis}>
            <span>Week 0</span>
            <span>Week {weeks}</span>
          </div>
        </div>
      </div>

      {roadmap?.caveat && <p style={caveat}>{roadmap.caveat}</p>}
    </Act>
  );
}

/* Act IV — investment. The number tickers up; the rows explain it. */
function InvestmentAct({ costing, scrollRoot, onEvent }) {
  const ref = useRef(null);
  const shown = useRevealed(ref, scrollRoot);
  const fired = useRef(false);

  useEffect(() => {
    if (shown && !fired.current) { fired.current = true; onEvent?.("investment_viewed", null, {}); }
  }, [shown, onEvent]);

  const total = costing?.total?.amount ?? null;
  const ticked = useTicker(total ?? 0, shown && total != null);

  if (!costing?.rows?.length) {
    return (
      <Act anchorRef={ref} n="IV" title="Investment" gloss="What it costs, and why.">
        <Pending>
          Costing isn&apos;t published to the portal for this proposal yet. Nothing is
          estimated here on your behalf.
        </Pending>
      </Act>
    );
  }

  return (
    <Act anchorRef={ref} n="IV" title="Investment" gloss="What it costs, and why.">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {costing.rows.map((r, i) => (
          <div key={i} style={{ ...costRow, opacity: shown ? 1 : 0, transitionDelay: `${350 + i * 130}ms` }}>
            <div>
              <div style={{ fontWeight: 500, color: r.kind === "discount" ? ACCENT : DARK.text }}>{r.item}</div>
              {r.basis && <div style={basis}>{r.basis}</div>}
            </div>
            <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace: "nowrap",
                          color: r.kind === "discount" ? ACCENT : DARK.text }}>
              {money(r.amount, costing.currency)}
            </div>
          </div>
        ))}
      </div>

      {total != null && (
        <div className="lp-total" style={totalBox}>
          <div>
            <div style={{ fontSize: 12.5, color: DARK.textSub }}>{costing.total.label}</div>
            {costing.total.was != null && (
              <div style={{ fontSize: 12, color: DARK.textFaint, textDecoration: "line-through", marginTop: 2 }}>
                {money(costing.total.was, costing.currency)}
              </div>
            )}
          </div>
          {/* The hero figure, on the reference's terms: large and light rather
              than large and bold. This is the single brightest thing in the act
              and it is allowed to be the only one. */}
          <div className="lp-total-figure" style={{ fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.02, fontVariantNumeric: "tabular-nums", color: DARK.text }}>
            {money(ticked, costing.currency)}
            <span style={{ fontSize: 13, fontWeight: 400, color: DARK.textFaint, marginLeft: 6 }}>{costing.currency}</span>
          </div>
        </div>
      )}

      {costing.recurring?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={subHead}>Ongoing, after go-live</p>
          {costing.recurring.map((r, i) => (
            <div key={i} style={costRow}>
              <div>
                <div style={{ fontWeight: 500 }}>{r.item}</div>
                {r.basis && <div style={basis}>{r.basis}</div>}
              </div>
              <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace: "nowrap" }}>
                {money(r.amount, costing.currency)}<span style={{ fontSize: 12, color: DARK.textFaint }}>/{r.per}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {costing.note && <p style={caveat}>{costing.note}</p>}
    </Act>
  );
}

/* Act V — keeping it running.
   Replaced the acceptance-criteria act: criteria are agreed at discovery, so
   that act could only ever describe the *shape* of sign-off, while this answers
   a question every proposal actually has a priced answer to.

   Optional is stated twice — in the eyebrow and in the lede — because it is the
   single most important thing about this page. A maintenance plan that reads as
   compulsory turns a fixed-price build into an open-ended commitment in the
   reader's head, which is exactly the objection that stalls a signature. */
function MaintenanceAct({ maintenance, scrollRoot }) {
  const ref = useRef(null);
  const shown = useRevealed(ref, scrollRoot);
  const options = maintenance?.options || [];

  if (!options.length) {
    return (
      <Act anchorRef={ref} n="V" title="Keeping it running" gloss="After go-live.">
        <Pending>
          No maintenance plan is quoted for this proposal. Documentation and handover are
          part of the build, so you can run it yourself from day one.
        </Pending>
      </Act>
    );
  }

  const cur = maintenance.currency || "AUD";
  // Whether the plan is optional is read from the proposal, not assumed. Seven
  // of these pages are headed "Optional — Maintenance Plan"; Dziura's is not,
  // because for that engine staying *correct* through model migrations and
  // ruling changes isn't a nice-to-have. Printing "optional" over a plan the
  // proposal doesn't call optional would be the page contradicting the document.
  const optional = maintenance.optional !== false;

  return (
    <Act
      anchorRef={ref}
      n="V"
      title="Keeping it running"
      gloss={optional ? "Optional — after go-live." : "After go-live."}
    >
      {maintenance.note && <p style={lede}>{maintenance.note}</p>}

      {maintenance.covers?.length > 0 && (
        <div style={{ marginTop: 13 }}>
          <p style={subHead}>What the hours cover</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {maintenance.covers.map((c, n) => (
              <li key={n} style={{ ...planBullet, opacity: shown ? 1 : 0, transitionDelay: `${n * 70}ms` }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 14,
                    gridTemplateColumns: options.length > 1 ? "repeat(auto-fit, minmax(260px, 1fr))" : "1fr" }}>
        {options.map((o, i) => (
          <PlanOption key={o.id} option={o} index={i} currency={cur} shown={shown} />
        ))}
      </div>

      {maintenance.caveat && <p style={caveat}>{maintenance.caveat}</p>}
    </Act>
  );
}

/**
 * One maintenance option.
 *
 * Its own component purely so it can hold a hook: `useTicker` can't be called
 * inside the `options.map()` that used to render this inline, and a ticker per
 * option is the point — Act IV's total counts up and these sat static, so the
 * two prices on the same page behaved like different kinds of number.
 *
 * The ticker carries the same guarantee as Act IV's: it rests at the true
 * figure and only animates when there's a compositor to animate with, so a
 * reader in a background tab never sees a maintenance plan quoted at $0.
 */
function PlanOption({ option: o, index, currency, shown }) {
  const ticked = useTicker(o.amount, shown);

  return (
    <div
      style={{
        ...planCard,
        borderColor: o.recommended ? "rgba(111,168,206,0.6)" : DARK.borderStrong,
        background: o.recommended ? DARK.cardRaised : DARK.card,
        opacity: shown ? 1 : 0,
        transitionDelay: `${index * 130}ms`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <p style={planName}>{o.name}</p>
        {o.recommended && <span style={recommendedTag}>Recommended</span>}
      </div>

      {/* The big number. One per option, because the whole point of the page is
          that a reader can compare two figures at a glance. */}
      <p className="lp-plan-price" style={planPrice}>
        {o.approx ? "~" : ""}${ticked.toLocaleString("en-AU")}
        <span style={planPer}> / {o.per}</span>
      </p>
      <p style={planCurrency}>{currency}</p>

      {o.covers?.length > 0 && (
        <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
          {o.covers.map((c, n) => (
            <li key={n} style={planBullet}>{c}</li>
          ))}
        </ul>
      )}

      {o.footnote && <p style={{ ...basis, marginTop: 9 }}>{o.footnote}</p>}
    </div>
  );
}

/* Kept for the list reading and for any proposal that later authors real
   acceptance criteria — the shape still works, it just isn't an act any more. */
// eslint-disable-next-line no-unused-vars
function DoneAct({ sections, nodes, scrollRoot }) {
  const ref = useRef(null);
  const shown = useRevealed(ref, scrollRoot);
  const authored = sections?.uat?.criteria || [];

  const checkpoints = useMemo(
    () => (nodes || []).filter((n) => n.kind === "hitl"),
    [nodes],
  );

  return (
    <Act anchorRef={ref} n="V" title="How you'll know it works" gloss="What “done” means, and who signs it off.">
      {authored.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {authored.map((u, i) => (
            <li key={i} style={{ ...costRow, opacity: shown ? 1 : 0, transitionDelay: `${i * 110}ms` }}>
              <div>
                <div style={{ fontWeight: 500 }}>{u.criterion}</div>
                <div style={basis}>{u.deliverable}{u.how_verified ? ` · verified by ${u.how_verified}` : ""}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : checkpoints.length > 0 ? (
        <>
          <p style={lede}>
            Acceptance criteria are defined together at discovery. These are the points in the
            build where you sign off — nothing moves past them without you.
          </p>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
            {checkpoints.map((n, i) => (
              <li key={n.id} style={{ ...costRow, opacity: shown ? 1 : 0, transitionDelay: `${i * 110}ms` }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{n.label}</div>
                  <div style={basis}>
                    {(n.gives || []).map((g) => g.label).filter(Boolean).join(" · ") || n.action || ""}
                  </div>
                </div>
                <span style={pill}>{(n.stakeholder || [])[0] || "Your team"}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Pending>Acceptance criteria are agreed at discovery and land here once signed.</Pending>
      )}
    </Act>
  );
}

/* Act VI — your turn. Feedback, then the document.
   PLAN.md: "a scroll narrative buries the ask", so the end of the scroll is
   where the ask has to be repeated rather than left behind at the dock. */
function FeedbackAct({ onSubmit }) {
  const [body, setBody] = useState("");
  const [state, setState] = useState("idle");   // idle | saving | sent | error

  async function submit() {
    if (!body.trim() || state === "saving") return;
    setState("saving");
    try {
      await onSubmit(body.trim());
      setState("sent");
      setBody("");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="lp-act" style={actBase}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
        <span style={{ ...eyebrowBase, color: ACCENT }}>Act VI</span>
      </div>
      <h2 className="lp-act-h" style={{
        margin: "0 0 6px", fontWeight: 500,
        letterSpacing: "-0.01em", color: DARK.text,
      }}>
        Tell us what you think
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: DARK.textFaint }}>
        Anything that doesn&apos;t fit, anything missing, anything you&apos;d cut.
      </p>

      {state === "sent" ? (
        <p style={{ ...lede, color: DARK.locked }}>
          Thank you — that&apos;s with us. Add more any time; this link stays live.
        </p>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); if (state === "error") setState("idle"); }}
            rows={4}
            placeholder="It doesn't have to be tidy — a sentence is plenty."
            style={feedbackBox}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={submit}
              disabled={!body.trim() || state === "saving"}
              style={{
                ...downloadBtn,
                opacity: !body.trim() || state === "saving" ? 0.5 : 1,
                cursor: !body.trim() || state === "saving" ? "default" : "pointer",
              }}
            >
              {state === "saving" ? "Sending…" : "Send us your feedback"}
            </button>
            {state === "error" && (
              <span style={{ fontSize: 12.5, color: DARK.pain }}>
                That didn&apos;t send. Try again in a moment.
              </span>
            )}
          </div>
          <p style={caveat}>
            This reaches us on its own — you don&apos;t have to press Send back as well, and
            it doesn&apos;t need the questions above to be finished first.
          </p>
        </>
      )}
    </section>
  );
}

/* The close — take it away, or send it back. */
function CloseAct({ proposal, onEvent }) {
  const href = proposal?.pdf_url || null;
  return (
    <div className="lp-act" style={{ ...actBase, borderBottom: "none", textAlign: "center" }}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onEvent?.("proposal_downloaded", null, {})}
          style={downloadBtn}
        >
          Download the full proposal
        </a>
      ) : (
        <Pending>
          The full proposal document hasn&apos;t been attached to this link yet — everything in it
          is on this page.
        </Pending>
      )}
      <p style={{ ...caveat, textAlign: "center" }}>
        Anything you&apos;ve filled in above is saved as you type. Use <strong>Send back</strong> when
        you&apos;re ready — you don&apos;t have to finish everything first.
      </p>
    </div>
  );
}

/* -------------------------------- shared --------------------------------- */

// `anchorRef`, not `ref`. This is React 18, where a ref passed to a function
// component is intercepted by React and never arrives as a prop — every
// observer here would have attached to `undefined`, and no bar would ever draw.
// The act header, on the website's own section-caption pattern: a small dot,
// an uppercase tracked eyebrow, then the heading. Title is 26/31 at 500 —
// LexOps H3, straight off the brand type scale rather than an invented size.
const Act = ({ anchorRef, n, title, gloss, children }) => (
  <section ref={anchorRef} className="lp-act" style={actBase}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
      <span style={{ ...eyebrowBase, color: ACCENT }}>Act {n}</span>
    </div>
    <h2 className="lp-act-h" style={{
      margin: "0 0 6px", fontWeight: 500,
      letterSpacing: "-0.01em", color: DARK.text,
    }}>{title}</h2>
    <p style={{ margin: "0 0 22px", fontSize: 13.5, lineHeight: 1.55, color: DARK.textFaint }}>{gloss}</p>
    {children}
  </section>
);

const Pending = ({ children }) => (
  <p style={{
    margin: 0, fontSize: 13, lineHeight: 1.55, color: DARK.textSub,
    background: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderStyle: "dashed", borderColor: DARK.border,
    borderRadius: 12, padding: "13px 15px",
  }}>{children}</p>
);

/* --------------------------------- styles -------------------------------- */

const CSS = `
@keyframes lp-throb {
  0%, 100% { box-shadow: 0 0 0 0 rgba(111,168,206,0.34), 0 8px 26px rgba(0,0,0,0.5); transform: scale(1); }
  50%      { box-shadow: 0 0 0 10px rgba(111,168,206,0.00), 0 10px 30px rgba(0,0,0,0.6); transform: scale(1.018); }
}
.lp-segue {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; font: inherit; font-size: 13.5px; font-weight: 500;
  color: ${DARK.text}; cursor: pointer;
  border: 1px solid ${DARK.borderStrong}; border-radius: 999px;
  background: ${DARK.cardDeep};
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 8px 26px rgba(0,0,0,0.5);
  transition: background ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease};
}
.lp-segue:hover { background: ${DARK.accent}; border-color: ${DARK.accentLift}; color: #fff; }
.lp-segue--throb { animation: lp-throb 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lp-segue--throb { animation: none; box-shadow: 0 0 0 3px rgba(111,168,206,0.2), 0 8px 26px rgba(0,0,0,0.5); }
}
`;

const perch = {
  position: "absolute", bottom: 120, left: 0, right: 0, zIndex: 5,
  display: "flex", justifyContent: "center", pointerEvents: "none",
};

// ---------------------------------------------------------------------------
// The acts, on the Opal scheme.
// ---------------------------------------------------------------------------
// What that reference actually does, and what's borrowed here:
//
//   · A near-black ground with almost nothing on it. Contrast comes from a
//     single bright element per screen, not from competing panels.
//   · One hero number per view, set large and *light* — big type at 600 weight
//     shouts; big type at 300 reads as confident. The figure carries the screen
//     and everything else is annotation around it.
//   · Outlined pill chips for secondary metrics, all with a visible border in
//     both states.
//   · Status said in one accent-coloured word, right-aligned on its row.
//   · Generous vertical rhythm — sections breathe rather than stack.
//
// Opaque, not glass: these acts scroll *over* the map, and translucent panels
// sliding across a canvas of moving bubbles are unreadable. That constraint is
// unchanged from the light version — only the value flipped.
const wrap = {
  position: "relative", zIndex: 8,
  // Its own atmosphere rather than a flat fill: the acts are a full-height
  // surface in their own right, and a flat near-black panel arriving over a
  // bloomed map is the moment the reader notices they've left the good part.
  // Blooms are placed differently from the map's so the two don't read as the
  // same screen scrolled.
  background: [
    "radial-gradient(900px 600px at 85% 4%, rgba(55,89,113,0.30) 0%, rgba(7,12,17,0) 58%)",
    "radial-gradient(760px 520px at 8% 46%, rgba(79,191,135,0.07) 0%, rgba(7,12,17,0) 55%)",
    `linear-gradient(180deg, #0A1119 0%, ${DARK.bgDeep} 40%)`,
  ].join(", "),
  borderTop: `1px solid ${DARK.borderStrong}`,
  // A blue lift at the seam, so the acts arrive over the map rather than
  // guillotining it.
  boxShadow: "0 -24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(157,181,201,0.18)",
};
const actBase = {
  maxWidth: 780, margin: "0 auto",
  // Padding is in ACTS_CSS (.lp-act) so it can respond to the breakpoints.
  borderBottom: `1px solid ${DARK.borderFaint}`,
};
const lede = { margin: 0, fontSize: 15, lineHeight: 1.65, color: DARK.textSub };
const caveat = { margin: "16px 0 0", fontSize: 12, lineHeight: 1.5, color: DARK.textFaint };
const subHead = { ...eyebrowBase, margin: "0 0 6px" };
// Rows are a fixed 26px in both columns, so a label always sits on its own
// lane. Any mismatch here and the whole grid shears — which is exactly what a
// chart is not allowed to do.
const LANE_ROW = 26;

const laneLabelCol = {
  flexShrink: 0,
  display: "flex", flexDirection: "column", gap: 7,
  paddingTop: 8,
};
const laneLabel = {
  height: LANE_ROW, display: "flex", alignItems: "center", justifyContent: "flex-end",
  fontSize: 12.5, color: DARK.textSub, textAlign: "right", lineHeight: 1.25,
};

/**
 * The plot. Week rules are a repeating gradient rather than N elements — one
 * paint, no DOM, and it stays exact at any width because the stop is a
 * percentage of the container rather than a computed pixel offset.
 */
const plotArea = (weeks) => ({
  position: "relative",
  display: "flex", flexDirection: "column", gap: 7,
  padding: "8px 0",
  borderRadius: RADIUS.inner,
  backgroundImage:
    `repeating-linear-gradient(to right, ${DARK.borderFaint} 0 1px, transparent 1px ${100 / Math.max(1, weeks)}%)`,
  // A left and right edge, so the grid is bounded rather than fading out into
  // the page at both ends.
  borderLeft: `1px solid ${DARK.border}`,
  borderRight: `1px solid ${DARK.border}`,
});

const laneRow = { position: "relative", height: LANE_ROW };

const laneBar = {
  position: "absolute", top: "50%", height: 8, marginTop: -4,
  borderRadius: 999,
  transition: "width 620ms cubic-bezier(.22,.9,.3,1)",
};

// The endpoint marker, drawn as a ringed dot so it reads as a reading on a line
// rather than as the end of a bar.
const laneDot = {
  position: "absolute", top: "50%", width: 7, height: 7, marginTop: -3.5, marginLeft: -3.5,
  borderRadius: "50%",
  boxShadow: "0 0 0 3px rgba(7,12,17,0.85)",
  transition: "opacity 420ms ease",
};

const laneWeeks = {
  position: "absolute", top: "50%", transform: "translateY(-50%)",
  fontSize: 10.5, fontWeight: 500, color: DARK.textSub,
  fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
  transition: "opacity 420ms ease",
};

const ganttAxis = {
  display: "flex", justifyContent: "space-between",
  marginTop: 8, fontSize: 10.5, color: DARK.textFaint,
};

const costRow = {
  display: "flex", justifyContent: "space-between", gap: 20,
  padding: "13px 0", borderBottom: `1px solid ${DARK.borderFaint}`,
  fontSize: 13.5, transition: "opacity 500ms ease",
};
const basis = { fontSize: 12, color: DARK.textFaint, marginTop: 3, lineHeight: 1.45, maxWidth: 520 };

// The hero row. Opal's score screen is one number, centred, with its label
// under it — this is that shape applied to the project total.
const totalBox = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
  marginTop: 18, padding: "20px 20px", borderRadius: 16,
  background: DARK.card,
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.borderStrong,
};
const pill = {
  alignSelf: "flex-start", fontSize: 11.5, color: DARK.textSub, whiteSpace: "nowrap",
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.borderStrong,
  borderRadius: 999, padding: "3px 10px",
};
const planCard = {
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.borderStrong,
  borderRadius: 16, padding: "18px 18px 20px",
  background: DARK.card,
  transition: "opacity 500ms ease",
};
const planName = { margin: 0, fontSize: 13.5, fontWeight: 500, color: DARK.text };
const recommendedTag = {
  fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", whiteSpace: "nowrap",
  color: ACCENT, borderWidth: 1, borderStyle: "solid", borderColor: "rgba(111,168,206,0.5)",
  borderRadius: 999, padding: "3px 9px",
};
// 300 weight, not 600. The reference sets its scores light and large; a price
// at 600 reads as a demand, the same figure at 300 reads as a fact.
const planPrice = {
  margin: "14px 0 0", lineHeight: 1.02, fontWeight: 300,
  letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: DARK.text,
};
const planPer = { fontSize: 14, fontWeight: 400, color: DARK.textSub, letterSpacing: 0 };
const planCurrency = { margin: "4px 0 0", fontSize: 11.5, color: DARK.textFaint };
const planBullet = {
  position: "relative", paddingLeft: 13, marginBottom: 7,
  fontSize: 12.5, lineHeight: 1.5, color: DARK.textSub,
  borderLeft: `2px solid rgba(111,168,206,0.4)`,
};
const feedbackBox = { ...fieldDark, padding: "12px 14px", lineHeight: 1.5, borderRadius: 12, resize: "vertical" };
const downloadBtn = {
  display: "inline-block", padding: "12px 24px", borderRadius: 10,
  background: DARK.accent, color: "#fff", fontSize: 14, fontWeight: 500,
  textDecoration: "none",
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.accentLift,
};
