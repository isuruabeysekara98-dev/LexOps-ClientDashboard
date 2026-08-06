// ---------------------------------------------------------------------------
// The Living Proposal admin — create / edit.
// ---------------------------------------------------------------------------
// This is the one place a proposal's graph is authored. Every field on this
// page exists because something downstream reads it — reference, field for
// field:
//
//   client/src/components/proposalCanvas/nodeContract.js   readNode()  — the
//     four-question contract every node answers (identity, needs, gives,
//     assumptions) and the panel/story/list render nothing else.
//   client/src/components/proposalCanvas/language.js       colourFor(),
//     radiusFor()  — `kind`, `actor`, `pain`, `confidence`, `size` drive the
//     map's whole visual grammar.
//   client/src/components/ProposalActs.jsx                 the roadmap,
//     costing and maintenance acts — `sections.roadmap|costing|maintenance`.
//   supabase/proposal_sections.sql                          the authoritative
//     shape comment for `sections`.
//
// There is deliberately no separate "preview data" or "draft copy" — Save
// writes the exact row `GET /api/lp/p/:token` serves, so what this form holds
// and what a client sees can never drift into two different documents.
//
// The page is organised as the *client's* document, not as the data model:
// sections run in reading order and each carries the act it feeds, per
// LIVING-PROPOSAL-PLAN.md §2b's table (0 · The Promise → VI · Your turn).
// `EditorNav` is that same order as a table of contents. Two acts have no
// section, and both are said out loud in the rail rather than left to be
// discovered: Act VI is assembled from every node's `needs`, and Act I ·
// Today was specified but never built.
//
// Three things are shown that the save path doesn't enforce, because each one
// silently subtracts from what the client receives rather than breaking it:
// `GraphCanvas` (whether the map is actually connected), `FirstSentenceHint`
// (whether a description will reach an explainer beat at all), and `notices`
// (which acts will draw their empty state). `problems` remains the separate,
// harder list of things that stop a save.
//
// Node positions are never authored here. `x`/`y` are a d3-force output,
// recomputed client-side on every load from `edges` — authoring a graph is
// authoring structure and copy, not a layout.
// ---------------------------------------------------------------------------
import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, Plus, ChevronDown, ChevronUp, ExternalLink, Send, AlertTriangle, Download, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase.js";
import { fetchWithTimeout, useSlowHint } from "@/lib/loadUtils.js";
// The compiler's own sentence splitter and line budget, not a copy of them —
// the whole point of the counter below is that it agrees with what will
// actually happen when the film is compiled.
import { firstSentence, LINE_BUDGET } from "@shared/explainerScript";

// ---------------------------------------------------------------------------
// Style primitives — same tokens as ProposalsListPage / ProposalCreatePage,
// so the living-proposal admin reads as part of the same app rather than a
// bolt-on. (The client-facing dark theme in proposalCanvas/theme.js is a
// different surface on purpose — that's the artifact, this is the tool.)
// ---------------------------------------------------------------------------
const t = {
  bg: "#FAFBFC", surface: "#F4F8FB", surfaceHigh: "#E4F1F8",
  card: "#FFFFFF", nav: "#FFFFFF",
  border: "#E8E8E8", borderLight: "rgba(0,0,0,0.08)",
  text: "#232A34", textSub: "#616568", textMeta: "#9DB5C9",
  accent: "#375971", accentHover: "#232A34", accentLight: "rgba(55,89,113,0.07)",
  amber: "#B06F00", amberSoft: "rgba(240,169,60,0.1)",
  red: "#C9542E", redSoft: "rgba(201,84,46,0.08)",
  green: "#3C7A52",
  shadow: "0 1px 4px rgba(35,42,52,0.06)",
};

const inp = {
  width: "100%", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13.5, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const label = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 6 };
const btnBase = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" };
const ghostBtn = { ...btnBase, background: t.surface, color: t.textSub };
const dangerBtn = { ...btnBase, background: "transparent", color: t.red, padding: "6px 6px" };
const addBtn = { ...btnBase, background: "none", color: t.accent, fontWeight: 600, padding: "2px 0" };

// The act badge on a section heading. Every section that becomes something the
// client actually reads carries one, so an author can hold the form and the
// artifact in the same head. Act numbering is LIVING-PROPOSAL-PLAN.md §2b's
// table (0 · The Promise → VI · Your turn), not invented here.
const actChip = {
  flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
  color: t.accent, background: t.accentLight, borderRadius: 5, padding: "2px 6px",
};

function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}
function uniqueSlug(base, taken) {
  const b = base || "item";
  if (!taken.has(b)) return b;
  let i = 2;
  while (taken.has(`${b}-${i}`)) i++;
  return `${b}-${i}`;
}
function csv(arr) { return (arr || []).join(", "); }
function fromCsv(s) { return s.split(",").map((x) => x.trim()).filter(Boolean); }

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
}

// ---------------------------------------------------------------------------
// A field group: label + control, laid out consistently.
// ---------------------------------------------------------------------------
function Field({ children, wide, hint }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: t.textMeta, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

/** A collapsible card — used for every node/lane/option/etc that has enough
 *  fields to be worth hiding by default. */
function Card({ title, sub, tone, open, onToggle, onDelete, children, badge }) {
  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, background: t.card, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", background: open ? t.surface : "transparent" }}
      >
        {tone && <span style={{ width: 8, height: 8, borderRadius: "50%", background: tone, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: t.textMeta, marginTop: 1 }}>{sub}</div>}
        </div>
        {badge}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={dangerBtn} title="Delete"><Trash2 size={14} strokeWidth={1.75} /></button>
        {open ? <ChevronUp size={16} color={t.textMeta} /> : <ChevronDown size={16} color={t.textMeta} />}
      </div>
      {open && <div style={{ padding: 14, borderTop: `1px solid ${t.border}` }}>{children}</div>}
    </div>
  );
}

/** A generic repeatable list — add, remove, and (optionally) reorder. Every
 *  array in the graph (deliverables, needs, gives, edges, lanes, ...) goes
 *  through this one component, so "add a row" behaves identically everywhere
 *  in the form. */
function RepeatList({ items, onChange, newItem, renderItem, addLabel, reorder, empty }) {
  // A list whose caller supplies its own Add control passes no `newItem`, and
  // then this component must not render one either. It used to render its
  // button unconditionally, so the nodes list — which has a custom Add below
  // it, because a new node needs an id minted against the rest of the array —
  // was given `newItem={() => null}` and had *two* buttons. Pressing the wrong
  // one pushed a literal `null` into `g.nodes`, and the next render died on
  // `g.nodes.map((n) => n.id)`.
  //
  // The guard is belt and braces: no button without a factory, and no append
  // of whatever a factory returns if it isn't an object.
  const add = () => {
    const item = newItem?.();
    if (item == null || typeof item !== "object") return;
    onChange([...(items || []), item]);
  };
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, dir) => {
    const ni = i + dir;
    if (ni < 0 || ni >= items.length) return;
    const next = [...items];
    [next[i], next[ni]] = [next[ni], next[i]];
    onChange(next);
  };
  return (
    <div>
      {(!items || items.length === 0) && (
        <div style={{ color: t.textMeta, fontSize: 12, fontStyle: "italic", marginBottom: 8 }}>{empty || "None yet."}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(items || []).map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {reorder && (
              <div style={{ display: "flex", flexDirection: "column", paddingTop: 2 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...dangerBtn, color: i === 0 ? t.borderLight : t.textMeta, padding: 0 }}><ChevronUp size={13} /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ ...dangerBtn, color: i === items.length - 1 ? t.borderLight : t.textMeta, padding: 0 }}><ChevronDown size={13} /></button>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item, i, (patch) => update(i, patch))}</div>
            <button onClick={() => remove(i)} style={dangerBtn} title="Remove"><Trash2 size={14} strokeWidth={1.75} /></button>
          </div>
        ))}
      </div>
      {newItem && (
        <button onClick={add} style={{ ...addBtn, marginTop: 8 }}><Plus size={13} strokeWidth={2.5} /> {addLabel}</button>
      )}
    </div>
  );
}

/** Advisory gaps on one node — things that quietly change what a client sees
 *  but that the save path accepts without complaint. Deliberately separate
 *  from `problems`, which are structural errors that break the render. */
function nodeGaps(n) {
  const gaps = [];
  const one = firstSentence(n.description || "");
  if (!one) gaps.push("no description");
  else if (one.length > LINE_BUDGET) gaps.push("first sentence too long");
  if (!(n.assumptions || []).filter(Boolean).length) gaps.push("no assumption");
  return gaps;
}

/** Live readout of whether a description's first sentence will actually reach
 *  the screen.
 *
 *  `beatCopy` takes the first sentence whole or not at all: over LINE_BUDGET it
 *  declines the prose and captions the beat `label — action` instead. That is a
 *  silent substitution — the description stays in the database, looks authored,
 *  and never appears. 55 of 79 nodes were in that state before anyone measured
 *  it, so the measurement now sits next to the field. */
function FirstSentenceHint({ text }) {
  const one = firstSentence(text || "");
  if (!one) {
    return <p style={{ margin: "4px 0 0", fontSize: 11, color: t.textMeta }}>Empty — the film will caption this node with its label.</p>;
  }
  const over = one.length > LINE_BUDGET;
  return (
    <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.45, color: over ? t.amber : t.textMeta }}>
      First sentence <strong style={{ fontVariantNumeric: "tabular-nums" }}>{one.length}</strong>/{LINE_BUDGET}
      {over
        ? " — too long, so the film falls back to “label — action” and this sentence never reaches the client. Put the context in sentence two."
        : " — fits, so it carries the beat."}
    </p>
  );
}

/** A comma-separated string list edited as one text input — used for
 *  stakeholders and assumptions, where the stored shape is `string[]` but a
 *  dedicated add/remove row per string is more chrome than the content is
 *  worth. */
function StringListField({ value, onChange, placeholder }) {
  const [text, setText] = useState(csv(value));
  useEffect(() => { setText(csv(value)); }, [value]);
  return (
    <input
      style={inp} value={text} placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(fromCsv(text))}
    />
  );
}

const KIND_OPTIONS = ["trigger", "step", "ai", "hitl", "gate", "artifact", "system"];
const ACTOR_OPTIONS = ["system", "ai", "human_client", "human_lexops"];
const CONFIDENCE_OPTIONS = ["committed", "scoped", "exploratory"];
const SIZE_OPTIONS = ["", "small", "medium", "large"];
const NEED_TYPES = ["text", "longtext", "confirm", "choice", "file", "contact"];
const EDGE_KINDS = ["triggers", "data", "depends"];
const LANE_KINDS = ["discovery", "build", "uat", "golive"];
const KIND_TONE = { trigger: "#6FA8CE", step: "#6FA8CE", ai: "#6FA8CE", hitl: "#F0A93C", gate: "#F0A93C", artifact: "#4FBF87", system: "#9DB5C9" };

// ---------------------------------------------------------------------------
// Display labels for stored values.
// ---------------------------------------------------------------------------
// Every `<option>` on this page used to render the stored slug as both its
// value and its label, so the data model was showing through: `hitl`,
// `human_lexops`, `feedback_shared`, `golive`. The values themselves can't
// change — `KIND_TONE[n.kind]`, `colourFor()` and `radiusFor()` all switch on
// them — so the fix is a label beside the value, never instead of it.
//
// An explicit map rather than a capitalise-and-de-underscore helper, because
// the generic transform is wrong on exactly the terms that need it most:
// `Hitl`, `Ai`, `Uat`, `Longtext`, `Golive`. The fallback is there for values
// that arrive from data (a deliverable id, say), not for this list.
const LABELS = {
  // node kind
  trigger: "Trigger", step: "Step", ai: "AI", hitl: "Human in the loop",
  gate: "Gate", artifact: "Artifact", system: "System",
  // actor
  human_client: "Client", human_lexops: "Lex Ops",
  // confidence
  committed: "Committed", scoped: "Scoped", exploratory: "Exploratory",
  // node size — stored as small/medium/large, read as impact. The stored
  // values can't change (SIZE_SCALE in language.js switches on them); the
  // words an author sees can.
  small: "Low", medium: "Medium", large: "High",
  // need type
  text: "Short text", longtext: "Long text", confirm: "Confirmation",
  choice: "Choice", file: "File upload", contact: "Contact",
  // edge kind
  triggers: "Triggers", data: "Passes data", depends: "Depends on",
  // roadmap lane kind
  discovery: "Discovery", build: "Build", uat: "UAT", golive: "Go live",
  // costing row kind
  line: "Line item", discount: "Discount",
  // proposal state
  draft: "Draft", sent: "Sent", feedback_shared: "Feedback shared",
  revised: "Revised", approved: "Approved by client", won: "Won", lost: "Lost",
};

