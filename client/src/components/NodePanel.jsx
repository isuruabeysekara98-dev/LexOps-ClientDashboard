// ---------------------------------------------------------------------------
// The node panel — one bubble, opened.
// ---------------------------------------------------------------------------
// Renders the contract from `proposalCanvas/nodeContract.js` and nothing else.
// It never reaches into a raw node, so the map, the list and this panel cannot
// drift into describing the same node differently.
//
// ORDER IS NOT CONTRACT ORDER, DELIBERATELY. The contract numbers the four
// questions 1–4 with *needs* third and *gives* fourth. On screen they're
// swapped: what you get back comes before what we need from you. Asking a
// partner for four documents before telling them what it buys is the friction
// that kills these deals — the payoff earns the ask, so it goes first.
//
// Two variants, one component: `panel` floats over the map, `inline` sits in
// the document reading. The difference is chrome and width; every field, every
// state and every bit of copy is identical, because a client on a phone and a
// client on a laptop must not be answering different questions.
// ---------------------------------------------------------------------------
import { PALETTE } from "./proposalCanvas/language.js";
import { unitLabel } from "./proposalCanvas/units.js";
import { DARK, MOTION, fieldDark, eyebrow } from "./proposalCanvas/theme.js";
import NodeGlyph from "./proposalCanvas/NodeGlyph.jsx";

