// ---------------------------------------------------------------------------
// The Copilot rail.
// ---------------------------------------------------------------------------
// Answers are retrieved from a fixed, hand-written knowledge base built off the
// same capture set the map is drawn from — there is no model call here, and
// deliberately so. Every answer names the evidence it rests on, and the ones
// that would be a guess say so instead of guessing. When a question has a place
// on the map, the answer carries a button that drives the map there rather than
// describing where to click.
//
// If this is ever wired to a real model, the contract to keep is the last two
// sentences: cite the tier, and refuse outside the capture set.
// ---------------------------------------------------------------------------
import { useState, useRef, useEffect } from "react";
import { PEOPLE, THREADS, threadById, neighboursOf, touchpointsFor } from "../../data/missionControl.js";
import { DARK, RADIUS, eyebrow, fieldDark, pill } from "../proposalCanvas/theme.js";
import { PALETTE } from "../proposalCanvas/language.js";

const KB = [
  { k: ["bottleneck", "stuck", "hub", "blocker", "stall", "stalls", "held up", "waiting"], w: 3,
    act: { view: "people", person: "samindi" }, jump: "Show Samindi on the map",
    a: `<p><strong>Samindi De Silva</strong> is the clearest bottleneck in this capture set — and she has no footage of her own.</p>
<p>She is the review gate in both cross-person threads. In the care-package thread she is asked for input and becomes the last owner with no resolution. In the ISO offboarding thread she formats, re-opens, re-formats, then hands to Akil.</p>
<p>Two threads stall specifically <em>at</em> her, and neither clip shows her closing the loop.</p>
<cite>Cross-cutting insight · threads 01 and 02</cite>` },

  { k: ["decision maker", "decision makers", "who decides", "authority", "sign off", "sign-off", "approve"], w: 3,
    act: { view: "people" }, jump: "Open the role map",
    a: `<p>Three people gate other people's work — the faceted amber bubbles on both maps:</p><ul>
<li><strong>Samindi De Silva</strong> — HR &amp; Compliance. Rules cash out on policy grounds, re-opens the ISO document, resolves the terminology question.</li>
<li><strong>Jude Pottier</strong> — Client Delivery. Calls Lei's roll-off unilaterally; no approval step precedes it on camera.</li>
<li><strong>Himaya Gunawardena</strong> — People Ops Lead. Authorises the exit email and the offboarding logistics.</li></ul>
<p>Two of the three have no capture of their own, so their decisions are only visible in someone else's screen.</p>
<cite>Role &amp; reporting map</cite>` },

  { k: ["closed", "complete", "completed", "resolved", "finish", "end to end", "end-to-end"], w: 3,
    act: { view: "wf", wf: "t3" }, jump: "Open workflow 03",
    a: `<p><strong>Thread 03, Lei Panganiban's offboarding</strong> — the only workflow that runs from open decision to confirmed completion inside the captured footage.</p>
<p>Nine touchpoints in one 68-minute window, single owner (Piyara) with explicit sign-off at every decision point. It ends on a green output bubble: the exit email, sent and confirmed.</p>
<p>It is also the only thread that never leaves one person's clip. That is the pattern worth noticing.</p>
<cite>Thread 03 · Explicit throughout</cite>` },

  { k: ["weak", "weakest", "manual review", "shaky", "unreliable", "doubt", "verify"], w: 3,
    act: { view: "wf", wf: "all" }, jump: "Show every workflow",
    a: `<p>Three links carry the most risk — the faded bubbles and dashed edges:</p><ul>
<li><strong>Thread 02, Samindi's re-format.</strong> Very likely the same document, but no screenshot shows a shared file name connecting Himaya's formatted version to the "changed to fit ISO standards" version.</li>
<li><strong>Thread 01, Piyara → Jerome.</strong> A same-first-name inference across a 24-hour cross-clip gap. The RMK Lawyers detail is specific, but nothing quotes across.</li>
<li><strong>Possible thread C.</strong> Two Procurement archiving discussions sharing a channel and a justification but naming different people — Ely versus Tanzil Remu. An easy false merge.</li></ul>
<cite>Flagged for manual review</cite>` },

  { k: ["handoff", "handoffs", "hand off", "quiet", "goes quiet", "cross person", "ownership"], w: 3,
    a: `<p>Ownership is clear inside a person's own session and ambiguous the moment it crosses people.</p>
<p>Thread 03 is fully single-clip and resolves cleanly with an explicit owner at every step. Both threads that cross clips end on a pending note <em>precisely at the handoff point</em> — thread 01 ends "Samindi will search when she gets a break", thread 02 ends "waiting for Akil to check".</p>
<p>This may be an artifact of capture timing rather than a real organisational problem. But it holds across every cross-person thread in the set.</p>
<cite>Cross-cutting insight</cite>` },

  { k: ["coverage", "how much", "captured", "footage", "clips", "sample", "confidence"], w: 3,
    a: `<p><strong>6.6 hours across four person-days</strong> — roughly 7% of the working time in the window.</p><ul>
<li>Piyara — 19 Aug, 04:25–06:38 UTC (2h 13m)</li>
<li>Himaya — 20 Aug, 03:48–05:48 UTC (2h 00m)</li>
<li>Jerome — 20 Aug, 04:18–06:05 UTC (1h 47m)</li>
<li>Zolara — 25 Aug, 08:06–08:42 UTC (36m)</li></ul>
<p>Every gap on the map may reflect off-camera work rather than idle time. Himaya's "9:42 PM prior day" note is direct proof that real work happened in a window neither clip recorded.</p>
<cite>Capture windows, true UTC</cite>` },

  { k: ["busiest", "most workflows", "load", "spread thin", "most connected", "workload"], w: 3,
    act: { view: "people", person: "himaya" }, jump: "Show Himaya's network",
    a: `<p><strong>Himaya Gunawardena</strong> and <strong>Piyara Wijekoon</strong> each sit across all three confirmed threads — the two largest bubbles on the role map. No one else exceeds two.</p>
<p>Himaya carries the most weight by touchpoints (19 observed) and is the only person connecting every cluster: Jerome on the care package, Samindi upward, Piyara downward, Akil on devices.</p>
<p>The single point of fragility here is not the most senior person — it is the People Ops Lead sitting between the principals and the executors.</p>
<cite>Role &amp; reporting map</cite>` },

  { k: ["duplicate", "duplicated", "duplication", "same work twice", "redundant"], w: 3,
    act: { view: "wf", wf: "uA" }, jump: "Open the dock pattern",
    a: `<p><strong>No duplicated-effort case survives Strong or better evidence.</strong></p>
<p>The closest candidate was three independent "dock" deck-building efforts — but those turned out to be three genuinely different client deals: Lex Altico, Etherial Holdings and Evolve500.</p>
<p>With only four clips covering a handful of hours, this set is too sparse to confirm or rule out duplication. Absence of evidence is not evidence of absence here.</p>
<cite>Possible thread A · Weak evidence</cite>` },

  { k: ["iso", "offboarding document", "27001", "asset declaration", "checklist", "form"], w: 3,
    act: { view: "wf", wf: "t2" }, jump: "Open workflow 02",
    a: `<p><strong>Thread 02 — the ISO 27001 offboarding document.</strong> A clean chain of ownership that stops dead at a reviewer with no footage.</p>
<p>Piyara drafts it in Word alongside a ChatGPT ISO Policy thread — the gold-cored bubble, and the only AI-assisted step in six hours of footage → shares it → Samindi approves with one comment → Himaya formats it overnight → Samindi re-opens, takes the edit, produces the ISO-standard version → hands to <strong>Akil, where it still sits</strong>.</p>
<p>That last link is Strong, not Explicit — no screenshot shows a shared file name between the two versions.</p>
<cite>Thread 02 · 22h 19m off-camera gap</cite>` },

  { k: ["gift", "hamper", "beverly", "aaron", "care package", "welfare", "cash", "rations"], w: 3,
    act: { view: "wf", wf: "t1" }, jump: "Open workflow 01",
    a: `<p><strong>Thread 01 — the Beverly and Aaron care package.</strong> The clearest example of a decision that bounces and never lands.</p>
<p>Jerome sources a hamper (~57 AUD) → the path splits on cash versus hamper → Himaya escalates → Samindi rules cash out, because there is no staff-welfare policy for Philippines-based staff → Himaya pivots to dry rations → Samindi parks it: <em>"when I take a break from the laptop screen I will search"</em>.</p>
<p>It is also the thread with the strongest evidence in the set — the Jerome-to-Himaya exchange is captured independently on both machines, 68 seconds apart.</p>
<cite>Thread 01 · Stalled</cite>` },

  { k: ["lei", "contractor", "exit email", "exit interview", "roll off", "remote wipe", "laptop"], w: 3,
    act: { view: "wf", wf: "t3" }, jump: "Open workflow 03",
    a: `<p><strong>Thread 03 — Lei Panganiban's offboarding.</strong> Jude decides to roll her off per a client response. Piyara raises it in HR gang, Himaya gives the go-ahead ("Yes, you can send the exit email"), Akil is assigned the remote wipe and laptop collection, Piyara calls Lei, drafts the End of Engagement email with the Exit Interview Form, and confirms it closed — all inside 68 minutes.</p>
<p>One open edge: Akil's device work is assigned but never confirmed on camera.</p>
<cite>Thread 03 · Closed</cite>` },

  { k: ["dock", "deck", "candidate", "proposals", "profiles", "evolve500", "lex altico", "etherial"], w: 3,
    act: { view: "wf", wf: "uA" }, jump: "Open the dock pattern",
    a: `<p>Three candidate profile decks, three different deals — <strong>a recurring process pattern, not a single thread</strong>.</p><ul>
<li>Dock for Lex Altico — posted by Zolara, 19 Aug</li>
<li>Dock for Etherial Holdings (Canada) — a Jude and Zolara photo exchange, 20 Aug</li>
<li>Dock for Evolve500 — built end to end in Zolara's own clip, 25 Aug</li></ul>
<p>The only thing linking them is the channel name and the word "dock". Every bubble is drawn faint for exactly that reason.</p>
<cite>Possible thread A · Weak</cite>` },

  { k: ["overlap", "two machines", "independently", "timestamp", "verified", "68 seconds"], w: 3,
    act: { view: "wf", wf: "t1" }, jump: "See the verified exchange",
    a: `<p>The <strong>Himaya and Jerome overlap</strong> is the single most load-bearing fact in this analysis.</p>
<p>Their clips were recorded on different machines in different countries and overlap by about 90 minutes once converted to a shared clock. Jerome sends the giftbasket link at 04:35:25 UTC; it appears landing in Himaya's own Teams client at 04:36:26 — 68 seconds later.</p>
<p>It is the only cross-person link confirmed by matching independently-captured timestamps rather than by inference. Piyara's and Zolara's clips do not overlap with anything.</p>
<cite>Capture windows · Thread 01</cite>` },

  { k: ["reports to", "hierarchy", "who reports", "org chart", "reporting", "senior", "junior"], w: 3,
    act: { view: "people" }, jump: "Open the role map",
    a: `<p>The reporting lines are <strong>inferred from observed sign-off direction</strong>, not read off an HR chart. Treat them as a hypothesis.</p><ul>
<li><strong>Tier 1</strong> — Samindi De Silva, Jude Pottier. Nobody overrules them on camera.</li>
<li><strong>Tier 2</strong> — Himaya Gunawardena, Akil Fernando. They authorise and gate.</li>
<li><strong>Tier 3</strong> — Piyara, Jerome, Zolara, Dhawalani. They produce the work.</li>
<li><strong>Tier 4–5</strong> — Nadun (notified only) and Lei (the subject of a workflow, not an actor).</li></ul>
<p>Akil is the weakest placement: he reviews Samindi's work but is assigned tasks by Himaya. Click his bubble for the exact basis.</p>
<cite>Inferred · confirm before acting</cite>` },

  { k: ["gap", "gaps", "how long", "delay", "time between", "off camera"], w: 3,
    a: `<p>Three gaps matter, and all three cross off-camera time:</p><ul>
<li><strong>23h 05m</strong> — thread 01, Piyara identifying Beverly to Jerome picking up the ask.</li>
<li><strong>22h 19m</strong> — thread 02, Samindi's approval to Himaya's formatting pass. We know work happened inside it: her own note reads "9:42 PM prior day".</li>
<li><strong>Zero</strong> — thread 03 has no gap exceeding the footage.</li></ul>
<p>Only a 1–2 hour slice of each day was captured, so no gap on this map should be read as idle time.</p>
<cite>Sequence &amp; gaps</cite>` },

  { k: ["automate", "automation", "opportunity", "return", "roi", "optimise", "optimize", "improve"], w: 2,
    a: `<p>Look at the map: it is almost entirely amber. That is the answer — <strong>nothing in six hours of captured work is automated</strong>, bar one ChatGPT-assisted draft.</p><ul>
<li><strong>Offboarding is already a template.</strong> Thread 03 ran nine explicit steps in 68 minutes with the same shape every time: go-ahead, device wipe, call, exit email, exit-interview handover. That is a checklist waiting to be a workflow.</li>
<li><strong>The review queue is the constraint, not the drafting.</strong> Both stalled threads stall at a named reviewer with no due date. An owner-plus-date on every handoff would close more loops than any drafting tool.</li>
<li><strong>A missing policy causes rework.</strong> The care package reversed twice for want of a staff-welfare document. Writing the policy removes the whole thread.</li></ul>
<p>Caveat: three confirmed threads over 6.6 hours is a starting point, not a baseline. Widen the capture before sizing a return.</p>
<cite>Read against PRD §5</cite>` },

  { k: ["what can you", "help", "what do you know", "legend", "key", "colours", "colors"], w: 1,
    a: `<p>I read the stitched capture set behind these two maps. The grammar on screen:</p><ul>
<li><strong>Amber</strong> is a person. It dominates because this process is entirely human-run.</li>
<li><strong>Shape</strong> carries decisions — a faceted bubble is a decision, a haloed one is a checkpoint.</li>
<li><strong>Green</strong> is produced and kept. A <strong>faded</strong> bubble is weaker evidence, not lesser work.</li>
<li>Left to right is how far through the work you are — computed from the handoffs, not authored.</li></ul>
<p>Ask about where work gets stuck, which handoffs rest on weak evidence, any of the six workflows, any of the ten people, or how thin the coverage is.</p>` },
];

