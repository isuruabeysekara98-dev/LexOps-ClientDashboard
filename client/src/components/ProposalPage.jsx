import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ProposalViewer, { Logo } from "./ProposalViewer.jsx";

const t = {
  bg: "#FAFBFC",
  card: "#FFFFFF",
  surface: "#F4F8FB",
  surfaceHigh: "#E4F1F8",
  border: "#E8E8E8",
  text: "#232A34",
  textSub: "#616568",
  textMeta: "#9DB5C9",
  accent: "#375971",
  accentHover: "#232A34",
  accentLight: "rgba(55,89,113,0.07)",
  accentBorder: "rgba(55,89,113,0.18)",
  green: "#3C7A52",
  greenSoft: "#E7F3EC",
  greenBorder: "rgba(60,122,82,0.22)",
  amber: "#B45309",
  amberSoft: "rgba(180,83,9,0.07)",
  amberBorder: "rgba(180,83,9,0.2)",
  red: "#C9542E",
  redSoft: "rgba(201,84,46,0.08)",
  shadow: "0 1px 4px rgba(35,42,52,0.06)",
  shadowMd: "0 8px 32px rgba(35,42,52,0.14)",
  shadowLg: "0 12px 40px rgba(35,42,52,0.14)",
};

const inp = {
  width: "100%",
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#232A34",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Eyebrow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#9DB5C9", display: "inline-block" }} />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#616568" }}>{label}</span>
    </div>
  );
}

// Dashed placeholder shown where content hasn't been filled in yet
function FieldTodo({ label = "Field to be completed", compact = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: compact ? "7px 10px" : "10px 13px",
      border: "1.5px dashed rgba(155,155,143,0.38)",
      borderRadius: 8, color: t.textMeta,
      fontSize: compact ? 11 : 12, fontStyle: "italic",
      background: "rgba(155,155,143,0.035)",
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {label}
    </div>
  );
}

// ─── Keyframe CSS injected once ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes slideInRight { from { transform:translateX(48px); opacity:0 } to { transform:translateX(0); opacity:1 } }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
  @keyframes dotBounce { 0%,80%,100%{transform:scale(0.8);opacity:0.4} 40%{transform:scale(1.2);opacity:1} }