function labelFor(v) {
  if (v == null || v === "") return "";
  return LABELS[v] || String(v).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** The option rows for a select — one place, so a new list can't reintroduce
 *  raw slugs by being written out longhand. */
function options(values) {
  return values.map((v) => <option key={v} value={v}>{labelFor(v)}</option>);
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------
export default function LivingProposalEditorPage({ navigate, editId = null, onLogout }) {
  const [proposalId, setProposalId] = useState(editId);
  // Derived from state, not from the `editId` prop directly. This page opens
  // in its own window with no id and mints one on first Save via
  // `setProposalId` — if `isNew` stayed pinned to the prop, a reload of that
  // same window after saving would still think there was no proposal yet and
  // POST a second, duplicate one on the next Save.
  const isNew = !proposalId;
  const [loading, setLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState(null);
  const slowLoad = useSlowHint(loading);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [link, setLink] = useState(null); // { url, first_opened_at } once known
  const [session, setSession] = useState(null); // inputs, notes, events, progress
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendModal, setSendModal] = useState(null); // { email, name, note, sending }
  // Deliberately not folded into `meta`: `meta` is exactly what the PATCH
  // writes back, and pdf_url is attached by the upload script, not this form.
  const [pdfUrl, setPdfUrl] = useState(null);

  const [meta, setMeta] = useState({ name: "", client_name: "", client_contact_name: "", client_email: "", state: "draft" });
  const [g, setG] = useState({
    preset: "pipeline",
    headline: "",
    headline_metric: { unit: "", amount: "", basis: "" },
    deliverables: [],
    scenarios: [],
    nodes: [],
    edges: [],
    sections: {},
    explainersRaw: "[]",
  });

  const [openNodes, setOpenNodes] = useState(new Set());
  const [openDeliverables, setOpenDeliverables] = useState(new Set());
  const [openLanes, setOpenLanes] = useState(new Set());
  const [openOptions, setOpenOptions] = useState(new Set());

  useEffect(() => {
    document.title = isNew ? "LexOps | New Proposal" : "LexOps | Edit Proposal";
    if (!isNew) load(editId);
  }, [editId]);

  async function load(id) {
    setLoading(true); setLoadError(null);
    try {
      const res = await fetchWithTimeout(`/api/lp/admin/proposals/${id}`, { headers: await authHeaders() });
      if (!res.ok) { setLoadError("We couldn't load this proposal."); return; }
      const data = await res.json();
      setMeta({
        name: data.proposal.name || "",
        client_name: data.proposal.client_name || "",
        client_contact_name: data.proposal.client_contact_name || "",
        client_email: data.proposal.client_email || "",
        state: data.proposal.state || "draft",
      });
      setPdfUrl(data.proposal.pdf_url || null);
      const graph = data.graph || {};
      setG({
        preset: graph.preset || "pipeline",
        headline: graph.headline || "",
        headline_metric: graph.headline_metric || { unit: "", amount: "", basis: "" },
        deliverables: graph.deliverables || [],
        scenarios: graph.scenarios || [],
        nodes: graph.nodes || [],
        edges: graph.edges || [],
        sections: graph.sections || {},
        explainersRaw: JSON.stringify(graph.explainers || [], null, 1),
      });
      // The session carries the link *and* everything the client did. It was
      // being fetched and thrown away except for the token — 767 recorded
      // events and no way to read one. Kept whole now; the Responses section
      // renders it.
      const sres = await fetchWithTimeout(`/api/lp/admin/proposals/${id}/session`, { headers: await authHeaders() });
      if (sres.ok) {
        const sdata = await sres.json();
        setSession(sdata);
        const primary = (sdata.recipients || []).find((r) => !r.invited_by);
        if (primary) setLink({ url: `${window.location.origin}/p/${primary.token}`, first_opened_at: primary.first_opened_at });
      }
    } catch (err) {
      console.error("[LivingProposalEditorPage] load failed:", err?.message || err);
      setLoadError("We couldn't load this proposal. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ---- derived, read-only -------------------------------------------------
  const nodeIds = useMemo(() => g.nodes.map((n) => n.id).filter(Boolean), [g.nodes]);
  const nodeIdSet = useMemo(() => new Set(nodeIds), [nodeIds]);
  const deliverableIds = useMemo(() => g.deliverables.map((d) => d.id).filter(Boolean), [g.deliverables]);
  const usedClusters = useMemo(() => [...new Set(g.nodes.map((n) => n.cluster).filter(Boolean))], [g.nodes]);

  const problems = useMemo(() => {
    const issues = [];
    if (!meta.name.trim()) issues.push("Proposal name is required.");
    const seen = new Set();
    for (const n of g.nodes) {
      if (!n.id) { issues.push("Every node needs an id."); continue; }
      if (seen.has(n.id)) issues.push(`Two nodes share the id “${n.id}” — ids must be unique.`);
      seen.add(n.id);
    }
    for (const e of g.edges) {
      if (e.from && !nodeIdSet.has(e.from)) issues.push(`An edge points from “${e.from}”, which isn't a node id.`);
      if (e.to && !nodeIdSet.has(e.to)) issues.push(`An edge points to “${e.to}”, which isn't a node id.`);
    }
    for (const n of g.nodes) {
      if (n.deliverable && !deliverableIds.includes(n.deliverable)) {
        issues.push(`“${n.label || n.id}” is assigned to deliverable “${n.deliverable}”, which doesn't exist.`);
      }
    }
    try { const parsed = JSON.parse(g.explainersRaw || "[]"); if (!Array.isArray(parsed)) throw new Error(); }
    catch { issues.push("The explainers JSON isn't valid — it must be an array (or left as [])."); }

    // The quoted total is authored, never computed — Act IV animates towards a
    // number a person typed and must never invent one (ProposalActs.jsx:19),
    // because a discount or a rounded figure is a real decision the code can't
    // make. That's also why a typo in either field survives all the way to the
    // client, who sees the rows and the total side by side. Flagged, not
    // blocked: a deliberate gap is legitimate, an unnoticed one isn't.
    const costing = g.sections.costing;
    if (costing?.rows?.length && costing.total?.amount != null) {
      const sum = costing.rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
      const quoted = Number(costing.total.amount) || 0;
      if (Math.round((sum - quoted) * 100) !== 0) {
        const cur = costing.currency || "";
        const fmt = (v) => `${cur ? cur + " " : ""}${v.toLocaleString()}`;
        issues.push(
          `Act IV's rows add up to ${fmt(sum)} but the quoted total says ${fmt(quoted)}. ` +
          `The client sees both. If the ${fmt(Math.abs(sum - quoted))} gap is a discount, add it as its own row so it reads as one.`
        );
      }
    }
    // The roadmap's lanes are the only thing Act III draws now — it no longer
    // borrows the deliverables' week metrics, so a timeline is either authored
    // here or absent, never inferred from a field that meant something else.
    // That makes an empty lane list worth saying out loud: it's the difference
    // between the client seeing dates and seeing nothing.
    const roadmap = g.sections.roadmap;
    if (roadmap && !roadmap.lanes?.length) {
      issues.push("Act III has a roadmap but no lanes, so the client sees an empty timeline. Add a lane per phase, each with a start and end week.");
    }
    // A lane running past the roadmap's own week count still renders — the axis
    // stretches to fit — but the two disagreeing means one of them is a typo.
    if (roadmap?.lanes?.length) {
      const end = Math.max(...roadmap.lanes.map((l) => Number(l.end_week) || 0));
      const span = Number(roadmap.weeks) || 0;
      if (span && end > span) {
        issues.push(`Act III's roadmap is set to ${span} week${span === 1 ? "" : "s"} but a lane runs to week ${end}, so the axis will stretch to ${end}.`);
      }
    }
    return issues;
  }, [meta.name, g.nodes, g.edges, g.deliverables, g.explainersRaw, g.sections, nodeIdSet, deliverableIds]);

  // ---- advisories ----------------------------------------------------------
  // Not errors: every one of these saves and renders. They are the things that
  // silently subtract from what the client receives — an act that draws its
  // empty state, a description that never reaches a beat. `problems` above
  // stops a bad save; this tells you what a clean save will actually produce.
  const notices = useMemo(() => {
    const out = [];
    const longFirst = g.nodes.filter((n) => { const o = firstSentence(n.description || ""); return o && o.length > LINE_BUDGET; }).length;
    const noDesc = g.nodes.filter((n) => !firstSentence(n.description || "")).length;
    const noAssumption = g.nodes.filter((n) => !(n.assumptions || []).filter(Boolean).length).length;
    const unassigned = g.nodes.filter((n) => !n.deliverable).length;
    const needCount = g.nodes.reduce((sum, n) => sum + (n.needs || []).length, 0);

    if (longFirst) out.push(`${longFirst} node${longFirst === 1 ? "'s" : "s'"} first sentence is over ${LINE_BUDGET} characters — those beats fall back to “label — action”.`);
    if (noDesc) out.push(`${noDesc} node${noDesc === 1 ? " has" : "s have"} no description.`);
    if (noAssumption) out.push(`${noAssumption} node${noAssumption === 1 ? " carries" : "s carry"} no assumption.`);
    if (unassigned) out.push(`${unassigned} node${unassigned === 1 ? " is" : "s are"} not assigned to a deliverable, so ${unassigned === 1 ? "it doesn't" : "they don't"} appear on the rail.`);
    if (g.nodes.length && !needCount) out.push("No node asks for anything, so Act VI collects nothing and the client has nothing to send back.");
    if (!g.sections.roadmap) out.push("No roadmap — Act III draws its empty state.");
    if (!g.sections.costing) out.push("No costing — Act IV says nothing about price.");
    if (!g.sections.maintenance) out.push("No maintenance options — Act V is absent.");
    return out;
  }, [g.nodes, g.sections]);

  // ---- the section rail ---------------------------------------------------
  // Order here is the order the client reads the document, and the DOM below
  // is in the same order — the rail is a table of contents, so the two drifting
  // apart would make every jump land somewhere unexpected.
  const navSections = useMemo(() => {
    let explainerCount = 0;
    try { const p = JSON.parse(g.explainersRaw || "[]"); if (Array.isArray(p)) explainerCount = p.length; } catch { /* invalid JSON already reported in `problems` */ }
    return [
      // Above the acts, not inside them. The acts are the document the client
      // reads; this is what came back from them, and it's the reason the admin
      // reopened the editor at all — so it leads, and it carries the unread
      // count rather than a bare item count.
      ...(session ? [{ id: "sec-client", act: null, label: "From the client", count: (session.notes || []).length || undefined }] : []),
      { id: "sec-proposal", act: null, label: "Proposal & client" },
      { id: "sec-headline", act: "0", label: "Headline" },
      { id: "sec-deliverables", act: "II", label: "Deliverables", count: g.deliverables.length },
      { id: "sec-scenarios", act: "II", label: "Scenarios", count: g.scenarios.length },
      { id: "sec-nodes", act: "II", label: "Nodes", count: g.nodes.length },
      { id: "sec-canvas", act: "II", label: "Map" },
      { id: "sec-edges", act: "II", label: "Edges", count: g.edges.length },
      { id: "sec-explainers", act: "II", label: "Explainers", count: explainerCount },
      { id: "sec-roadmap", act: "III", label: "Roadmap", count: g.sections.roadmap?.lanes?.length ?? 0 },
      { id: "sec-costing", act: "IV", label: "Investment", count: g.sections.costing?.rows?.length ?? 0 },
      { id: "sec-maintenance", act: "V", label: "Keeping it running", count: g.sections.maintenance?.options?.length ?? 0 },
    ];
  }, [g.deliverables, g.scenarios, g.nodes, g.edges, g.explainersRaw, g.sections, session]);

  const [activeSection, setActiveSection] = useState("sec-proposal");
  // The rail needs the 880px column plus its own 208 and the gaps; below that
  // it would squeeze the form, so it drops out entirely rather than shrinking.
  // The jump rail needs ~280px of its own before the form drops below a usable
  // width. Read live, not once: this was initialised at mount and never updated,
  // so a window resized down from 1200px kept the rail and squeezed the form to
  // a column too narrow to type in — and a tablet rotated to portrait did the
  // same. `orientationchange` is listened for separately because iOS Safari
  // does not reliably fire `resize` on rotation.
  const [showNav, setShowNav] = useState(() => window.innerWidth >= 1160);
  useEffect(() => {
    const read = () => setShowNav(window.innerWidth >= 1160);
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);
  useEffect(() => {
    const onResize = () => setShowNav(window.innerWidth >= 1160);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    // A scroll handler rather than an IntersectionObserver, deliberately: the
    // observers in ProposalActs needed an explicit root to fire at all, and
    // reading offsets directly has no such failure mode.
    function onScroll() {
      const y = window.scrollY + 90;
      let current = navSections[0].id;
      for (const s of navSections) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= y) current = s.id;
      }
      setActiveSection(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [navSections]);

  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.offsetTop - 68;
    // Request the glide, then land it outright — same guarantee as
    // scrollContainerTo on the client page. A smooth scroll needs a compositor,
    // and it fails silently in a tab that isn't painting.
    window.scrollTo({ top, behavior: "smooth" });
    setActiveSection(id);
    setTimeout(() => { if (Math.abs(window.scrollY - top) > 4) window.scrollTo(0, top); }, 600);
  }

  // ---- setters --------------------------------------------------------------
  const set = (patch) => setG((prev) => ({ ...prev, ...patch }));
  const setMetric = (key, val) => set({ headline_metric: { ...g.headline_metric, [key]: val } });
  const toggle = (setState, id) => setState((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ---- send it to the client ----------------------------------------------
  // Save first, then send. Not optional: the reason an admin is on this page
  // about to send is that they just changed something, and a link that opens
  // the pre-edit version is worse than no link at all.
  async function confirmSend() {
    if (!sendModal) return;
    if (!sendModal.email.trim()) { setSaveMsg({ ok: false, text: "An email address is required." }); return; }
    setSendModal((m) => ({ ...m, sending: true }));
    try {
      const savedId = await save({ silent: true });
      if (!savedId) { setSendModal((m) => ({ ...m, sending: false })); return; }

      const res = await fetchWithTimeout(`/api/lp/admin/proposals/${savedId}/recipients`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          email: sendModal.email.trim(),
          name: sendModal.name.trim() || null,
          note: sendModal.note.trim() || undefined,
          send: true,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg({ ok: false, text: d.message || "Couldn't send the link." });
        setSendModal((m) => ({ ...m, sending: false }));
        return;
      }
      setLink({ url: d.url });
      setSendModal(null);
      // A 200 means the link exists and the proposal moved to sent — it does
      // not mean the email left. Saying "Sent" either way is how a client ends
      // up never hearing from us while this page insists they did.
      setSaveMsg(d.emailed === false
        ? { ok: false, text: "Saved and marked sent, but the email did not go out — copy the link and send it manually." }
        : { ok: true, text: `Saved and sent to ${sendModal.email.trim()}${d.cc ? `, cc ${d.cc}` : ""}.` });
      load(savedId);
    } catch (err) {
      console.error("[LivingProposalEditorPage] send failed:", err?.message || err);
      setSaveMsg({ ok: false, text: "Couldn't send — check your connection." });
      setSendModal((m) => (m ? { ...m, sending: false } : m));
    }
  }

  // ---- the proposal PDF ---------------------------------------------------
  async function uploadPdf(file) {
    if (!file) return;
    if (!proposalId) { setSaveMsg({ ok: false, text: "Save this proposal before attaching a PDF." }); return; }
    setPdfBusy(true); setSaveMsg(null);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("file", file);
      // No Content-Type header on purpose — the browser has to set it so the
      // multipart boundary is included, and supplying it by hand breaks multer.
      const res = await fetch(`/api/lp/admin/proposals/${proposalId}/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s?.access_token}` },
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveMsg({ ok: false, text: d.message || "Couldn't attach the PDF." }); return; }
      setPdfUrl(d.pdf_url);
      setSaveMsg({ ok: true, text: "PDF attached — the client's Download button now serves it." });
    } catch (err) {
      console.error("[LivingProposalEditorPage] pdf upload:", err?.message || err);
      setSaveMsg({ ok: false, text: "Couldn't attach the PDF — check your connection." });
    } finally {
      setPdfBusy(false);
    }
  }

  async function removePdf() {
    if (!proposalId) return;
    setPdfBusy(true);
    try {
      const res = await fetchWithTimeout(`/api/lp/admin/proposals/${proposalId}/pdf`, {
        method: "DELETE", headers: await authHeaders(),
      });
      if (!res.ok) { setSaveMsg({ ok: false, text: "Couldn't remove the PDF." }); return; }
      setPdfUrl(null);
      setSaveMsg({ ok: true, text: "PDF removed — the client sees the fallback again." });
    } finally {
      setPdfBusy(false);
    }
  }

  // ---- canvas -------------------------------------------------------------
  function moveNode(id, xy) {
    set({ nodes: g.nodes.map((n) => (n.id === id ? { ...n, editor_xy: xy } : n)) });
  }
  function autoArrange() {
    const { ids, layer } = analyseGraph(g.nodes, g.edges);
    const rows = new Map();
    const next = new Map();
    for (const id of ids) {
      const l = layer.get(id);
      const r = rows.get(l) || 0;
      rows.set(l, r + 1);
      next.set(id, { x: 70 + l * 135, y: 54 + r * 62 });
    }
    set({ nodes: g.nodes.map((n) => (next.has(n.id) ? { ...n, editor_xy: next.get(n.id) } : n)) });
  }

  function addNode() {
    const base = slugify("new-step");
    const taken = new Set(nodeIds);
    const id = uniqueSlug(base, taken);
    const node = {
      id, kind: "step", actor: "system", cluster: "", deliverable: g.deliverables[0]?.id || null,
      scenarios: [], label: "New step", stakeholder: [], action: "", description: "",
      confidence: "committed", size: "", needs: [], gives: [], assumptions: [],
    };
    set({ nodes: [...g.nodes, node] });
    setOpenNodes((prev) => new Set([...prev, id]));
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Satoshi', sans-serif", color: t.text }}>
      <style>{`
        @font-face { font-family: 'Satoshi'; src: url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'); }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* The editor's gutter ramp, on the site's breakpoints. Media queries
           rather than JS so it can't fall out of step with showNav's listener. */
        .lp-ed-wrap { padding: 32px 48px 120px; }
        @media (max-width: 1023px) { .lp-ed-wrap { padding: 28px 32px 100px; } }
        @media (max-width: 767px)  { .lp-ed-wrap { padding: 24px 20px 90px; } }
        @media (max-width: 639px)  {
          .lp-ed-wrap { padding: 20px 16px 80px; }
          /* Long client emails and node ids are the strings most likely to blow
             out a 320px column, and neither is under our control. */
          .lp-ed-wrap { overflow-wrap: anywhere; }
        }
      `}</style>

      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`, padding: "0 20px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30,
      }}>
        <button onClick={() => (isNew ? window.close() : navigate("/admin/living-proposals"))} style={{ ...ghostBtn, background: "transparent" }}>
          ← {isNew ? "Close" : "Back to list"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saveMsg && (
            <span style={{ fontSize: 12.5, color: saveMsg.ok ? t.green : t.red }}>{saveMsg.text}</span>
          )}
          {/* The document the client can download, reachable from the page that
              authors its map — so the two can be read against each other, and
              replaceable here because revising a proposal usually means a new
              PDF as well as a new map. */}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, textDecoration: "none" }} title="Download the proposal the client sees">
              <Download size={13} /> PDF
            </a>
          )}
          <label
            style={{ ...ghostBtn, cursor: pdfBusy || isNew ? "default" : "pointer", opacity: pdfBusy || isNew ? 0.5 : 1 }}
            title={isNew ? "Save this proposal first" : (pdfUrl ? "Replace the attached PDF" : "Attach the PDF the client downloads")}
          >
            <Upload size={13} />
            {pdfBusy ? "Uploading…" : pdfUrl ? "Replace" : "Attach PDF"}
            <input
              type="file" accept="application/pdf,.pdf" hidden disabled={pdfBusy || isNew}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; uploadPdf(f); }}
            />
          </label>
          {pdfUrl && (
            <button onClick={removePdf} disabled={pdfBusy} style={{ ...ghostBtn, background: "transparent", color: t.red }} title="Detach the PDF">
              <Trash2 size={13} />
            </button>
          )}
          {link && (
            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, textDecoration: "none" }}>
              <ExternalLink size={13} /> Open link
            </a>
          )}
          <button onClick={() => save({ andPreview: true })} disabled={saving} style={ghostBtn}>
            {saving ? "Saving…" : "Save & preview"}
          </button>
          <button onClick={() => save({})} disabled={saving} style={{ ...btnBase, background: t.accent, color: "#fff", padding: "8px 18px" }}>
            {saving ? "Saving…" : "Save"}
          </button>
          {/* Sending lived only on the list page, which broke the loop this
              editor exists to serve: read the feedback, revise, attach the new
              PDF — then go back to another screen to actually send it. It saves
              first, always, so the client can never open a link to the version
              before the edits that prompted the send. */}
          <button
            onClick={() => setSendModal({
              email: meta.client_email || "",
              name: meta.client_contact_name || meta.client_name || "",
              note: "",
              sending: false,
            })}
            disabled={saving || isNew || !g.nodes.length}
            style={{ ...btnBase, background: t.green, color: "#fff", padding: "8px 16px", opacity: (isNew || !g.nodes.length) ? 0.5 : 1 }}
            title={isNew ? "Save this proposal first" : !g.nodes.length ? "Add at least one node before sending" : (link ? "Save, then re-send the same link" : "Save, then send the link to the client")}
          >
            <Send size={13} /> {link ? "Re-send" : "Send"}
          </button>
        </div>
      </nav>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "100px 0" }}>
          <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          {slowLoad && <span style={{ color: t.textMeta, fontSize: 12 }}>Still loading — this is taking longer than usual.</span>}
        </div>
      ) : loadError ? (
        <div style={{ maxWidth: 600, margin: "60px auto", padding: 24, background: t.redSoft, border: `1px solid rgba(201,84,46,0.2)`, borderRadius: 10, color: t.red, fontSize: 13.5 }}>
          {loadError} <button onClick={() => load(editId)} style={{ ...ghostBtn, background: "none", color: t.red, textDecoration: "underline" }}>Retry</button>
        </div>
      ) : (
        <div className="lp-ed-wrap" style={{ maxWidth: showNav ? 1140 : 880, margin: "0 auto", display: "flex", gap: 28, alignItems: "flex-start" }}>

          {showNav && <EditorNav sections={navSections} activeId={activeSection} onJump={jumpTo} />}

          <div style={{ flex: 1, minWidth: 0, maxWidth: 880, display: "flex", flexDirection: "column", gap: 28 }}>

          {problems.length > 0 && (
            <div style={{ padding: "12px 16px", background: t.amberSoft, border: "1px solid rgba(240,169,60,0.35)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: problems.length ? 6 : 0 }}>
                <AlertTriangle size={14} color={t.amber} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.amber }}>Before this saves cleanly</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: t.text, lineHeight: 1.6 }}>
                {problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {notices.length > 0 && (
            <details style={{ padding: "10px 14px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
              <summary style={{ fontSize: 12.5, fontWeight: 600, color: t.textSub, cursor: "pointer" }}>
                {notices.length} thing{notices.length === 1 ? "" : "s"} the client won't see
              </summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 12.5, color: t.textSub, lineHeight: 1.6 }}>
                {notices.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </details>
          )}

          {/* ---- From the client --------------------------------------------- */}
          {/* Mounted first, above Act 0. `ClientResponses` existed and the
              session data was already being fetched, but nothing ever rendered
              it — so a client could send back a message and the admin had no
              screen that showed it. Only rendered once `session` has loaded;
              for a brand-new proposal there is no client and no link yet. */}
          {session && (
            <SectionBlock id="sec-client" title="From the client" eyebrow="What came back — answers, messages, activity">
              <ClientResponses session={session} nodes={g.nodes} />
            </SectionBlock>
          )}

          {/* ---- Proposal & client ------------------------------------------ */}
          <SectionBlock id="sec-proposal" title="Proposal" eyebrow="Who this is for — not an act the client reads">
            <div style={grid2}>
              <Field><label style={label}>Proposal name</label><input style={inp} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="Firm — Phase 1" /></Field>
              <Field><label style={label}>Firm / client name</label><input style={inp} value={meta.client_name} onChange={(e) => setMeta({ ...meta, client_name: e.target.value })} /></Field>
              <Field><label style={label}>Contact name</label><input style={inp} value={meta.client_contact_name} onChange={(e) => setMeta({ ...meta, client_contact_name: e.target.value })} /></Field>
              <Field><label style={label}>Contact email</label><input style={inp} type="email" value={meta.client_email} onChange={(e) => setMeta({ ...meta, client_email: e.target.value })} /></Field>
              <Field>
                <label style={label}>State</label>
                <select style={inp} value={meta.state} onChange={(e) => setMeta({ ...meta, state: e.target.value })}>
                  {/* `approved` is the client's own signal and is normally set
                      by them, not here — but it has to be listed, or an admin
                      opening an approved proposal sees an empty select and any
                      save silently rewrites the state to whatever they pick.
                      Won/lost stay the admin's to set: approved is "they're
                      happy", won is the commercial record. */}
                  {options(["draft", "sent", "feedback_shared", "revised", "approved", "won", "lost"])}
                </select>
              </Field>
              <Field>
                <label style={label}>Preset</label>
                <select style={inp} value={g.preset} onChange={(e) => set({ preset: e.target.value })}>
                  <option value="pipeline">Pipeline — a matter travels through this</option>
                  <option value="topology">Topology — these systems, these connections</option>
                  <option value="program">Program — who does what, when</option>
                </select>
              </Field>
            </div>
          </SectionBlock>

          {/* ---- Headline ----------------------------------------------------- */}
          <SectionBlock id="sec-headline" act="0" title="Headline" eyebrow="The promise — one number, one sentence">
            {/* Said plainly, because it is genuinely surprising: the map's
                identity card deliberately shows only the client name, the
                proposal name and the counts read off the graph. The headline
                sentence and the raw metric were taken off it on purpose — see
                the comment at LivingProposalPage.jsx:875. Leaving that
                unstated here would have an author write a headline, look at
                the map, and reasonably conclude the field was broken. */}
            <p style={{ margin: "0 0 12px", padding: "9px 12px", background: t.surface, borderRadius: 8, fontSize: 12.5, color: t.textSub, lineHeight: 1.5 }}>
              These appear in the <strong>list reading</strong> — the phone fallback and the “Read as a list”
              toggle. The map's card deliberately carries only the name and the counts, so the headline
              will not show there.
            </p>
            <div style={grid2}>
              <Field wide><label style={label}>Headline sentence</label><input style={inp} value={g.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. 31 hours a month back on estate matters" /></Field>
              <Field><label style={label}>Metric amount</label><input style={inp} type="number" value={g.headline_metric.amount ?? ""} onChange={(e) => setMetric("amount", e.target.value)} /></Field>
              <Field><label style={label}>Metric unit</label><input style={inp} value={g.headline_metric.unit || ""} onChange={(e) => setMetric("unit", e.target.value)} placeholder="min_per_task, hours_per_month…" /></Field>
              <Field wide><label style={label}>Basis</label><input style={inp} value={g.headline_metric.basis || ""} onChange={(e) => setMetric("basis", e.target.value)} placeholder="What the number is measuring, in one clause" /></Field>
            </div>
          </SectionBlock>

          {/* ---- Deliverables --------------------------------------------------- */}
          <SectionBlock id="sec-deliverables" act="II" title="Deliverables" eyebrow="The rail — disjoint pieces of work; every node belongs to exactly one">
            {/* `newItem` starts with no unit. It used to default to "weeks",
                which — back when Act III borrowed these metrics for its
                timeline — made every new deliverable a duration by default and
                put a second, unlabelled timeline input on this form. Durations
                belong to the roadmap section now, and only there. */}
            <RepeatList
              items={g.deliverables} reorder
              onChange={(deliverables) => set({ deliverables })}
              newItem={() => ({ id: uniqueSlug("outcome", new Set(deliverableIds)), label: "New outcome", summary: "", metric: { unit: "", amount: "", basis: "" } })}
              addLabel="Add deliverable"
              renderItem={(d, i, upd) => (
                <Card
                  title={d.label || d.id} sub={d.id} tone="#6FA8CE"
                  open={openDeliverables.has(d.id || i)} onToggle={() => toggle(setOpenDeliverables, d.id || i)}
                  onDelete={() => set({ deliverables: g.deliverables.filter((_, j) => j !== i) })}
                >
                  <div style={grid2}>
                    <Field><label style={label}>Label</label><input style={inp} value={d.label} onChange={(e) => upd({ label: e.target.value, id: d.id || slugify(e.target.value) })} /></Field>
                    <Field wide><label style={label}>Summary</label><textarea style={{ ...inp, resize: "vertical" }} rows={2} value={d.summary || ""} onChange={(e) => upd({ summary: e.target.value })} /></Field>
                    <Field><label style={label}>Metric amount</label><input style={inp} type="number" value={d.metric?.amount ?? ""} onChange={(e) => upd({ metric: { ...(d.metric || {}), amount: e.target.value } })} /></Field>
                    {/* Placeholders name outcomes, not durations. They read
                        "weeks" and "8-week build" until this section stopped
                        feeding Act III — which is how a duration came to be
                        typed here in the first place. Set the timeline under
                        Roadmap. */}
                    <Field><label style={label}>Metric unit</label><input style={inp} value={d.metric?.unit || ""} onChange={(e) => upd({ metric: { ...(d.metric || {}), unit: e.target.value } })} placeholder="hrs_month, min_per_task…" /></Field>
                    <Field wide><label style={label}>Basis</label><input style={inp} value={d.metric?.basis || ""} onChange={(e) => upd({ metric: { ...(d.metric || {}), basis: e.target.value } })} placeholder="What the number measures — not how long it takes" /></Field>
                  </div>
                </Card>
              )}
            />
          </SectionBlock>

          {/* ---- Scenarios --------------------------------------------------- */}
          <SectionBlock id="sec-scenarios" act="II" title="Scenarios" eyebrow="Optional — case-type chips that dim the rest of the map">
            <RepeatList
              items={g.scenarios} reorder
              onChange={(scenarios) => set({ scenarios })}
              newItem={() => ({ id: uniqueSlug("scenario", new Set(g.scenarios.map((s) => s.id))), label: "New scenario" })}
              addLabel="Add scenario"
              renderItem={(sc, i, upd) => (
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={inp} value={sc.label} onChange={(e) => upd({ label: e.target.value })} placeholder="Label shown on the chip" />
                </div>
              )}
            />
          </SectionBlock>

          {/* ---- Nodes ----------------------------------------------------------- */}
          <SectionBlock id="sec-nodes" act="II" title={`Nodes (${g.nodes.length})`} eyebrow="The map — every bubble, in the four-question contract">
            <RepeatList
              items={g.nodes}
              onChange={(nodes) => set({ nodes })}
              /* No `newItem`: a node needs an id minted against the rest of the
                 array, so the Add control is the custom one below. RepeatList
                 renders no button of its own without a factory. */
              addLabel="Add node"
              empty="No nodes yet — the map will be empty until you add one."
              renderItem={(n, i, upd) => (
                <NodeCard
                  node={n} index={i} update={upd}
                  open={openNodes.has(n.id || i)} onToggle={() => toggle(setOpenNodes, n.id || i)}
                  onDelete={() => set({ nodes: g.nodes.filter((_, j) => j !== i) })}
                  deliverables={g.deliverables} scenarios={g.scenarios} usedClusters={usedClusters}
                  takenIds={new Set(nodeIds.filter((id) => id !== n.id))}
                />
              )}
            />
            {/* Custom add row — RepeatList's generic `newItem` doesn't know how
                to mint a unique id against the rest of the array, so the button
                here calls addNode() directly instead. */}
            <button onClick={addNode} style={{ ...addBtn, marginTop: g.nodes.length ? 0 : 8 }}><Plus size={13} strokeWidth={2.5} /> Add node</button>
          </SectionBlock>

          {/* ---- Edges ----------------------------------------------------------- */}
          {/* ---- The canvas ------------------------------------------------
              Its own section rather than a strip above the edge list, because
              drawing relationships is the work, not an illustration of it. */}
          <SectionBlock id="sec-canvas" act="II" title="Map" eyebrow="Draw the relationships — drag to move, drag the handle to connect">
            <GraphCanvas
              nodes={g.nodes}
              edges={g.edges}
              onMoveNode={moveNode}
              onArrange={autoArrange}
              onAddEdge={(from, to) => set({ edges: [...g.edges, { from, to, kind: "triggers" }] })}
              onRemoveEdge={(i) => set({ edges: g.edges.filter((_, j) => j !== i) })}
            />
            <p style={{ fontSize: 11.5, color: t.textMeta, margin: "8px 0 0", lineHeight: 1.5 }}>
              This arrangement is yours — it's saved with the proposal but the client's map lays
              itself out, so moving a node here never changes what they see. Connections do.
            </p>
          </SectionBlock>

          {/* ---- Edges ----------------------------------------------------------- */}
          <SectionBlock id="sec-edges" act="II" title={`Edges (${g.edges.length})`} eyebrow="The same connections as a list — the keyboard path">
            <RepeatList
              items={g.edges}
              onChange={(edges) => set({ edges })}
              newItem={() => ({ from: g.nodes[0]?.id || "", to: g.nodes[1]?.id || g.nodes[0]?.id || "", kind: "triggers" })}
              addLabel="Add edge"
              renderItem={(e, i, upd) => (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select style={{ ...inp, width: "auto", flex: "1 1 160px" }} value={e.from} onChange={(ev) => upd({ from: ev.target.value })}>
                    <option value="">— from —</option>
                    {g.nodes.map((n) => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
                  </select>
                  <span style={{ color: t.textMeta, fontSize: 12 }}>→</span>
                  <select style={{ ...inp, width: "auto", flex: "1 1 160px" }} value={e.to} onChange={(ev) => upd({ to: ev.target.value })}>
                    <option value="">— to —</option>
                    {g.nodes.map((n) => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
                  </select>
                  <select style={{ ...inp, width: "auto", flex: "1 1 110px" }} value={e.kind || "triggers"} onChange={(ev) => upd({ kind: ev.target.value })}>
                    {options(EDGE_KINDS)}
                  </select>
                  <input style={{ ...inp, width: 80, flex: "0 0 80px" }} type="number" placeholder="Volume" value={e.volume ?? ""} onChange={(ev) => upd({ volume: ev.target.value ? Number(ev.target.value) : undefined })} />
                </div>
              )}
            />
          </SectionBlock>

          {/* ---- Explainers (advanced) -------------------------------------------
              Sits with the rest of Act II rather than at the end of the page:
              the films are *about* the map, and the rail is only a truthful
              table of contents if the form runs in the client's reading order. */}
          <SectionBlock id="sec-explainers" act="II" title="Explainers" eyebrow="Advanced, optional — 2–3 concept films" collapsible defaultOpen={false}>
            <p style={{ fontSize: 12.5, color: t.textSub, margin: "0 0 10px", lineHeight: 1.5 }}>
              Leave this as <code>[]</code> and the client's page compiles short films automatically from
              each node's description — that's the floor, and it's usually enough. Hand-author here only
              for the 2–3 concepts that carry the actual argument (see <code>shared/explainerScript.ts</code>).
              Raw JSON, an array of <code>{"{ id, anchor, seconds, title, beats: [{ dur, line, sub, focus, select }] }"}</code>.
            </p>
            <textarea
              style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical", minHeight: 120 }}
              value={g.explainersRaw}
              onChange={(e) => set({ explainersRaw: e.target.value })}
              spellCheck={false}
            />
          </SectionBlock>

          {/* ---- Sections: Roadmap / Costing / Maintenance ------------------------ */}
          <RoadmapSection g={g} set={set} openLanes={openLanes} setOpenLanes={setOpenLanes} toggle={toggle} deliverableIds={deliverableIds} />
          <CostingSection g={g} set={set} deliverableIds={deliverableIds} />
          <MaintenanceSection g={g} set={set} openOptions={openOptions} setOpenOptions={setOpenOptions} toggle={toggle} />

          </div>
        </div>
      )}

      {/* Send — the other half of the loop. Same endpoint the list page uses,
          so one proposal still only ever has one tracked link. */}
      {sendModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(35,42,52,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
          onClick={() => !sendModal.sending && setSendModal(null)}
        >
          <div style={{ background: t.card, borderRadius: 16, width: "100%", maxWidth: 440, padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Send size={17} color={t.accent} />
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
                {link ? "Re-send to the client" : "Send to the client"}
              </h2>
            </div>
            <p style={{ fontSize: 12.5, color: t.textSub, margin: "6px 0 18px", lineHeight: 1.5 }}>
              This saves your changes first, then emails the link.{" "}
              {link
                ? "The token is reused, so nothing the client has already answered is lost — they'll open the revised version at the same address."
                : "This mints the one link this proposal will ever have, and marks it sent."}
            </p>

            {!pdfUrl && (
              <div style={{ padding: "9px 12px", background: t.amberSoft, border: "1px solid rgba(240,169,60,0.35)", borderRadius: 8, marginBottom: 14, fontSize: 12.5, color: t.text, lineHeight: 1.5 }}>
                No PDF is attached — the client's Download button will show its fallback. Attach one
                first if this round is meant to include the written proposal.
              </div>
            )}

            <label style={label}>Email</label>
            <input type="email" value={sendModal.email} onChange={(e) => setSendModal((m) => ({ ...m, email: e.target.value }))} style={inp} placeholder="client@example.com" />

            <label style={{ ...label, marginTop: 12 }}>Name</label>
            <input value={sendModal.name} onChange={(e) => setSendModal((m) => ({ ...m, name: e.target.value }))} style={inp} />

            <label style={{ ...label, marginTop: 12 }}>Note (optional)</label>
            <textarea rows={3} value={sendModal.note} onChange={(e) => setSendModal((m) => ({ ...m, note: e.target.value }))} style={{ ...inp, resize: "vertical" }} placeholder="Anything to say alongside the link" />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button onClick={() => setSendModal(null)} disabled={sendModal.sending} style={ghostBtn}>Cancel</button>
              <button onClick={confirmSend} disabled={sendModal.sending} style={{ ...btnBase, background: t.green, color: "#fff", padding: "9px 18px" }}>
                {sendModal.sending ? "Saving & sending…" : link ? "Save & re-send" : "Save & send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---- save ------------------------------------------------------------
  // Returns the proposal id on success, undefined on failure — `confirmSend`
  // saves first and must not send a link to a proposal that failed to store.
  // `silent` suppresses the "Saved." toast when the save is a step inside a
  // bigger action that will report its own outcome.
  async function save({ andPreview, silent } = {}) {
    if (!meta.name.trim()) { setSaveMsg({ ok: false, text: "Proposal name is required." }); return; }
    setSaving(true); setSaveMsg(null);
    try {
      let id = proposalId;

      if (!id) {
        const res = await fetchWithTimeout("/api/lp/admin/proposals", {
          method: "POST", headers: await authHeaders(),
          body: JSON.stringify({ name: meta.name, client_name: meta.client_name, client_contact_name: meta.client_contact_name, client_email: meta.client_email }),
        });
        const data = await res.json();
        if (!res.ok) { setSaveMsg({ ok: false, text: data.message || "Couldn't create the proposal." }); return; }
        id = data.proposal.id;
        setProposalId(id);
        // Reflect the new id in the URL without a reload, so a refresh (or a
        // second Save) edits this row rather than creating another.
        window.history.replaceState(null, "", `/admin/living-proposals/${id}/edit`);
      } else {
        const res = await fetchWithTimeout(`/api/lp/admin/proposals/${id}`, {
          method: "PATCH", headers: await authHeaders(),
          body: JSON.stringify({ name: meta.name, client_name: meta.client_name, client_contact_name: meta.client_contact_name, client_email: meta.client_email, state: meta.state }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveMsg({ ok: false, text: d.message || "Couldn't save proposal details." }); return; }
      }

      let explainers = [];
      try { explainers = JSON.parse(g.explainersRaw || "[]"); if (!Array.isArray(explainers)) explainers = []; } catch { /* validated above; fall back silently */ }

      const metricAmount = g.headline_metric.amount === "" || g.headline_metric.amount == null ? null : Number(g.headline_metric.amount);
      const headline_metric = (metricAmount != null || g.headline_metric.unit || g.headline_metric.basis)
        ? { unit: g.headline_metric.unit || null, amount: metricAmount, basis: g.headline_metric.basis || null }
        : null;

      const body = {
        preset: g.preset,
        headline: g.headline || null,
        headline_metric,
        deliverables: g.deliverables.map((d) => ({ ...d, metric: cleanMetric(d.metric) })),
        scenarios: g.scenarios,
        nodes: g.nodes.map(cleanNode),
        edges: g.edges.filter((e) => e.from && e.to),
        explainers,
        sections: cleanSections(g.sections),
      };

      const gres = await fetchWithTimeout(`/api/lp/admin/proposals/${id}/graph`, {
        method: "PUT", headers: await authHeaders(), body: JSON.stringify(body),
      });
      const gdata = await gres.json();
      if (!gres.ok) { setSaveMsg({ ok: false, text: gdata.message || "Couldn't save the map." }); return; }

      if (!silent) {
        setSaveMsg({ ok: true, text: "Saved." });
        setTimeout(() => setSaveMsg((m) => (m?.text === "Saved." ? null : m)), 2500);
      }

      if (andPreview) {
        const pres = await fetchWithTimeout(`/api/lp/admin/proposals/${id}/recipients`, {
          method: "POST", headers: await authHeaders(),
          body: JSON.stringify({ email: meta.client_email || `preview+${id}@lex-ops.io`, name: meta.client_contact_name || meta.client_name, send: false }),
        });
        const pdata = await pres.json();
        if (pres.ok) { setLink({ url: pdata.url }); window.open(pdata.url, "_blank", "noopener"); }
      }
      return id;
    } catch (err) {
      console.error("[LivingProposalEditorPage] save failed:", err?.message || err);
      setSaveMsg({ ok: false, text: "Couldn't save — check your connection." });
    } finally {
      setSaving(false);
    }
  }
}

// ---------------------------------------------------------------------------
// Save-time cleanup — strips UI-only placeholder state (empty-string numbers,
// blank optional objects) so the stored graph never carries `NaN` or a
// `metric: {}` that the renderer would have to guard against.
// ---------------------------------------------------------------------------
function cleanMetric(m) {
  if (!m) return null;
  const amount = m.amount === "" || m.amount == null ? null : Number(m.amount);
  if (amount == null && !m.unit && !m.basis) return null;
  return { unit: m.unit || null, amount, basis: m.basis || null };
}
function cleanNode(n) {
  return {
    ...n,
    stakeholder: n.stakeholder || [],
    scenarios: n.scenarios || [],
    size: n.size || undefined,
    needs: (n.needs || []).map((nd) => ({
      id: nd.id, type: nd.type || "text", required: nd.required !== false,
      prompt: nd.prompt || "",
      ...(nd.type === "confirm" ? { confirm_label: nd.confirm_label || undefined } : {}),
      ...(nd.type === "choice" ? { options: nd.optionsCsv ? fromCsv(nd.optionsCsv) : (nd.options || []) } : {}),
    })),
    gives: (n.gives || []).filter((gv) => gv.label),
    assumptions: (n.assumptions || []).filter(Boolean),
  };
}
function cleanSections(sections) {
  const out = {};
  if (sections.roadmap) {
    out.roadmap = {
      weeks: Number(sections.roadmap.weeks) || 0,
      note: sections.roadmap.note || null,
      caveat: sections.roadmap.caveat || null,
      lanes: (sections.roadmap.lanes || []).map((l) => ({
        id: l.id, label: l.label, deliverable: l.deliverable || null,
        start_week: Number(l.start_week) || 0, end_week: Number(l.end_week) || 0,
        kind: l.kind || "build",
      })),
    };
  }
  if (sections.costing) {
    out.costing = {
      currency: sections.costing.currency || "AUD",
      note: sections.costing.note || null,
      rows: (sections.costing.rows || []).map((r) => ({
        kind: r.kind || "line", deliverable: r.deliverable || null,
        amount: Number(r.amount) || 0, item: r.item || "", basis: r.basis || null,
      })),
      total: sections.costing.total ? {
        label: sections.costing.total.label || "Total investment",
        amount: Number(sections.costing.total.amount) || 0,
        was: sections.costing.total.was === "" || sections.costing.total.was == null ? undefined : Number(sections.costing.total.was),
      } : undefined,
      recurring: (sections.costing.recurring || []).map((r) => ({
        item: r.item || "", amount: Number(r.amount) || 0, per: r.per || "month", basis: r.basis || null,
      })),
    };
  }
  if (sections.maintenance) {
    out.maintenance = {
      currency: sections.maintenance.currency || "AUD",
      optional: sections.maintenance.optional !== false,
      note: sections.maintenance.note || null,
      covers: (sections.maintenance.covers || []).filter(Boolean),
      caveat: sections.maintenance.caveat || null,
      options: (sections.maintenance.options || []).map((o) => ({
        id: o.id, name: o.name || "", amount: Number(o.amount) || 0, per: o.per || "month",
        approx: !!o.approx, recommended: !!o.recommended,
        covers: (o.covers || []).filter(Boolean),
        footnote: o.footnote || null,
      })),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// The graph, as it currently stands.
// ---------------------------------------------------------------------------
// Edges are authored as from/to id pairs, which means the one thing an author
// cannot see is the thing they're actually building: whether the map is
// connected. Before this, the only way to find out was Save & preview into a
// separate tab, by which point a broken graph had already been written.
//
// Deliberately *not* d3-force, which is what the client canvas uses. A force
// layout answers "what will it look like"; layering by longest path answers
// "does the order make sense", which is the question being asked here. Node
// positions on the real map are a force output and are never authored, so a
// faithful preview would be misleading about what this form controls.
// ---------------------------------------------------------------------------
function analyseGraph(nodes, edges) {
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

// ---------------------------------------------------------------------------
// What the client actually did.
// ---------------------------------------------------------------------------
// `GET /admin/proposals/:id/session` has always returned all of this — answers,
// notes, the event stream, progress — and the editor fetched it only to pull
// the token out, so none of it was ever readable. This is the half of the loop
// that was missing: the admin reads what came back, revises, re-attaches the
// PDF and sends again.
//
// Newest first everywhere. The question an admin opens this with is "what
// changed since I last looked", not "what happened first".
// ---------------------------------------------------------------------------
function when(ts) {
  if (!ts) return "";
  const d = new Date(ts), diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const EVENT_LABEL = {
  proposal_opened: "Opened the proposal",
  node_opened: "Opened a step",
  need_answered: "Answered something",
  proposal_downloaded: "Downloaded the PDF",
  sent_back: "Sent it back",
  approved: "Approved the proposal",
  explainer_played: "Watched an explainer",
};

function ClientResponses({ session, nodes }) {
  const [tab, setTab] = useState("answers");
  const labelOf = useMemo(() => {
    const m = new Map((nodes || []).filter((n) => n.id).map((n) => [n.id, n.label || n.id]));
    return (id) => (id ? m.get(id) || id : "—");
  }, [nodes]);

  if (!session) {
    return <p style={{ fontSize: 12.5, color: t.textMeta, margin: 0 }}>Nothing yet — this fills in once the client opens their link.</p>;
  }

  const { inputs = [], notes = [], events = [], progress } = session;
  const answered = progress?.answered ?? inputs.length;
  const required = progress?.required ?? 0;
  const nothingYet = !inputs.length && !notes.length && !events.length;

  if (nothingYet) {
    return <p style={{ fontSize: 12.5, color: t.textMeta, margin: 0 }}>The client hasn't opened this link yet.</p>;
  }

  const tabs = [
    ["answers", `Answers (${inputs.length})`],
    ["notes", `Messages (${notes.length})`],
    ["activity", `Activity (${events.length})`],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5, color: t.textSub }}>
        <span><strong style={{ color: t.text }}>{answered}</strong> of {required} needs answered</span>
        {notes.length > 0 && <span style={{ color: t.amber }}>{notes.length} message{notes.length === 1 ? "" : "s"} to read</span>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            ...btnBase, padding: "6px 11px", fontSize: 12.5,
            background: tab === k ? t.accentLight : "transparent",
            color: tab === k ? t.accent : t.textSub,
            border: `1px solid ${tab === k ? "rgba(55,89,113,0.25)" : t.border}`,
          }}>{lbl}</button>
        ))}
      </div>

      {tab === "answers" && (
        inputs.length === 0
          ? <p style={{ fontSize: 12.5, color: t.textMeta, margin: 0 }}>No answers yet.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inputs.map((i) => (
                <div key={i.id} style={{ padding: "9px 12px", background: t.surface, borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, color: t.textMeta, marginBottom: 3 }}>
                    {labelOf(i.node_id)} · {i.need_id} · {when(i.answered_at)}
                  </div>
                  {i.file_url ? (
                    <a href={i.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13.5, color: t.accent }}>
                      {i.file_name || "Uploaded file"}
                    </a>
                  ) : (
                    <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{String(i.value ?? "")}</div>
                  )}
                </div>
              ))}
            </div>
      )}

      {tab === "notes" && (
        notes.length === 0
          ? <p style={{ fontSize: 12.5, color: t.textMeta, margin: 0 }}>No messages.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ padding: "10px 12px", background: t.amberSoft, border: "1px solid rgba(240,169,60,0.3)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, color: t.textMeta, marginBottom: 4 }}>
                    {n.author_email || "the client"}{n.node_id ? ` · on ${labelOf(n.node_id)}` : ""} · {when(n.created_at)}
                  </div>
                  <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{n.body}</div>
                </div>
              ))}
            </div>
      )}

      {tab === "activity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
          {events.slice(0, 120).map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "5px 2px", borderBottom: `1px solid ${t.borderLight}` }}>
              <span style={{ color: t.textMeta, flex: "0 0 62px" }}>{when(e.created_at)}</span>
              <span style={{ flex: 1 }}>{EVENT_LABEL[e.type] || e.type}</span>
              {e.node_id && <span style={{ color: t.textMeta }}>{labelOf(e.node_id)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The canvas — where relationships between nodes are actually drawn.
// ---------------------------------------------------------------------------
// Drag a node to move it; drag its handle onto another node to connect them;
// click a line to remove it. This is the surface the edge list was always a
// text rendering of — an edge is a claim about order, and order is a shape.
//
// **Positions are the admin's, not the client's.** They persist as `editor_xy`
// on each node, which survives the round trip for free: `nodes` is the one
// field `PUT /admin/proposals/:id/graph` stores verbatim, so this needed no
// column, no migration and no route change. The client's map still runs
// d3-force (layout.js) and ignores the key entirely — arranging the canvas
// changes what *you* see while authoring, never what the client receives.
// That was a deliberate choice: the force layout exists so a map can't be
// accidentally mis-drawn, and this canvas is a tool, not the artifact.
// ---------------------------------------------------------------------------
const VW = 1000, VH = 560;          // logical canvas; the SVG scales to fit
const NR = 11;                      // node radius
const HANDLE_DX = 19;               // the connect handle, right of the node

function GraphCanvas({ nodes, edges, onMoveNode, onAddEdge, onRemoveEdge, onArrange }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);   // { mode, id, x, y, over, dx, dy }
  const [hoverEdge, setHoverEdge] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);

  const { ids, layer, valid, islands, orphans } = useMemo(() => analyseGraph(nodes, edges), [nodes, edges]);
  const byId = useMemo(() => new Map(nodes.filter((n) => n.id).map((n) => [n.id, n])), [nodes]);

  // A node with no saved position falls back to its layered slot, so a graph
  // that has never been arranged still opens as something readable.
  const pos = useMemo(() => {
    const rows = new Map();
    const out = new Map();
    for (const id of ids) {
      const saved = byId.get(id)?.editor_xy;
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        out.set(id, { x: saved.x, y: saved.y });
        continue;
      }
      const l = layer.get(id);
      const r = rows.get(l) || 0;
      rows.set(l, r + 1);
      out.set(id, { x: 70 + l * 135, y: 54 + r * 62 });
    }
    return out;
  }, [ids, layer, byId]);

  function svgPoint(evt) {
    const r = svgRef.current.getBoundingClientRect();
    const scale = VW / r.width;                 // viewBox units per CSS pixel
    return { x: (evt.clientX - r.left) * scale, y: (evt.clientY - r.top) * scale };
  }
  function nodeAt(pt, exclude) {
    for (const id of ids) {
      if (id === exclude) continue;
      const p = pos.get(id);
      if ((p.x - pt.x) ** 2 + (p.y - pt.y) ** 2 <= (NR + 10) ** 2) return id;
    }
    return null;
  }
  const already = (from, to) => valid.some((e) => e.from === from && e.to === to);
  const canDrop = (from, to) => !!to && to !== from && !already(from, to);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function begin(mode, id, evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const pt = svgPoint(evt);
    const p = pos.get(id);
    setDrag({ mode, id, x: pt.x, y: pt.y, over: null, dx: pt.x - p.x, dy: pt.y - p.y });
    svgRef.current.setPointerCapture(evt.pointerId);
  }
  function move(evt) {
    if (!drag) return;
    const pt = svgPoint(evt);
    if (drag.mode === "move") {
      onMoveNode(drag.id, {
        x: Math.round(clamp(pt.x - drag.dx, NR + 2, VW - NR - 2)),
        y: Math.round(clamp(pt.y - drag.dy, NR + 2, VH - NR - 2)),
      });
      setDrag((d) => (d ? { ...d, x: pt.x, y: pt.y } : d));
    } else {
      setDrag((d) => (d ? { ...d, x: pt.x, y: pt.y, over: nodeAt(pt, d.id) } : d));
    }
  }
  function end(evt) {
    if (!drag) return;
    if (drag.mode === "connect") {
      const target = nodeAt(svgPoint(evt), drag.id);
      if (canDrop(drag.id, target)) onAddEdge(drag.id, target);
    }
    setDrag(null);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <button onClick={onArrange} style={ghostBtn}>Auto-arrange</button>
        <span style={{ fontSize: 11.5, color: t.textMeta }}>
          Drag a node to move it. Drag the small dot on its right onto another node to connect them.
          Click a line to remove it.
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{
          display: "block", width: "100%", height: "auto",
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10,
          touchAction: "none", userSelect: "none",
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <pattern id="lp-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke={t.border} strokeWidth="0.7" />
          </pattern>
          <marker id="lp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 7 4 L 0 7 z" fill={t.textMeta} />
          </marker>
        </defs>
        <rect width={VW} height={VH} fill="url(#lp-grid)" />

        {ids.length === 0 && (
          <text x={VW / 2} y={VH / 2} textAnchor="middle" fontSize={15} fill={t.textMeta}>
            No nodes yet — add one in the Nodes section above.
          </text>
        )}

        {valid.map((e) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const d = `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
          const hot = hoverEdge === e._i;
          return (
            <g key={e._i}>
              <path
                d={d} fill="none"
                stroke={hot ? t.red : t.textMeta}
                strokeWidth={hot ? 2.4 : 1.4}
                opacity={e.kind === "depends" ? 0.45 : 0.8}
                strokeDasharray={e.kind === "data" ? "5 4" : undefined}
                markerEnd="url(#lp-arrow)"
              />
              <path
                d={d} fill="none" stroke="transparent" strokeWidth={14}
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setHoverEdge(e._i)}
                onPointerLeave={() => setHoverEdge((h) => (h === e._i ? null : h))}
                onClick={() => { setHoverEdge(null); onRemoveEdge(e._i); }}
              >
                <title>{`${byId.get(e.from)?.label || e.from} → ${byId.get(e.to)?.label || e.to} — click to remove`}</title>
              </path>
            </g>
          );
        })}

        {drag?.mode === "connect" && (() => {
          const a = pos.get(drag.id);
          const ok = canDrop(drag.id, drag.over);
          return (
            <path
              d={`M ${a.x + HANDLE_DX} ${a.y} L ${drag.x} ${drag.y}`}
              fill="none" stroke={ok ? t.accent : t.textMeta} strokeWidth={2}
              strokeDasharray="5 4" pointerEvents="none"
            />
          );
        })()}

        {ids.map((id) => {
          const p = pos.get(id);
          const n = byId.get(id);
          const connecting = drag?.mode === "connect";
          const isSource = connecting && drag.id === id;
          const isTarget = connecting && drag.over === id && canDrop(drag.id, id);
          const dimmed = connecting && !isSource && !canDrop(drag.id, id);
          const full = n?.label || id;
          const short = full.length > 20 ? `${full.slice(0, 19)}…` : full;
          return (
            <g key={id} opacity={dimmed ? 0.3 : 1}>
              {(isSource || isTarget) && <circle cx={p.x} cy={p.y} r={NR + 6} fill="none" stroke={t.accent} strokeWidth={2} />}
              <circle
                cx={p.x} cy={p.y} r={NR}
                fill={KIND_TONE[n?.kind] || "#6FA8CE"}
                stroke="#FFFFFF" strokeWidth={2}
                style={{ cursor: "grab" }}
                onPointerDown={(ev) => begin("move", id, ev)}
                onPointerEnter={() => setHoverNode(id)}
                onPointerLeave={() => setHoverNode((h) => (h === id ? null : h))}
              >
                <title>{`${full} — drag to move`}</title>
              </circle>

              <text x={p.x} y={p.y + NR + 13} textAnchor="middle" fontSize={11} fill={t.text} pointerEvents="none">{short}</text>

              {/* The connect handle. Always drawn so it can be found, brighter
                  on hover — a control that only exists on hover is a control
                  most people never learn about. */}
              {onAddEdge && !connecting && (
                <circle
                  cx={p.x + HANDLE_DX} cy={p.y} r={5}
                  fill={hoverNode === id ? t.accent : "#FFFFFF"}
                  stroke={t.accent} strokeWidth={1.5}
                  style={{ cursor: "crosshair" }}
                  onPointerDown={(ev) => begin("connect", id, ev)}
                >
                  <title>Drag onto another node to connect</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* The read the picture can't give you at a glance: a second island looks
          the same as a deliberate gap until it's counted. */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11.5, color: t.textMeta }}>
        <span>{ids.length} node{ids.length === 1 ? "" : "s"}</span>
        <span>{valid.length} connection{valid.length === 1 ? "" : "s"}</span>
        {ids.length > 0 && (
          <span style={{ color: islands > 1 ? t.amber : undefined }}>
            {islands === 1 ? "one connected map" : `${islands} separate pieces`}
          </span>
        )}
        {orphans.length > 0 && (
          <span style={{ color: t.red }}>
            {orphans.length} unconnected — {orphans.slice(0, 3).map((id) => byId.get(id)?.label || id).join(", ")}{orphans.length > 3 ? "…" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The section rail — the form's table of contents, in the order the *client*
// reads the document rather than the order the fields happen to sit in.
//
// This exists because the form and the artifact were two different mental
// models: an author edited "Deliverables, Scenarios, Nodes, Edges" and the
// client read "Act II · The Work", and nothing on the page connected the two.
// Act numbering is LIVING-PROPOSAL-PLAN.md §2b's table.
//
// The act label prints once per group, so the four sections that all feed the
// map read as one act rather than four unrelated lists.
// ---------------------------------------------------------------------------
function EditorNav({ sections, activeId, onJump }) {
  return (
    <nav
      aria-label="Sections"
      style={{
        position: "sticky", top: 68, alignSelf: "start",
        width: 208, flexShrink: 0, paddingRight: 8,
        maxHeight: "calc(100vh - 84px)", overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMeta, padding: "0 8px 8px" }}>
        The client's reading
      </div>

      {sections.map((s, i) => {
        const active = s.id === activeId;
        const newAct = s.act !== sections[i - 1]?.act;
        return (
          <div key={s.id}>
            {newAct && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: t.accent, padding: i === 0 ? "0 8px 3px" : "10px 8px 3px" }}>
                {s.act ? `ACT ${s.act}` : "SETUP"}
              </div>
            )}
            <button
              onClick={() => onJump(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, textAlign: "left",
                background: active ? t.accentLight : "transparent",
                color: active ? t.accent : t.textSub,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
              {s.count != null && (
                <span style={{ fontSize: 11, color: s.count === 0 ? t.textMeta : t.textSub, fontVariantNumeric: "tabular-nums" }}>{s.count}</span>
              )}
            </button>
          </div>
        );
      })}

      {/* Said rather than left to be discovered: an author who knows the client
          document will look for Act VI and find no section for it. */}
      <p style={{ fontSize: 10.5, color: t.textMeta, lineHeight: 1.5, padding: "12px 8px 0", margin: 0, borderTop: `1px solid ${t.border}`, marginTop: 10 }}>
        <strong style={{ color: t.textSub }}>Act VI · Your turn</strong> has nothing to author — it
        collects every node's needs automatically.
        <br /><br />
        <strong style={{ color: t.textSub }}>Act I · Today</strong> is in the plan but not in this
        build.
      </p>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// A page section — an eyebrow, a heading, a card. Optionally collapsible
// (explainers only — everything else is meant to be visibly present, because
// a hidden section is a section that quietly goes unauthored).
// ---------------------------------------------------------------------------
function SectionBlock({ id, act, title, eyebrow, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    // scrollMarginTop clears the sticky 52px nav — without it the jump links
    // land with the heading tucked underneath the bar.
    <section id={id} style={{ scrollMarginTop: 68 }}>
      <div
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, cursor: collapsible ? "pointer" : "default" }}
      >
        {act
          ? <span style={actChip} title={`The client reads this as Act ${act}`}>Act {act}</span>
          : <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.textMeta }} />}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textSub }}>{eyebrow}</span>
        {collapsible && (open ? <ChevronUp size={14} color={t.textMeta} /> : <ChevronDown size={14} color={t.textMeta} />)}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>{title}</h2>
      {(!collapsible || open) && children}
    </section>
  );
}

// Two columns that collapse to one on a phone. `auto-fit` + `minmax` does this
// without a media query: below ~2×220px the browser drops to a single column on
// its own. It was a hard `1fr 1fr`, which at 375px gave each form field about
// 170px — narrow enough that a client email or a node id was unreadable while
// being typed.
const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

// ---------------------------------------------------------------------------
// One node — the four-question contract, in full.
// ---------------------------------------------------------------------------
function NodeCard({ node: n, update: upd, open, onToggle, onDelete, deliverables, scenarios, usedClusters, takenIds }) {
  const idClash = n.id && takenIds.has(n.id);
  // Surfaced on the *collapsed* card, because a node with a silent problem is
  // one an author has no reason to open.
  const gaps = nodeGaps(n);
  return (
    <Card
      title={n.label || "(untitled)"} sub={`${n.id || "no id"} · ${labelFor(n.kind)}`} tone={KIND_TONE[n.kind] || "#6FA8CE"}
      open={open} onToggle={onToggle} onDelete={onDelete}
      badge={
        idClash ? <AlertTriangle size={14} color={t.red} title="Duplicate id" />
        : gaps.length ? <span style={{ fontSize: 10.5, color: t.amber, whiteSpace: "nowrap" }} title={gaps.join(" · ")}>{gaps.length === 1 ? gaps[0] : `${gaps.length} gaps`}</span>
        : null
      }
    >
      <div style={grid2}>
        <Field><label style={label}>Kind</label><select style={inp} value={n.kind} onChange={(e) => upd({ kind: e.target.value })}>{options(KIND_OPTIONS)}</select></Field>

        <Field><label style={label}>Label (the thing, 1–3 words)</label><input style={inp} value={n.label} onChange={(e) => upd({ label: e.target.value })} /></Field>
        <Field><label style={label}>Action (what it does, 2–4 words)</label><input style={inp} value={n.action || ""} onChange={(e) => upd({ action: e.target.value })} /></Field>

        <Field><label style={label}>Actor</label><select style={inp} value={n.actor} onChange={(e) => upd({ actor: e.target.value })}>{options(ACTOR_OPTIONS)}</select></Field>
        <Field>
          <label style={label}>Cluster</label>
          <input style={inp} list="lp-clusters" value={n.cluster || ""} onChange={(e) => upd({ cluster: e.target.value })} placeholder="intake, drafting…" />
        </Field>

        <Field>
          <label style={label}>Deliverable</label>
          <select style={inp} value={n.deliverable || ""} onChange={(e) => upd({ deliverable: e.target.value || null })}>
            <option value="">— none —</option>
            {deliverables.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </Field>
        <Field hint={n.confidence && n.confidence !== "committed" ? "Draws fainter on the map and adds a note to the panel." : "Committed says nothing extra — only Scoped and Exploratory show on the client's page."}>
          <label style={label}>Confidence</label>
          <select style={inp} value={n.confidence || "committed"} onChange={(e) => upd({ confidence: e.target.value })}>{options(CONFIDENCE_OPTIONS)}</select>
        </Field>

        <Field hint="A judgement about emphasis — it scales the bubble. Not a count; the steps-eliminated figure is the proposal's headline metric.">
          <label style={label}>Potential impact</label>
          <select style={inp} value={n.size || ""} onChange={(e) => upd({ size: e.target.value })}>
            <option value="">(kind default)</option>{SIZE_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{labelFor(s)}</option>)}
          </select>
        </Field>
        <Field>
          <label style={label}>Stakeholders involved (comma-separated)</label>
          <StringListField value={n.stakeholder} onChange={(v) => upd({ stakeholder: v })} placeholder="Outlook, the lawyer on file…" />
        </Field>

        {scenarios.length > 0 && (
          <Field wide>
            <label style={label}>Scenarios this node appears in (blank = every case type)</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {scenarios.map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5 }}>
                  <input
                    type="checkbox" checked={(n.scenarios || []).includes(s.id)}
                    onChange={(e) => upd({ scenarios: e.target.checked ? [...(n.scenarios || []), s.id] : (n.scenarios || []).filter((x) => x !== s.id) })}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </Field>
        )}

        <Field wide>
          <label style={label}>Description — what happens here</label>
          <textarea style={{ ...inp, resize: "vertical" }} rows={3} value={n.description || ""} onChange={(e) => upd({ description: e.target.value })} />
          <FirstSentenceHint text={n.description} />
        </Field>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={subHeading}>What we need from you</div>
          <RepeatList
            items={n.needs} onChange={(needs) => upd({ needs })}
            newItem={() => ({ id: uniqueSlug("need", new Set((n.needs || []).map((x) => x.id))), type: "text", required: true, prompt: "" })}
            addLabel="Add a need"
            renderItem={(need, j, updNeed) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, background: t.surface, borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select style={{ ...inp, width: "auto", flex: "0 0 130px" }} value={need.type} onChange={(e) => updNeed({ type: e.target.value })}>{options(NEED_TYPES)}</select>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                    <input type="checkbox" checked={need.required !== false} onChange={(e) => updNeed({ required: e.target.checked })} /> Required
                  </label>
                </div>
                <input style={inp} value={need.prompt} onChange={(e) => updNeed({ prompt: e.target.value })} placeholder="The question, asked directly" />
                {need.type === "confirm" && (
                  <input style={inp} value={need.confirm_label || ""} onChange={(e) => updNeed({ confirm_label: e.target.value })} placeholder="Checkbox label — “Yes, we can arrange that”" />
                )}
                {need.type === "choice" && (
                  <input style={inp} value={need.optionsCsv ?? csv(need.options)} onChange={(e) => updNeed({ optionsCsv: e.target.value })} placeholder="Comma-separated choices" />
                )}
              </div>
            )}
          />
        </div>

        <div>
          <div style={subHeading}>What you get back</div>
          <RepeatList
            items={n.gives} onChange={(gives) => upd({ gives })}
            newItem={() => ({ label: "", detail: "" })}
            addLabel="Add a give"
            renderItem={(gv, j, updGive) => (
              <div style={{ display: "flex", gap: 8 }}>
                <input style={inp} value={gv.label} onChange={(e) => updGive({ label: e.target.value })} placeholder="Label" />
                <input style={inp} value={gv.detail || ""} onChange={(e) => updGive({ detail: e.target.value })} placeholder="Detail (optional)" />
              </div>
            )}
          />
        </div>

        <div>
          <div style={subHeading}>Assumptions — the honesty valve; every node should carry at least one</div>
          <StringListField value={n.assumptions} onChange={(v) => upd({ assumptions: v })} placeholder="Comma-separated — each becomes its own line" />
        </div>
      </div>

      <datalist id="lp-clusters">{usedClusters.map((c) => <option key={c} value={c} />)}</datalist>
    </Card>
  );
}
const subHeading = { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMeta, marginBottom: 8 };

// ---------------------------------------------------------------------------
// Sections — roadmap, costing, maintenance. Each is optional at the top
// level: absent means the client page shows its honest empty state (see
// Pending in ProposalActs.jsx) rather than an invented figure or timeline.
// ---------------------------------------------------------------------------
function toggleSectionKey(g, set, key, make) {
  if (g.sections[key]) {
    const { [key]: _drop, ...rest } = g.sections;
    set({ sections: rest });
  } else {
    set({ sections: { ...g.sections, [key]: make() } });
  }
}

function RoadmapSection({ g, set, openLanes, setOpenLanes, toggle, deliverableIds }) {
  const r = g.sections.roadmap;
  const setR = (patch) => set({ sections: { ...g.sections, roadmap: { ...r, ...patch } } });
  return (
    <SectionBlock id="sec-roadmap" act="III" title="Roadmap" eyebrow="When each piece lands">
      {!r ? (
        <EmptySectionToggle
          text="No roadmap authored — the client page will say build duration isn't set yet."
          onAdd={() => toggleSectionKey(g, set, "roadmap", () => ({ weeks: 4, note: "", caveat: "This timeline is preliminary — actual timelines are subject to change.", lanes: [] }))}
        />
      ) : (
        <div>
          <div style={grid2}>
            <Field><label style={label}>Total weeks</label><input style={inp} type="number" value={r.weeks ?? ""} onChange={(e) => setR({ weeks: e.target.value })} /></Field>
            <Field><label style={label}>Caveat</label><input style={inp} value={r.caveat || ""} onChange={(e) => setR({ caveat: e.target.value })} /></Field>
            <Field wide><label style={label}>Note</label><textarea style={{ ...inp, resize: "vertical" }} rows={2} value={r.note || ""} onChange={(e) => setR({ note: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>Lanes</div>
            <RepeatList
              items={r.lanes} reorder onChange={(lanes) => setR({ lanes })}
              newItem={() => ({ id: uniqueSlug("lane", new Set((r.lanes || []).map((l) => l.id))), label: "New lane", deliverable: deliverableIds[0] || null, start_week: 0, end_week: 1, kind: "build" })}
              addLabel="Add lane"
              renderItem={(l, i, updL) => (
                <Card title={l.label || l.id} sub={`${l.start_week}–${l.end_week}w · ${labelFor(l.kind)}`} tone="#6FA8CE" open={openLanes.has(l.id || i)} onToggle={() => toggle(setOpenLanes, l.id || i)} onDelete={() => setR({ lanes: r.lanes.filter((_, j) => j !== i) })}>
                  <div style={grid2}>
                    <Field><label style={label}>Label</label><input style={inp} value={l.label} onChange={(e) => updL({ label: e.target.value })} /></Field>
                    <Field>
                      <label style={label}>Deliverable</label>
                      <select style={inp} value={l.deliverable || ""} onChange={(e) => updL({ deliverable: e.target.value || null })}>
                        <option value="">— none —</option>{g.deliverables.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    </Field>
                    <Field><label style={label}>Kind (colour only)</label><select style={inp} value={l.kind} onChange={(e) => updL({ kind: e.target.value })}>{options(LANE_KINDS)}</select></Field>
                    <Field><label style={label}>Start week</label><input style={inp} type="number" value={l.start_week} onChange={(e) => updL({ start_week: e.target.value })} /></Field>
                    <Field><label style={label}>End week</label><input style={inp} type="number" value={l.end_week} onChange={(e) => updL({ end_week: e.target.value })} /></Field>
                  </div>
                </Card>
              )}
            />
          </div>
          <RemoveSectionButton onClick={() => toggleSectionKey(g, set, "roadmap", null)} label="Remove roadmap" />
        </div>
      )}
    </SectionBlock>
  );
}

function CostingSection({ g, set, deliverableIds }) {
  const c = g.sections.costing;
  const setC = (patch) => set({ sections: { ...g.sections, costing: { ...c, ...patch } } });
  return (
    <SectionBlock id="sec-costing" act="IV" title="Investment" eyebrow="What the build costs, and why">
      {!c ? (
        <EmptySectionToggle
          text="No costing authored — the client page will say nothing about price."
          onAdd={() => toggleSectionKey(g, set, "costing", () => ({ currency: "AUD", note: "", rows: [], total: { label: "Total investment", amount: 0, was: undefined }, recurring: [] }))}
        />
      ) : (
        <div>
          <div style={grid2}>
            <Field><label style={label}>Currency</label><select style={inp} value={c.currency} onChange={(e) => setC({ currency: e.target.value })}><option value="AUD">AUD</option><option value="USD">USD</option></select></Field>
            <Field wide><label style={label}>Note</label><input style={inp} value={c.note || ""} onChange={(e) => setC({ note: e.target.value })} /></Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>Rows</div>
            <RepeatList
              items={c.rows} reorder onChange={(rows) => setC({ rows })}
              newItem={() => ({ kind: "line", deliverable: deliverableIds[0] || null, amount: "", item: "", basis: "" })}
              addLabel="Add row"
              renderItem={(row, i, updRow) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, background: t.surface, borderRadius: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select style={{ ...inp, width: "auto", flex: "0 0 110px" }} value={row.kind} onChange={(e) => updRow({ kind: e.target.value })}>
                      {options(["line", "discount"])}
                    </select>
                    <select style={{ ...inp, width: "auto", flex: "1 1 160px" }} value={row.deliverable || ""} onChange={(e) => updRow({ deliverable: e.target.value || null })}>
                      <option value="">— no deliverable —</option>{g.deliverables.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                    <input style={{ ...inp, width: 120, flex: "0 0 120px" }} type="number" value={row.amount} onChange={(e) => updRow({ amount: e.target.value })} placeholder="Amount" />
                  </div>
                  <input style={inp} value={row.item} onChange={(e) => updRow({ item: e.target.value })} placeholder="Item" />
                  <input style={inp} value={row.basis || ""} onChange={(e) => updRow({ basis: e.target.value })} placeholder="Basis (what's included)" />
                </div>
              )}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>Total — stored, never summed on the client</div>
            <div style={grid2}>
              <Field><label style={label}>Label</label><input style={inp} value={c.total?.label || ""} onChange={(e) => setC({ total: { ...c.total, label: e.target.value } })} /></Field>
              <Field><label style={label}>Amount</label><input style={inp} type="number" value={c.total?.amount ?? ""} onChange={(e) => setC({ total: { ...c.total, amount: e.target.value } })} /></Field>
              <Field><label style={label}>Was (optional — shows a strikethrough)</label><input style={inp} type="number" value={c.total?.was ?? ""} onChange={(e) => setC({ total: { ...c.total, was: e.target.value } })} /></Field>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>Recurring, after go-live</div>
            <RepeatList
              items={c.recurring} onChange={(recurring) => setC({ recurring })}
              newItem={() => ({ item: "", amount: "", per: "month", basis: "" })}
              addLabel="Add recurring line"
              renderItem={(row, i, updRow) => (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input style={{ ...inp, flex: "1 1 160px" }} value={row.item} onChange={(e) => updRow({ item: e.target.value })} placeholder="Item" />
                  <input style={{ ...inp, width: 100, flex: "0 0 100px" }} type="number" value={row.amount} onChange={(e) => updRow({ amount: e.target.value })} placeholder="Amount" />
                  <input style={{ ...inp, width: 100, flex: "0 0 100px" }} value={row.per} onChange={(e) => updRow({ per: e.target.value })} placeholder="Per (month)" />
                  <input style={{ ...inp, flex: "1 1 160px" }} value={row.basis || ""} onChange={(e) => updRow({ basis: e.target.value })} placeholder="Basis" />
                </div>
              )}
            />
          </div>
          <RemoveSectionButton onClick={() => toggleSectionKey(g, set, "costing", null)} label="Remove costing" />
        </div>
      )}
    </SectionBlock>
  );
}

function MaintenanceSection({ g, set, openOptions, setOpenOptions, toggle }) {
  const m = g.sections.maintenance;
  const setM = (patch) => set({ sections: { ...g.sections, maintenance: { ...m, ...patch } } });
  return (
    <SectionBlock id="sec-maintenance" act="V" title="Keeping it running" eyebrow="Optional maintenance, priced">
      {!m ? (
        <EmptySectionToggle
          text="No maintenance plan authored — the client page will say the build is theirs to run from day one."
          onAdd={() => toggleSectionKey(g, set, "maintenance", () => ({ currency: "AUD", optional: true, note: "", covers: [], caveat: "", options: [] }))}
        />
      ) : (
        <div>
          <div style={grid2}>
            <Field><label style={label}>Currency</label><select style={inp} value={m.currency} onChange={(e) => setM({ currency: e.target.value })}><option value="AUD">AUD</option><option value="USD">USD</option></select></Field>
            <Field>
              <label style={label}>Optional?</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 8 }}>
                <input type="checkbox" checked={m.optional !== false} onChange={(e) => setM({ optional: e.target.checked })} />
                Say so twice on the page — the plan can never read as compulsory
              </label>
            </Field>
            <Field wide><label style={label}>Note</label><textarea style={{ ...inp, resize: "vertical" }} rows={2} value={m.note || ""} onChange={(e) => setM({ note: e.target.value })} /></Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>What the hours cover</div>
            <StringListField value={m.covers} onChange={(v) => setM({ covers: v })} placeholder="Comma-separated — each becomes its own line" />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={subHeading}>Options — one hero number per plan</div>
            <RepeatList
              items={m.options} reorder onChange={(options) => setM({ options })}
              newItem={() => ({ id: uniqueSlug("plan", new Set((m.options || []).map((o) => o.id))), name: "New option", amount: "", per: "month", approx: false, recommended: false, covers: [], footnote: "" })}
              addLabel="Add option"
              renderItem={(o, i, updO) => (
                <Card title={o.name || o.id} sub={`${o.amount || 0}/${o.per}`} tone="#4FBF87" open={openOptions.has(o.id || i)} onToggle={() => toggle(setOpenOptions, o.id || i)} onDelete={() => setM({ options: m.options.filter((_, j) => j !== i) })}>
                  <div style={grid2}>
                    <Field><label style={label}>Name</label><input style={inp} value={o.name} onChange={(e) => updO({ name: e.target.value })} /></Field>
                    <Field><label style={label}>Amount</label><input style={inp} type="number" value={o.amount} onChange={(e) => updO({ amount: e.target.value })} /></Field>
                    <Field><label style={label}>Per</label><input style={inp} value={o.per} onChange={(e) => updO({ per: e.target.value })} placeholder="month" /></Field>
                    <Field>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 20 }}>
                        <input type="checkbox" checked={!!o.approx} onChange={(e) => updO({ approx: e.target.checked })} /> Approximate (shows “~”)
                      </label>
                    </Field>
                    <Field>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 20 }}>
                        <input type="checkbox" checked={!!o.recommended} onChange={(e) => updO({ recommended: e.target.checked })} /> Recommended
                      </label>
                    </Field>
                    <Field wide><label style={label}>Covers (comma-separated)</label><StringListField value={o.covers} onChange={(v) => updO({ covers: v })} /></Field>
                    <Field wide><label style={label}>Footnote</label><input style={inp} value={o.footnote || ""} onChange={(e) => updO({ footnote: e.target.value })} /></Field>
                  </div>
                </Card>
              )}
            />
          </div>
          <Field wide><label style={{ ...label, marginTop: 14 }}>Caveat</label><input style={inp} value={m.caveat || ""} onChange={(e) => setM({ caveat: e.target.value })} /></Field>
          <RemoveSectionButton onClick={() => toggleSectionKey(g, set, "maintenance", null)} label="Remove maintenance plan" />
        </div>
      )}
    </SectionBlock>
  );
}

function EmptySectionToggle({ text, onAdd }) {
  return (
    <div style={{ padding: "14px 16px", background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 10 }}>
      <p style={{ margin: "0 0 10px", fontSize: 12.5, color: t.textSub, lineHeight: 1.5 }}>{text}</p>
      <button onClick={onAdd} style={ghostBtn}><Plus size={13} strokeWidth={2.5} /> Add this section</button>
    </div>
  );
}
function RemoveSectionButton({ onClick, label: text }) {
  return <button onClick={onClick} style={{ ...dangerBtn, marginTop: 14, padding: "6px 10px" }}><Trash2 size={13} /> {text}</button>;
}