const SUGGESTIONS = {
  wf: ["Where does work get stuck between people?",
       "Which handoffs rest on the weakest evidence?",
       "Which workflow actually closed end to end?"],
  people: ["Who is the biggest bottleneck?",
           "Who are the decision makers here?",
           "Who reports to whom, and how sure are we?"],
};

function personCard(id) {
  const p = PEOPLE[id];
  const near = neighboursOf(id);
  const wfs = THREADS.filter((t) => t.steps.some((s) => s.who === id));
  const reports = Object.values(PEOPLE).filter((x) => x.reportsTo === id);
  return {
    act: { view: "people", person: id },
    jump: `Show ${p.short} on the map`,
    a: `<p><strong>${p.name}</strong> — ${p.role}${p.loc ? `, ${p.loc}` : ""}.</p><ul>
<li><strong>${p.decision ? "A decision maker" : "Not a decision maker"}</strong> — ${p.basis}</li>
<li>Sits across <strong>${wfs.length}</strong> workflow${wfs.length === 1 ? "" : "s"}: ${wfs.map((t) => `${t.n} ${t.name}`).join(", ")}</li>
<li><strong>${touchpointsFor(id)} observed touchpoints</strong> across ${Object.keys(near).length} people — ${Object.entries(near).map(([x, t]) => `${PEOPLE[x].short} ${t.w}×`).join(", ")}</li>
<li>Reports to ${p.reportsTo ? `<strong>${PEOPLE[p.reportsTo].name}</strong>` : "<strong>nobody in this data</strong>"}${reports.length ? `; reported to by ${reports.map((x) => x.short).join(", ")}` : ""}</li>
<li>${p.clip ? `Captured ${p.clip}.` : "<strong>No capture of their own</strong> — every appearance is from someone else's screen."}</li></ul>
<cite>Role &amp; reporting map · tier ${p.tier}</cite>`,
  };
}