`;

// ─── Simple response panel ────────────────────────────────────────────────────
function SimpleResponsePanel({ proposal, token, onRefresh }) {
  const [mode, setMode] = useState("idle");
  const [signerName, setSignerName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isFrozen = ["feedback_received", "won", "lost", "converted"].includes(proposal.status);

  if (isFrozen || mode === "done-accept") {
    return (
      <div style={{ background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 14, padding: "24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "#fff", border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✓</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.green, marginBottom: 5, fontFamily: "'Satoshi', sans-serif" }}>Proposal Accepted</div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>Thank you — your acceptance has been sent to the LexOps team. We'll be in touch shortly.</div>
        </div>
      </div>
    );
  }
  if (mode === "done-request") {
    return (
      <div style={{ background: t.amberSoft, border: `1px solid ${t.amberBorder}`, borderRadius: 14, padding: "24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "#fff", border: `1px solid ${t.amberBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>↩</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.amber, marginBottom: 5, fontFamily: "'Satoshi', sans-serif" }}>Change request sent</div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>The LexOps team has been notified and will reach out to discuss your feedback.</div>
        </div>
      </div>
    );
  }

  async function handleAccept() {
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, signer_name: signerName.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); setSubmitting(false); return; }
      setMode("done-accept"); if (onRefresh) onRefresh();
    } catch { setError("Connection error — please try again."); setSubmitting(false); }
  }

  async function handleRequestChanges() {
    if (!changeNote.trim()) { setError("Please describe what you'd like changed."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/request-changes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, note: changeNote.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); setSubmitting(false); return; }
      setMode("done-request"); if (onRefresh) onRefresh();
    } catch { setError("Connection error — please try again."); setSubmitting(false); }
  }

  return (
    <div style={{ background: t.card, border: `1px solid ${t.accentBorder}`, borderRadius: 14, overflow: "hidden", boxShadow: t.shadowMd }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, background: t.accentLight, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: t.card, border: `1px solid ${t.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📋</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Satoshi', sans-serif" }}>Ready to respond?</div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 1 }}>Accept this proposal or let us know what you'd like changed.</div>
        </div>
      </div>
      <div style={{ padding: "22px 22px" }}>
        {error && <div style={{ background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", borderRadius: 7, padding: "9px 12px", color: t.red, fontSize: 12, marginBottom: 14 }}>{error}</div>}
        {mode === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setMode("accepting")} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = t.accentHover} onMouseLeave={e => e.currentTarget.style.background = t.accent}>
              <span style={{ fontSize: 16 }}>✓</span> Accept this proposal
            </button>
            <button onClick={() => setMode("requesting")} style={{ background: "transparent", color: t.text, border: `1px solid rgba(0,0,0,0.2)`, borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = t.text; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.text; }}>
              <span style={{ fontSize: 16 }}>↩</span> Request changes
            </button>
          </div>
        )}
        {mode === "accepting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Your name <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: t.textMeta }}>— optional</span></label>
              <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="e.g. Jane Smith" style={inp} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={handleAccept} disabled={submitting} style={{ background: submitting ? t.border : t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{submitting ? "Confirming…" : "Confirm acceptance →"}</button>
              <button onClick={() => { setMode("idle"); setError(""); }} style={{ background: "transparent", color: t.text, border: `1px solid rgba(0,0,0,0.2)`, borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>Back</button>
            </div>
          </div>
        )}
        {mode === "requesting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>What would you like changed?</label>
              <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Describe what you'd like LexOps to revise or clarify…" rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={handleRequestChanges} disabled={submitting} style={{ background: submitting ? t.border : t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{submitting ? "Sending…" : "Send change request →"}</button>
              <button onClick={() => { setMode("idle"); setError(""); }} style={{ background: "transparent", color: t.text, border: `1px solid rgba(0,0,0,0.2)`, borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Horizontal stage timeline ─────────────────────────────────────────────
function HorizontalTimeline({ stages, selectedIndex, onSelect }) {
  if (!stages || stages.length === 0) return null;
  const circleSize = 64;
  const half = circleSize / 2;

  return (
    <div style={{ background: t.card, borderRadius: 14, padding: "28px 24px 24px", border: `1px solid ${t.border}`, overflowX: "auto", boxShadow: t.shadow }}>
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative", minWidth: stages.length * 152 }}>
        {/* Connecting line */}
        {stages.length > 1 && (
          <div style={{ position: "absolute", top: half, left: half + 8, right: half + 8, height: 2, background: "#0B3B3B", zIndex: 0 }} />
        )}
        {stages.map((stage, i) => {
          const isSelected = selectedIndex === i;
          return (
            <div key={i} onClick={() => onSelect(isSelected ? null : i)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", position: "relative", zIndex: 1, padding: "0 8px" }}>
              {/* Circle */}
              <div style={{
                width: circleSize, height: circleSize, borderRadius: "50%",
                background: isSelected ? t.accent : "#0B3B3B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, position: "relative", flexShrink: 0,
                border: isSelected ? `3px solid ${t.accent}` : `3px solid #0B3B3B`,
                boxShadow: isSelected ? `0 0 0 5px rgba(11,79,79,0.18), ${t.shadowMd}` : `0 2px 8px rgba(0,0,0,0.18)`,
                transition: "all 0.2s ease",
                userSelect: "none",
              }}>
                {stage.emoji || "📋"}
                {/* Number badge */}
                <div style={{
                  position: "absolute", top: -3, right: -3,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#fff", color: "#0B3B3B",
                  fontSize: 9, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid rgba(11,59,59,0.15)`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                }}>
                  {i + 1}
                </div>
              </div>
              {/* Label */}
              <div style={{ textAlign: "center", marginTop: 13 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: stage.title ? t.text : t.textMeta, marginBottom: 4, lineHeight: 1.3, fontStyle: stage.title ? "normal" : "italic" }}>
                  {stage.title || "Stage title to be completed"}
                </div>
                {stage.description && (
                  <div style={{ fontSize: 10, color: t.textSub, lineHeight: 1.55, maxWidth: 120 }}>
                    {stage.description.length > 72 ? stage.description.slice(0, 72) + "…" : stage.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stage detail drawer ──────────────────────────────────────────────────────
function StageDrawer({ stage, index, total, onClose, onPrev, onNext }) {
  const stats = stage.stats || [];
  const inputs = stage.inputs || [];
  const outputs = stage.outputs || [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,24,24,0.5)", backdropFilter: "blur(3px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(540px,100vw)", background: t.card, overflowY: "auto", boxShadow: t.shadowLg, display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
        {/* Header */}
        <div style={{ padding: "22px 28px 16px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, position: "sticky", top: 0, background: t.card, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Stage {index + 1} of {total}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={onPrev} disabled={index === 0} title="Previous stage" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface, cursor: index === 0 ? "not-allowed" : "pointer", color: t.textSub, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", opacity: index === 0 ? 0.35 : 1 }}>←</button>
              <button onClick={onNext} disabled={index === total - 1} title="Next stage" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface, cursor: index === total - 1 ? "not-allowed" : "pointer", color: t.textSub, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", opacity: index === total - 1 ? 0.35 : 1 }}>→</button>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface, cursor: "pointer", color: t.textSub, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 22, fontWeight: 700, color: t.text, margin: 0, lineHeight: 1.2 }}>
            {stage.title || <span style={{ color: t.textMeta, fontStyle: "italic", fontWeight: 400 }}>Stage title to be completed</span>}
          </h2>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>
          {/* Description + stats */}
          <div style={{ background: "rgba(11,79,79,0.05)", border: `1px solid rgba(11,79,79,0.12)`, borderRadius: 12, padding: "18px 20px", marginBottom: 24 }}>
            {stage.description ? (
              <p style={{ fontSize: 14, color: t.textSub, lineHeight: 1.75, margin: stats.length > 0 ? "0 0 18px" : 0 }}>{stage.description}</p>
            ) : (
              <div style={{ marginBottom: stats.length > 0 ? 14 : 0 }}><FieldTodo label="Stage description to be completed" /></div>
            )}
            {stats.length > 0 ? (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: t.accent, letterSpacing: "-0.03em" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : !stage.description ? null : (
              <FieldTodo label="Key stats to be added" compact />
            )}
          </div>

          {/* Inputs */}
          <div style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Inputs</h3>
            {inputs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inputs.map((item, i) => (
                  <div key={i} style={{ background: "#FBF9F5", border: `1px solid ${t.border}`, borderRadius: 10, padding: "13px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{item.emoji || "📋"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{item.name || item.label || <FieldTodo compact />}</div>
                      {(item.description || item.detail) && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>{item.description || item.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <FieldTodo label="Inputs to be completed" />
            )}
          </div>

          {/* Outputs */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.green, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Outputs LexOps delivers</h3>
            {outputs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {outputs.map((item, i) => (
                  <div key={i} style={{ background: "rgba(5,150,105,0.04)", border: `1px solid rgba(5,150,105,0.18)`, borderRadius: 10, padding: "13px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{item.emoji || "✓"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{item.name || item.label || <FieldTodo compact />}</div>
                      {(item.description || item.detail) && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>{item.description || item.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <FieldTodo label="Outputs to be completed" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Running animation for Step 3 ────────────────────────────────────────────
function RunningAnimation({ stages }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!stages || stages.length === 0) return;
    const id = setInterval(() => setActive(a => Math.min(a + 1, stages.length)), 900);
    return () => clearInterval(id);
  }, [stages]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 24 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: t.amber, animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 6 }}>Running your matter through the workflow</div>
        <div style={{ fontSize: 13, color: t.textMeta }}>Finalizing…</div>
      </div>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 24px", width: "100%", maxWidth: 360 }}>
        {(stages || []).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < stages.length - 1 ? `1px solid ${t.border}` : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: i < active ? t.green : t.border, transition: "background 0.4s" }} />
            <span style={{ fontSize: 13, color: i < active ? t.text : t.textMeta, transition: "color 0.4s" }}>{s.emoji} {s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stage result block ───────────────────────────────────────────────────────
function StageResultBlock({ stage, aiOutput, stageIndex, stageTotal }) {
  const [expanded, setExpanded] = useState(stageIndex === 0);
  const [showExpected, setShowExpected] = useState(false);
  const outputs = stage.outputs || [];

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", background: t.card }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: expanded ? `1px solid ${t.border}` : "none" }} onMouseEnter={e => e.currentTarget.style.background = t.surface} onMouseLeave={e => e.currentTarget.style.background = "none"}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: t.accentLight, border: `1px solid ${t.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{stage.emoji || "📋"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.textMeta, marginBottom: 1 }}>Stage {stageIndex + 1} of {stageTotal}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{stage.title}</div>
        </div>
        <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, background: t.accentLight, padding: "3px 10px", borderRadius: 20, border: `1px solid ${t.accentBorder}`, flexShrink: 0 }}>✓ Generated</div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textMeta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.78, whiteSpace: "pre-wrap", marginBottom: outputs.length > 0 ? 16 : 0 }}>
            {(aiOutput?.content || "").replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
          {outputs.length > 0 && (
            <div>
              <button onClick={() => setShowExpected(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: t.accent, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
                {showExpected ? "▲ Hide" : "▼ Compare"} expected outputs
              </button>
              {showExpected && (
                <div style={{ marginTop: 12, background: t.surface, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMeta, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>What LexOps delivers at this stage</div>
                  {outputs.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 7, fontSize: 12, color: t.text }}>
                      <span>{o.emoji || "✓"}</span>
                      <div><strong>{o.name}</strong>{o.description && ` — ${o.description}`}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Try your own matter wizard ───────────────────────────────────────────────
function TryMatterWizard({ wf, token, proposal }) {
  const [step, setStep] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [fields, setFields] = useState(null); // null = loading, [] = no fields
  const [formValues, setFormValues] = useState({});

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [runCount, setRunCount] = useState(wf.run_count || 0);
  const [runsRemaining, setRunsRemaining] = useState(10 - (wf.run_count || 0));

  const [feedback, setFeedback] = useState(wf.feedback_text || "");
  const [feedbackSaved, setFeedbackSaved] = useState(!!wf.feedback_text);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [lastSavedFeedback, setLastSavedFeedback] = useState(wf.feedback_text || "");

  // ── Template state ─────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [hovTemplate, setHovTemplate] = useState(null);

  const stages = wf.stages || [];

  // Restore latest run result if available
  useEffect(() => {
    if (wf.latest_run?.output_json) {
      setRunResult(wf.latest_run.output_json);
    }
  }, []);

  // Load saved example templates for this workflow
  async function loadTemplates() {
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${wf.id}/demo-templates?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch { setTemplates([]); }
    finally { setLoadingTemplates(false); }
  }

  useEffect(() => { loadTemplates(); }, [wf.id]);

  function handleApplyTemplate(tpl) {
    const vals = tpl.form_values || {};
    setFormValues(prev => ({ ...prev, ...vals }));
    if (vals.__transcript) { setTranscript(vals.__transcript); setTranscriptOpen(true); }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) { setTemplateError("Please enter a name for this example."); return; }
    setSavingTemplate(true); setTemplateError("");
    const valuesToSave = { ...formValues };
    if (transcript.trim()) valuesToSave.__transcript = transcript.trim();
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${wf.id}/demo-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: templateName.trim(), form_values: valuesToSave }),
      });
      const data = await res.json();
      if (!res.ok) { setTemplateError(data.message || "Failed to save."); return; }
      setTemplates(prev => [data.template, ...prev]);
      setTemplateName(""); setShowSaveForm(false);
    } catch { setTemplateError("Connection error. Please try again."); }
    finally { setSavingTemplate(false); }
  }

  async function handleDeleteTemplate(tid) {
    setTemplates(prev => prev.filter(t => t.id !== tid));
    try {
      await fetch(`/api/proposals/v2/workflow/${wf.id}/demo-templates/${tid}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch { loadTemplates(); }
  }

  // Load dynamic form fields from Claude when wizard first opens
  useEffect(() => {
    async function loadFields() {
      try {
        const res = await fetch("/api/proposals/v2/demo/generate-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, workflow_id: wf.id }),
        });
        const data = await res.json();
        setFields(Array.isArray(data.fields) ? data.fields : []);
        // Initialise form values
        const defaults = {};
        (data.fields || []).forEach(f => { defaults[f.id] = ""; });
        setFormValues(defaults);
      } catch {
        setFields([]);
      }
    }
    loadFields();
  }, [wf.id]);

  function buildInputText() {
    const parts = [];
    if (transcript.trim()) parts.push(`CALL TRANSCRIPT / CONTEXT:\n${transcript.trim()}`);
    if (fields && fields.length > 0) {
      const fieldLines = fields.filter(f => formValues[f.id]?.trim()).map(f => `${f.label}: ${formValues[f.id]}`);
      if (fieldLines.length > 0) parts.push(`MATTER DETAILS:\n${fieldLines.join("\n")}`);
    }
    return parts.join("\n\n---\n\n");
  }

  async function handleRun() {
    if (running || runsRemaining <= 0) return;
    setRunning(true); setRunError("");
    try {
      const res = await fetch("/api/proposals/v2/demo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, workflow_id: wf.id, input_text: buildInputText() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setRunError(data.message || "Generation failed. Please try again."); return; }
      setRunResult(data.output_json);
      setRunCount(data.run_number);
      setRunsRemaining(data.runs_remaining);
    } catch { setRunError("Connection error. Please check your connection and try again."); }
    finally { setRunning(false); }
  }

  async function handleSaveFeedback() {
    if (!feedback.trim()) { setFeedbackError("Please enter some feedback before saving."); return; }
    setSavingFeedback(true); setFeedbackError("");
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${wf.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback_text: feedback }),
      });
      const data = await res.json();
      if (!res.ok) { setFeedbackError(data.message || "Failed to save feedback."); return; }
      setFeedbackSaved(true); setLastSavedFeedback(feedback);
    } catch { setFeedbackError("Connection error. Please try again."); }
    finally { setSavingFeedback(false); }
  }

  function handleFileAdd(e) {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }

  function removeFile(i) { setUploadedFiles(prev => prev.filter((_, j) => j !== i)); }

  const feedbackChanged = feedback.trim() !== lastSavedFeedback.trim();
  const canGoToStep3 = step === 2;

  const tabStyle = (active, enabled) => ({
    padding: "10px 0", background: "none", border: "none",
    fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? t.accent : enabled ? t.textSub : t.textMeta,
    cursor: enabled ? "pointer" : "not-allowed",
    borderBottom: active ? `2px solid ${t.accent}` : "2px solid transparent",
    transition: "all 0.15s", whiteSpace: "nowrap",
  });

  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 };

  return (
    <div style={{ border: `1.5px solid ${t.border}`, borderRadius: 14, overflow: "hidden", background: t.card, boxShadow: t.shadow }}>
      {/* Header */}
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: t.amber, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0, letterSpacing: "-0.05em" }}>B</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Satoshi', sans-serif" }}>Try your own matter</div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, lineHeight: 1.5 }}>Run a matter through the workflow — then review each stage and submit your feedback</div>
        </div>
        {runCount > 0 && (
          <div style={{ marginLeft: "auto", fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {runCount} / 10 runs used
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div style={{ display: "flex", padding: "0 22px", borderBottom: `1px solid ${t.border}`, gap: 24 }}>
        <button style={tabStyle(step === 1, true)} onClick={() => setStep(1)}>Step 1 — Matter details</button>
        <button style={tabStyle(step === 2, true)} onClick={() => setStep(2)}>Step 2 — Documents</button>
        <button style={tabStyle(step === 3, step >= 2)} onClick={() => { if (step >= 2) setStep(3); }}>Step 3 — Results &amp; feedback</button>
      </div>

      {/* Step 1: Matter details */}
      {step === 1 && (
        <div style={{ padding: "20px 22px" }}>

          {/* ── Saved examples strip ─────────────────────────────────────────── */}
          {!loadingTemplates && templates.length > 0 && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, whiteSpace: "nowrap", marginRight: 2 }}>Load example:</span>
              {templates.map(tpl => (
                <div key={tpl.id} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
                  onMouseEnter={() => setHovTemplate(tpl.id)} onMouseLeave={() => setHovTemplate(null)}>
                  <button
                    onClick={() => handleApplyTemplate(tpl)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: `1px solid ${t.accentBorder}`, borderRadius: 20, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, color: t.accent, transition: "background 0.12s", paddingRight: hovTemplate === tpl.id ? 26 : 10 }}
                  >
                    <span>📋</span>{tpl.name}
                  </button>
                  {hovTemplate === tpl.id && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                      title="Remove this example"
                      style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: t.textMeta, fontSize: 13, lineHeight: 1, padding: "2px 3px", display: "flex", alignItems: "center" }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Transcript accordion */}
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 9, marginBottom: 16, overflow: "hidden" }}>
            <button onClick={() => setTranscriptOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: t.textSub }}>
              <span>Have a call transcript? Paste it — we'll extract the fields</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.textMeta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: transcriptOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {transcriptOpen && (
              <div style={{ padding: "0 16px 14px" }}>
                <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste a call transcript, email thread, or any relevant context…" rows={5} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            )}
          </div>

          {/* Dynamic form fields */}
          {fields === null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", color: t.textMeta, fontSize: 13 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              Generating form fields for this workflow…
            </div>
          ) : fields.length === 0 ? (
            <div>
              <label style={labelStyle}>Describe your matter</label>
              <textarea
                value={formValues.__freeText || ""}
                onChange={e => setFormValues({ __freeText: e.target.value })}
                placeholder={`Describe a specific matter or situation you'd like to run through the ${wf.name} workflow…`}
                rows={5}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fields.map(field => (
                <div key={field.id}>
                  <label style={labelStyle}>{field.label}{field.required && <span style={{ color: t.red, marginLeft: 3 }}>*</span>}</label>
                  {field.type === "textarea" ? (
                    <textarea value={formValues[field.id] || ""} onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))} placeholder={field.placeholder || ""} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                  ) : field.type === "select" ? (
                    <select value={formValues[field.id] || ""} onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))} style={{ ...inp, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B8F' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}>
                      <option value="">Select {field.label.toLowerCase()}…</option>
                      {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={field.type === "number" ? "number" : "text"} value={formValues[field.id] || ""} onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))} placeholder={field.placeholder || ""} style={inp} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Save as example strip ────────────────────────────────────────── */}
          {fields !== null && (() => {
            const hasValues = Object.values(formValues).some(v => String(v).trim()) || transcript.trim();
            return hasValues ? (
              <div style={{ marginTop: 16 }}>
                {!showSaveForm ? (
                  <button
                    onClick={() => { setShowSaveForm(true); setTemplateError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: t.textMeta, display: "flex", alignItems: "center", gap: 5, padding: 0, transition: "color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color = t.accent}
                    onMouseLeave={e => e.currentTarget.style.color = t.textMeta}
                  >
                    <span style={{ fontSize: 14 }}>🔖</span> Save these values as a reusable example
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", background: t.surface, border: `1px solid ${t.accentBorder}`, borderRadius: 9 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Name this example</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        autoFocus
                        value={templateName}
                        onChange={e => { setTemplateName(e.target.value); setTemplateError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveTemplate(); if (e.key === "Escape") { setShowSaveForm(false); setTemplateName(""); } }}
                        placeholder="e.g. Okafor estate — test matter"
                        style={{ ...inp, flex: 1, padding: "8px 12px", fontSize: 13 }}
                      />
                      <button
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: savingTemplate ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savingTemplate ? 0.7 : 1, flexShrink: 0 }}
                      >{savingTemplate ? "Saving…" : "Save"}</button>
                      <button
                        onClick={() => { setShowSaveForm(false); setTemplateName(""); setTemplateError(""); }}
                        style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: t.textSub }}
                      >Cancel</button>
                    </div>
                    {templateError && <div style={{ fontSize: 12, color: t.red }}>{templateError}</div>}
                  </div>
                )}
              </div>
            ) : null;
          })()}

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setStep(2)} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Next: Add documents →</button>
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 2 && (
        <div style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 13, color: t.textSub, marginBottom: 16, lineHeight: 1.6 }}>
            Upload any supporting documents — client files, precedent templates, or reference material. This gives the AI more context to work with.
          </div>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileAdd} style={{ display: "none" }} />
          <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: t.surface, transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = t.accentBorder} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>⬆️</div>
            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>Click to upload documents</div>
            <div style={{ fontSize: 11, color: t.textMeta, marginTop: 4 }}>PDF, DOCX, TXT, CSV, XLSX — up to 10 MB each</div>
          </div>
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 13px" }}>
                  <span style={{ fontSize: 16 }}>📎</span>
                  <span style={{ fontSize: 12, color: t.text, flex: 1 }}>{f.name} <span style={{ color: t.textMeta }}>({(f.size / 1024).toFixed(0)} KB)</span></span>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMeta, fontSize: 14, padding: 2 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ background: "transparent", color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
            <button onClick={() => { setStep(3); handleRun(); }} disabled={runsRemaining <= 0} style={{ background: runsRemaining <= 0 ? t.surface : t.accent, color: runsRemaining <= 0 ? t.textMeta : "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: runsRemaining <= 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {runsRemaining <= 0 ? "Run limit reached" : "Run through workflow →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results & feedback */}
      {step === 3 && (
        <div style={{ padding: "20px 22px" }}>
          {running && <RunningAnimation stages={stages} />}

          {!running && runError && (
            <div style={{ background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "12px 16px", color: t.red, fontSize: 13, marginBottom: 16 }}>
              {runError}
              <button onClick={() => { setRunError(""); handleRun(); }} style={{ marginLeft: 12, color: t.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>Retry</button>
            </div>
          )}

          {!running && runResult && (
            <div style={{ animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta }}>Results — Run {runCount}</div>
                <button onClick={handleRun} disabled={runsRemaining <= 0} style={{ background: "transparent", color: t.accent, border: `1px solid ${t.accentBorder}`, borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: runsRemaining <= 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {runsRemaining > 0 ? "▶ Run again" : "Limit reached"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {stages.map((stage, i) => (
                  <StageResultBlock key={i} stage={stage} aiOutput={runResult[i]} stageIndex={i} stageTotal={stages.length} />
                ))}
              </div>

              {/* Feedback */}
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>Your feedback</div>
                <div style={{ fontSize: 12, color: t.textSub, marginBottom: 12, lineHeight: 1.6 }}>Share your thoughts on this workflow — what worked, what you'd change, or any questions for the LexOps team.</div>
                <textarea
                  value={feedback}
                  onChange={e => { setFeedback(e.target.value); setFeedbackSaved(false); }}
                  placeholder="What did you think? Were the outputs relevant to your situation? Any gaps or areas to address?"
                  rows={4}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6, borderColor: feedbackSaved && !feedbackChanged ? t.green : t.border, boxShadow: feedbackSaved && !feedbackChanged ? `0 0 0 3px ${t.greenSoft}` : "none", transition: "border-color 0.2s, box-shadow 0.2s" }}
                />
                {feedbackError && <div style={{ color: t.red, fontSize: 12, marginTop: 6 }}>{feedbackError}</div>}
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={handleSaveFeedback} disabled={savingFeedback || !feedback.trim()} style={{ background: feedbackSaved && !feedbackChanged ? t.greenSoft : t.accent, color: feedbackSaved && !feedbackChanged ? t.green : "#fff", border: `1px solid ${feedbackSaved && !feedbackChanged ? t.greenBorder : t.accent}`, borderRadius: 8, padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: savingFeedback || !feedback.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: !feedback.trim() ? 0.5 : 1 }}>
                    {savingFeedback ? "Saving…" : feedbackSaved && !feedbackChanged ? "✓ Feedback saved" : "Save feedback"}
                  </button>
                  <button onClick={() => setStep(1)} style={{ background: "transparent", color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Try again</button>
                </div>
              </div>
            </div>
          )}

          {!running && !runResult && !runError && (
            <div style={{ textAlign: "center", padding: "32px 0", color: t.textMeta, fontSize: 13 }}>
              Waiting to run… <button onClick={handleRun} style={{ color: t.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Start now</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Simple submit/expected tabs (when try-matter is disabled) ────────────────
function SimpleWorkflowTabs({ wf, token }) {
  const [activeTab, setActiveTab] = useState("expected");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const allOutputs = (wf.stages || []).flatMap(s => (s.outputs || []).map(o => ({ ...o, stageTitle: s.title, stageEmoji: s.emoji })));

  function handleFileAdd(e) { setUploadedFiles(prev => [...prev, ...Array.from(e.target.files || [])]); }
  function removeFile(i) { setUploadedFiles(prev => prev.filter((_, j) => j !== i)); }

  const tabStyle = (active) => ({
    padding: "9px 16px", background: "none", border: "none",
    fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 500,
    color: active ? t.accent : t.textSub, cursor: "pointer",
    borderBottom: active ? `2px solid ${t.accent}` : "2px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", background: t.card }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, padding: "0 18px", gap: 4 }}>
        <button style={tabStyle(activeTab === "expected")} onClick={() => setActiveTab("expected")}>Expected documents</button>
        <button style={tabStyle(activeTab === "submit")} onClick={() => setActiveTab("submit")}>Submit documents</button>
      </div>

      {activeTab === "expected" && (
        <div style={{ padding: "18px 20px" }}>
          {allOutputs.length === 0 ? (
            <div style={{ color: t.textMeta, fontSize: 13 }}>No expected outputs defined for this workflow.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allOutputs.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: t.surface, borderRadius: 8, padding: "11px 14px" }}>
                  <span style={{ fontSize: 18 }}>{o.emoji || "✓"}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{o.name}</div>
                    {o.description && <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{o.description}</div>}
                    <div style={{ fontSize: 10, color: t.textMeta, marginTop: 3 }}>{o.stageEmoji} {o.stageTitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "submit" && (
        <div style={{ padding: "18px 20px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.green }}>Documents submitted</div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>The LexOps team has been notified.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: t.textSub, marginBottom: 14, lineHeight: 1.6 }}>Upload any documents relevant to this workflow — reference files, precedent templates, or client data.</div>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileAdd} style={{ display: "none" }} />
              <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${t.border}`, borderRadius: 9, padding: "22px", textAlign: "center", cursor: "pointer", background: t.surface }} onMouseEnter={e => e.currentTarget.style.borderColor = t.accentBorder} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>⬆️</div>
                <div style={{ fontSize: 12, color: t.textSub }}>Click to upload</div>
                <div style={{ fontSize: 10, color: t.textMeta, marginTop: 3 }}>PDF, DOCX, TXT, CSV</div>
              </div>
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {uploadedFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px" }}>
                      <span style={{ fontSize: 14 }}>📎</span>
                      <span style={{ fontSize: 12, flex: 1, color: t.text }}>{f.name}</span>
                      <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMeta, fontSize: 13 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button disabled={submitting || uploadedFiles.length === 0} onClick={() => { setSubmitting(true); setTimeout(() => { setSubmitted(true); setSubmitting(false); }, 800); }} style={{ marginTop: 14, background: uploadedFiles.length === 0 ? t.surface : t.accent, color: uploadedFiles.length === 0 ? t.textMeta : "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: uploadedFiles.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {submitting ? "Submitting…" : "Submit documents"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single workflow block ─────────────────────────────────────────────────────
function WorkflowBlock({ wf, index, totalWorkflows, token, proposal, isFrozen, previewMode, onRefresh }) {
  const [selectedStage, setSelectedStage] = useState(null);
  const stages = wf.stages || [];
  const showTryMatter = wf.show_try_matter === true;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: t.shadow, animation: `fadeUp ${0.3 + index * 0.07}s ease-out` }}>
      {/* Workflow header */}
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "#0B3B3B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
          {wf.emoji || "⚙️"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>Workflow {index + 1}</div>
          <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: wf.name ? t.text : t.textMeta, fontStyle: wf.name ? "normal" : "italic" }}>
            {wf.name || "Workflow name to be completed"}
          </div>
          {stages.length > 0 && <div style={{ fontSize: 11, color: t.textMeta, marginTop: 2 }}>{stages.length} stage{stages.length !== 1 ? "s" : ""}</div>}
        </div>
        {wf.description && (
          <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, margin: 0, maxWidth: 300 }}>{wf.description}</p>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: "18px 18px 0" }}>
        {stages.length > 0 ? (
          <>
            <HorizontalTimeline stages={stages} selectedIndex={selectedStage} onSelect={i => setSelectedStage(i)} />
            <div style={{ fontSize: 11, color: t.textMeta, textAlign: "center", marginTop: 8, marginBottom: 14 }}>Click a step to see inputs, outputs &amp; details</div>
          </>
        ) : (
          <div style={{ padding: "18px 4px 20px" }}>
            <FieldTodo label="Workflow stages to be completed" />
          </div>
        )}
      </div>

      {/* Try matter wizard or simple tabs */}
      {(!isFrozen || previewMode) && (
        <div style={{ padding: "0 18px 18px" }}>
          {showTryMatter ? (
            <TryMatterWizard wf={wf} token={token} proposal={proposal} />
          ) : (
            <SimpleWorkflowTabs wf={wf} token={token} />
          )}
        </div>
      )}

      {/* Stage drawer */}
      {selectedStage !== null && stages[selectedStage] && (
        <StageDrawer
          stage={stages[selectedStage]}
          index={selectedStage}
          total={stages.length}
          onClose={() => setSelectedStage(null)}
          onPrev={() => setSelectedStage(i => Math.max(0, i - 1))}
          onNext={() => setSelectedStage(i => Math.min(stages.length - 1, i + 1))}
        />
      )}
    </div>
  );
}

// ─── V2 client review flow ────────────────────────────────────────────────────
function ClientReviewFlow({ proposal, token, onRefresh, previewMode }) {
  const workflows = proposal.workflows || [];
  const isFrozen = ["feedback_received", "won", "lost", "converted"].includes(proposal.status);
  const painPoints = Array.isArray(proposal.pain_points) ? proposal.pain_points : [];
  const objectives = Array.isArray(proposal.objectives) ? proposal.objectives : [];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Satoshi', sans-serif" }}>
      <style>{`
        @font-face { font-family: 'Satoshi'; src: url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'); }
        ${GLOBAL_CSS}
      `}</style>

      {/* Top bar */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
        <Logo />
        <div style={{ fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, padding: "5px 13px", borderRadius: 20 }}>
          Proposal for {proposal.client_name || proposal.client_email}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 100px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 36, animation: "fadeUp 0.35s ease-out" }}>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: "clamp(24px,4vw,34px)", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.2, color: proposal.name ? t.text : t.textMeta, fontStyle: proposal.name ? "normal" : "italic" }}>
            {proposal.name || "Proposal title to be completed"}
          </h1>
          {proposal.description && (
            <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.75, margin: "0 0 22px", maxWidth: 620 }}>{proposal.description}</p>
          )}

          {/* Pain points + Objectives cards — always shown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: t.shadow }}>
              <Eyebrow label="Challenges we're solving" />
              {painPoints.length > 0 ? painPoints.map((pp, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8, fontSize: 13, color: t.text, lineHeight: 1.55 }}>
                  <span style={{ color: t.accent, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>•</span>
                  {pp}
                </div>
              )) : <FieldTodo label="Pain points to be completed" />}
            </div>
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: t.shadow }}>
              <Eyebrow label="Objectives" />
              {objectives.length > 0 ? objectives.map((obj, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8, fontSize: 13, color: t.text, lineHeight: 1.55 }}>
                  <span style={{ color: t.green, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>→</span>
                  {obj}
                </div>
              )) : <FieldTodo label="Objectives to be completed" />}
            </div>
          </div>
        </div>

        {/* Submitted banner */}
        {isFrozen && (
          <div style={{ background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 14, padding: "22px", marginBottom: 28, display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.green, marginBottom: 4, fontFamily: "'Satoshi', sans-serif" }}>Proposal Submitted</div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>Thank you — your review has been submitted to Lex Ops. We'll be in touch shortly with next steps.</div>
            </div>
          </div>
        )}

        {/* Workflow blocks */}
        {workflows.length > 0 && (
          <>
            <Eyebrow label={workflows.length > 1 ? `${workflows.length} Proposed Workflows` : "Proposed Workflow"} />
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 36 }}>
              {workflows.map((wf, i) => (
                <WorkflowBlock
                  key={wf.id}
                  wf={wf}
                  index={i}
                  totalWorkflows={workflows.length}
                  token={token}
                  proposal={proposal}
                  isFrozen={isFrozen}
                  previewMode={previewMode}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </>
        )}

        {/* Response panel */}
        <SimpleResponsePanel proposal={proposal} token={token} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function ProposalPage({ token, previewMode = false }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "LexOps | Review Your Proposal";
    load();
  }, [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals/v2/by-token/${encodeURIComponent(token)}`);
      if (!res.ok) {
        const { data, error: err } = await supabase.from("proposals").select("*").eq("token", token).single();
        if (err || !data) { setError("Proposal not found or link has expired."); return; }
        setProposal({ ...data, workflows: [] });
        return;
      }
      const data = await res.json();
      setProposal(data);
    } catch {
      setError("Unable to load this proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{GLOBAL_CSS}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <style>{GLOBAL_CSS}</style>
        <Logo />
        <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: t.shadow }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: t.red }}>!</div>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Satoshi', sans-serif" }}>Link Invalid or Expired</h2>
          <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>This proposal link is no longer valid. Please contact your LexOps representative for a new link.</p>
        </div>
        <div style={{ color: t.textMeta, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</div>
      </div>
    );
  }

  if (!proposal) return null;

  if ((proposal.workflows || []).length > 0) {
    return <ClientReviewFlow proposal={proposal} token={token} onRefresh={load} previewMode={previewMode} />;
  }

  return (
    <ProposalViewer
      proposal={proposal}
      footer={<SimpleResponsePanel proposal={proposal} token={token} onRefresh={load} />}
    />
  );
}