export default function NodePanel({
  node,                 // the contract, from readNode()
  drafts, onDraft, onSave, onUpload,
  saving, saved,
  onClose,
  variant = "panel",
}) {
  if (!node) return null;
  const inline = variant === "inline";

  return (
    <div>
      {/* ---- identity ---------------------------------------------------- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            {/* The node's actual shape, not a generic dot. Opening a bubble is
                the moment the reader can connect a glyph on the map to what it
                means — a dot here throws that away and makes every shape on the
                canvas look decorative. Same drawing as the rail's key. */}
            <NodeGlyph kind={node.kind} colour={node.tone} size={16} />
            <span style={metaLine}>
              {node.kindLabel}
              {node.actorLabel ? ` · ${node.actorLabel}` : ""}
              {node.cluster ? ` · ${node.cluster}` : ""}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: inline ? 17 : 18, lineHeight: 1.3, fontWeight: 600 }}>
            {node.label}
          </h2>
          {/* Same pair as the caption on the map, so opening a bubble confirms
              what you clicked rather than renaming it. */}
          {node.action && (
            <p style={{ margin: "2px 0 0", fontSize: 13.5, color: DARK.textSub }}>{node.action}</p>
          )}
          {node.stakeholder.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {node.stakeholder.map((s) => (
                <span key={s} style={stakeholderChip}>{s}</span>
              ))}
            </div>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={closeButton} aria-label="Close">×</button>
        )}
      </div>

      {/* What this kind of node promises, in the reader's language — so nobody
          has to learn our taxonomy to use the map. */}
      {node.kindGloss && <p style={glossLine}>{node.kindGloss}</p>}

      {/* Confidence only speaks when it isn't `committed`. A note saying
          "committed" on every node teaches the reader to ignore the field. */}
      {node.confidenceGloss && (
        <p style={{ ...glossLine, color: PALETTE.amber }}>{node.confidenceGloss}</p>
      )}

      {node.value && (
        <p style={{ ...glossLine, color: PALETTE.ink }}>
          Worth <strong>{node.value.amount}</strong> {unitLabel(node.value.unit, node.value.amount)}
        </p>
      )}

      {/* ---- Q1 · what happens here -------------------------------------- */}
      {node.description && (
        <p style={{ margin: "13px 0 0", fontSize: 14, lineHeight: 1.6, color: DARK.text }}>
          {node.description}
        </p>
      )}

      {/* ---- Q4 · what you get back (before the ask — see header note) ---- */}
      {node.gives.length > 0 && (
        <section style={section}>
          <h3 style={h3}>What you get back</h3>
          <ul style={list}>
            {node.gives.map((g, i) => (
              <li key={i} style={listItem}>
                <span>
                  {g.label}
                  {g.detail ? <span style={{ color: DARK.textFaint }}> — {g.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Q3 · what we need from you ---------------------------------- */}
      {node.needs.length > 0 && (
        <section style={section}>
          <h3 style={h3}>
            What we need from you
            {node.hasOpenNeeds && (
              <span style={{ color: PALETTE.amber, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                {"  "}· {node.openRequired} outstanding
              </span>
            )}
          </h3>
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
        </section>
      )}

      {/* ---- assumptions — the honesty valve ----------------------------- */}
      {node.assumptions.length > 0 && (
        <section style={section}>
          <h3 style={h3}>What we're assuming</h3>
          <ul style={list}>
            {node.assumptions.map((a, i) => (
              <li key={i} style={{ ...listItem, color: DARK.textFaint }}>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One need — text, longtext, file, confirm, choice, contact.
// ---------------------------------------------------------------------------
export function NeedField({ need, draft, onDraft, onSave, onUpload, saving, saved }) {
  const { answered, required, type, input } = need;

  // The state a field is in, said once. `saved` is transient and outranks
  // `answered`, so a just-typed answer confirms rather than silently ticking.
  const status =
    saving ? { text: "saving…", colour: DARK.textFaint }
    : saved ? { text: "saved", colour: PALETTE.green }
    : answered ? { text: "saved", colour: PALETTE.green }
    : required ? { text: "Needed", colour: PALETTE.amber }
    : { text: "optional", colour: DARK.textFaint };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={fieldLabel}>
        <span style={{ paddingRight: 10 }}>
          {need.prompt}
          {!required && <span style={{ color: DARK.textFaint }}> (optional)</span>}
        </span>
        <span style={{ fontSize: 11.5, color: status.colour, whiteSpace: "nowrap", flexShrink: 0 }}>
          {status.text}
        </span>
      </label>

      {type === "file" ? (
        <div>
          {input?.file_name && (
            <p style={{ margin: "0 0 6px", fontSize: 12.5, color: PALETTE.green }}>
              Uploaded: <strong>{input.file_name}</strong>
            </p>
          )}
          <label style={fileDrop}>
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            {input?.file_name ? "Replace file" : "Choose a file"}
          </label>
        </div>
      ) : type === "confirm" ? (
        <label style={confirmRow}>
          <input
            type="checkbox"
            checked={draft === true || draft === "true" || input?.value === true}
            onChange={(e) => { onDraft(e.target.checked); onSave(e.target.checked); }}
            style={{ width: 16, height: 16, accentColor: PALETTE.primary, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13.5 }}>{need.confirm_label || "Yes, that's right"}</span>
        </label>
      ) : type === "choice" ? (
        <select
          value={draft}
          onChange={(e) => { onDraft(e.target.value); onSave(e.target.value); }}
          style={field}
        >
          <option value="">Choose one…</option>
          {(need.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === "longtext" ? (
        <textarea
          value={draft}
          rows={3}
          onChange={(e) => onDraft(e.target.value)}
          onBlur={(e) => onSave(e.target.value)}
          style={{ ...field, resize: "vertical", minHeight: 66 }}
        />
      ) : (
        <input
          type="text"
          value={draft}
          placeholder={type === "contact" ? "Name and email" : ""}
          onChange={(e) => onDraft(e.target.value)}
          onBlur={(e) => onSave(e.target.value)}
          style={field}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Every surface here reads from theme.js. The panel floats over the map, so it
// gets the deepest card fill in the set — a translucent panel sitting directly
// on top of moving bubbles is the one place where contrast has to beat
// prettiness, or the reader is trying to read a contract through a constellation.
const stakeholderChip = {
  fontSize: 11.5, padding: "2px 8px", borderRadius: 20,
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.border,
  background: "rgba(255,255,255,0.05)",
  color: DARK.textSub, whiteSpace: "nowrap",
};
const metaLine = { ...eyebrow, fontWeight: 500 };
const glossLine = { margin: "7px 0 0", fontSize: 12.5, lineHeight: 1.5, color: DARK.textFaint };
const section = { marginTop: 17 };
const h3 = { ...eyebrow, letterSpacing: ".08em", margin: "0 0 8px" };
const list = { margin: 0, padding: 0, listStyle: "none" };
const listItem = {
  display: "flex", alignItems: "flex-start", fontSize: 13.5,
  lineHeight: 1.55, marginBottom: 5, color: DARK.text,
};
const fieldLabel = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline",
  marginBottom: 5, fontSize: 13.5, lineHeight: 1.45, color: DARK.text,
};
const field = { ...fieldDark, padding: "8px 10px", borderRadius: 8, outlineColor: PALETTE.primary };
const fileDrop = {
  display: "inline-block", padding: "7px 13px", fontSize: 13, cursor: "pointer",
  borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: DARK.borderStrong,
  background: "rgba(255,255,255,0.05)", color: DARK.textSub,
  transition: `background ${MOTION.base} ${MOTION.ease}, border-color ${MOTION.base} ${MOTION.ease}`,
};
const confirmRow = {
  display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
  padding: "7px 10px", borderRadius: 8,
  borderWidth: 1, borderStyle: "solid", borderColor: DARK.border,
  background: "rgba(255,255,255,0.05)",
};
const closeButton = {
  border: "none", background: "none", cursor: "pointer", fontSize: 22,
  lineHeight: 1, color: DARK.textFaint, padding: "0 2px", flexShrink: 0,
};