function match(q) {
  const s = q.toLowerCase();
  const generic = /bottleneck|decision maker|reports to|hierarchy|stuck/.test(s);
  if (!generic) {
    for (const id of Object.keys(PEOPLE)) {
      const p = PEOPLE[id];
      if (s.includes(p.short.toLowerCase()) || s.includes(p.name.toLowerCase())) return personCard(id);
    }
  }
  let best = null, score = 0;
  for (const e of KB) {
    let sc = 0;
    for (const k of e.k) if (s.includes(k)) sc += e.w * (k.length > 7 ? 1.6 : 1);
    if (sc > score) { score = sc; best = e; }
  }
  if (best && score >= 2) return best;
  return {
    a: `<p>I do not have a grounded answer for that in the 19–25 Aug capture set, and I would rather say so than guess.</p>
<p>What I can speak to: the three confirmed workflows (care package, ISO offboarding document, Lei's offboarding), the three unconfirmed patterns, any of the ten people on the role map, and how thin the coverage is.</p>`,
  };
}

/** Renders the KB's small HTML subset. Content is authored in this file only —
 *  nothing here ever renders user input as markup. */
function Answer({ html }) {
  return <div className="mc-answer" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function CopilotPanel({ view, onAct }) {
  const [log, setLog] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [log, thinking]);

  function ask(text) {
    const q = (text || "").trim();
    if (!q) return;
    setLog((l) => [...l, { role: "user", text: q }]);
    setDraft("");
    setThinking(true);
    // A beat, so an answer reads as a response rather than as a pre-baked panel.
    setTimeout(() => {
      setThinking(false);
      setLog((l) => [...l, { role: "bot", ...match(q) }]);
    }, 380);
  }

  return (
    <aside style={{
      width: 356, flex: "none", display: "flex", flexDirection: "column",
      borderLeft: `1px solid ${DARK.borderFaint}`, minHeight: 0,
    }}>
      <style>{`
        .mc-answer p { margin: 0 0 9px }
        .mc-answer p:last-child { margin: 0 }
        .mc-answer ul { margin: 0 0 9px; padding-left: 16px }
        .mc-answer li { margin-bottom: 6px }
        .mc-answer strong { color: ${DARK.text}; font-weight: 700 }
        .mc-answer em { color: ${DARK.text} }
        .mc-answer cite {
          display: block; margin-top: 11px; padding-top: 9px;
          border-top: 1px solid ${DARK.borderFaint};
          font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
          color: ${DARK.textFaint}; font-style: normal;
        }
      `}</style>

      <div style={{ padding: "14px 17px", borderBottom: `1px solid ${DARK.borderFaint}`,
        display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Copilot</h2>
        {log.length > 0 && (
          <button onClick={() => setLog([])} style={{ ...eyebrow, marginLeft: "auto", fontSize: 10,
            background: "none", border: "none", color: DARK.textFaint, cursor: "pointer" }}>Clear</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 17, display: "flex",
        flexDirection: "column", gap: 13, minHeight: 0 }}>
        {log.length === 0 && (
          <div style={{ textAlign: "center", padding: "22px 4px 6px" }}>
            <h3 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Mission Control Copilot
            </h3>
            <p style={{ margin: "0 auto", fontSize: 12.5, color: DARK.textFaint, maxWidth: 252, lineHeight: 1.55 }}>
              Ask about a workflow, a handoff, or a person. Every answer names the evidence it rests on.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              {SUGGESTIONS[view].map((q) => (
                <button key={q} onClick={() => ask(q)} style={{
                  textAlign: "left", padding: "11px 13px", borderRadius: RADIUS.inner,
                  border: `1px solid ${DARK.border}`, background: DARK.card, color: DARK.text,
                  fontSize: 12.4, fontWeight: 500, lineHeight: 1.4, cursor: "pointer",
                }}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {log.map((m, i) => (
          m.role === "user" ? (
            <div key={i} style={{
              alignSelf: "flex-end", maxWidth: "88%", background: DARK.accent,
              border: `1px solid ${DARK.accentLift}`, color: "#fff", padding: "9px 13px",
              borderRadius: "14px 14px 4px 14px", fontSize: 12.8, fontWeight: 500, lineHeight: 1.6,
            }}>{m.text}</div>
          ) : (
            <div key={i} style={{
              alignSelf: "flex-start", background: DARK.card, border: `1px solid ${DARK.border}`,
              padding: "12px 14px", borderRadius: "14px 14px 14px 4px",
              color: DARK.textSub, fontSize: 12.8, lineHeight: 1.6,
            }}>
              <Answer html={m.a} />
              {m.act && m.jump && (
                <button onClick={() => onAct(m.act)} style={{
                  marginTop: 10, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
                  color: PALETTE.primary, padding: "6px 11px", borderRadius: RADIUS.pill,
                  border: `1px solid ${DARK.borderStrong}`, background: "none",
                  fontWeight: 600, cursor: "pointer",
                }}>{m.jump}</button>
              )}
            </div>
          )
        ))}

        {thinking && (
          <div style={{ alignSelf: "flex-start", color: DARK.textFaint, fontSize: 12.8, padding: "12px 14px" }}>…</div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "13px 15px 15px", borderTop: `1px solid ${DARK.borderFaint}`, flex: "none" }}>
        <form onSubmit={(e) => { e.preventDefault(); ask(draft); }}
          style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); }
            }}
            rows={1}
            placeholder="Ask about a workflow or a person…"
            aria-label="Ask Copilot"
            style={{ ...fieldDark, resize: "none", minHeight: 40, maxHeight: 112, lineHeight: 1.45 }}
          />
          <button type="submit" aria-label="Send" style={{
            width: 40, height: 40, borderRadius: 9, background: DARK.accent,
            border: `1px solid ${DARK.accentLift}`, color: "#fff", cursor: "pointer", flex: "none",
          }}>→</button>
        </form>
        <p style={{ fontSize: 10, color: DARK.textFaint, textAlign: "center", margin: "9px 0 0", lineHeight: 1.45 }}>
          Grounded in the 19–25 Aug capture set. Check the evidence tier before acting.
        </p>
      </div>
    </aside>
  );
}
