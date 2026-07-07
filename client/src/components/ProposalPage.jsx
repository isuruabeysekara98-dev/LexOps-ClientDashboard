import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ClipboardList, Bookmark, Upload, Paperclip, Clock, AlertTriangle, Target, ArrowRight, ArrowDown, MessageSquare, Sparkles, FileText, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchWithTimeout, withTimeout, useSlowHint } from "@/lib/loadUtils.js";
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
      border: `1.5px dashed ${t.textMeta}`,
      borderRadius: 8, color: t.textMeta,
      fontSize: compact ? 11 : 12, fontStyle: "italic",
      background: t.surface,
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
  @keyframes stepIn { from { opacity:0; transform:translateX(14px) } to { opacity:1; transform:translateX(0) } }
  @keyframes ringPulse { 0%{box-shadow:0 0 0 0 rgba(55,89,113,0.32)} 70%{box-shadow:0 0 0 8px rgba(55,89,113,0)} 100%{box-shadow:0 0 0 0 rgba(55,89,113,0)} }
  @keyframes journeyIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  @keyframes popIn { from { opacity:0; transform:scale(0.85) } to { opacity:1; transform:scale(1) } }
  @keyframes growDown { from { transform:scaleY(0) } to { transform:scaleY(1) } }
  @keyframes shimmer { 0%{opacity:0.45} 50%{opacity:1} 100%{opacity:0.45} }
  html { scroll-behavior: smooth; }
`;

// ─── Full-page thank-you screen (after accept / request changes) ──────────────
function CompletionScreen({ kind }) {
  const accepted = kind === "accepted";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: t.bg, fontFamily: "'Satoshi', sans-serif", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ padding: "15px 24px", borderBottom: `1px solid ${t.border}`, background: t.card }}>
        <Logo />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ maxWidth: 460, textAlign: "center", animation: "fadeUp 0.4s ease-out" }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%", margin: "0 auto 26px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: accepted ? t.greenSoft : t.amberSoft,
            border: `1px solid ${accepted ? t.greenBorder : t.amberBorder}`,
          }}>
            {accepted ? <Check size={36} color={t.green} strokeWidth={2.5} /> : <Clock size={32} color={t.amber} strokeWidth={2} />}
          </div>
          <h1 style={{ margin: "0 0 12px", fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", color: t.text, lineHeight: 1.2 }}>
            {accepted ? "Thank you — proposal accepted" : "Thanks — your request is in"}
          </h1>
          <p style={{ margin: "0 auto", maxWidth: 400, fontSize: 15, color: t.textSub, lineHeight: 1.75 }}>
            {accepted
              ? "Your acceptance has been sent to the LexOps team. We'll be in touch shortly with next steps."
              : "Your change request has been sent to the LexOps team. We'll review your feedback and get back to you shortly."}
          </p>
          <div style={{ marginTop: 30, fontSize: 12, color: t.textMeta }}>You can safely close this page.</div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${t.border}`, padding: "16px 24px", textAlign: "center", color: t.textMeta, fontSize: 11, background: t.card }}>
        © 2026 LexOps · A Teams Squared Company
      </div>
    </div>
  );
}

// ─── Simple response panel ────────────────────────────────────────────────────
function SimpleResponsePanel({ proposal, token, onRefresh, feedbackEntries, previewMode }) {
  // Live feedback from the unified dock (or, if not provided, whatever was saved
  // against each workflow) so the change request carries every note through.
  const savedFeedback = (feedbackEntries || (proposal.workflows || []).map(w => ({ wfName: w.name, text: w.feedback_text || "" })))
    .map(f => ({ name: f.wfName, text: (f.text || "").trim() }))
    .filter(f => f.text);
  // Merge tray notes into whatever's already typed — preserves manual edits AND
  // pulls in feedback added after the change box was first opened ("nothing lost").
  const mergeNote = (prev) => {
    let next = prev || "";
    savedFeedback.forEach(f => {
      if (!next.includes(f.text)) {
        const line = `${f.name ? f.name + " — " : ""}${f.text}`;
        next = next.trim() ? `${next.trim()}\n\n${line}` : line;
      }
    });
    return next;
  };
  const [mode, setMode] = useState("idle");
  const [signerName, setSignerName] = useState("");
  const [changeNote, setChangeNote] = useState(mergeNote(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const status = proposal.status;
  const isFrozen = ["accepted", "feedback_received", "won", "lost", "converted"].includes(status);

  // Just completed this session → full-page thank-you screen.
  if (mode === "done-accept") return <CompletionScreen kind="accepted" />;
  if (mode === "done-request") return <CompletionScreen kind="changes" />;

  // Returning to an already-frozen proposal → status-appropriate acknowledgement.
  if (isFrozen && !previewMode) {
    const isChanges = status === "feedback_received";
    const isLost = status === "lost";
    const label = isChanges ? "Feedback received" : isLost ? "Proposal closed" : "Proposal accepted";
    const msg = isChanges
      ? "Thank you — your feedback has been sent to the LexOps team. We'll review it and get back to you shortly."
      : isLost
        ? "This proposal is now closed. Please contact your LexOps representative with any questions."
        : "Thank you — your acceptance has been sent to the LexOps team. We'll be in touch shortly.";
    const accent = isChanges ? t.amber : isLost ? t.textSub : t.green;
    const soft = isChanges ? t.amberSoft : isLost ? t.surface : t.greenSoft;
    const bord = isChanges ? t.amberBorder : isLost ? t.border : t.greenBorder;
    return (
      <div style={{ background: soft, border: `1px solid ${bord}`, borderRadius: 14, padding: "24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "#fff", border: `1px solid ${bord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{isChanges ? <MessageSquare size={19} color={accent} strokeWidth={2} /> : <Check size={20} color={accent} strokeWidth={2.5} />}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 5, fontFamily: "'Satoshi', sans-serif" }}>{label}</div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>{msg}</div>
        </div>
      </div>
    );
  }

  async function handleAccept() {
    if (previewMode) { setError("Preview mode — accepting is disabled here."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, signer_name: signerName.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); setSubmitting(false); return; }
      // Show the thank-you screen. Do NOT trigger a parent reload here — that would
      // flip the page to a spinner and unmount this screen before it paints.
      setMode("done-accept");
    } catch { setError("Connection error — please try again."); setSubmitting(false); }
  }

  async function handleRequestChanges() {
    if (previewMode) { setError("Preview mode — sending changes is disabled here."); return; }
    if (!changeNote.trim()) { setError("Please describe what you'd like changed."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/request-changes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, note: changeNote.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); setSubmitting(false); return; }
      setMode("done-request");
    } catch { setError("Connection error — please try again."); setSubmitting(false); }
  }

  return (
    <div style={{ background: t.card, border: `1px solid ${t.accentBorder}`, borderRadius: 14, overflow: "hidden", boxShadow: t.shadowMd }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, background: t.accentLight, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: t.card, border: `1px solid ${t.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ClipboardList size={18} color={t.accent} strokeWidth={2} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Satoshi', sans-serif" }}>Ready to respond?</div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 1 }}>Accept this proposal or let us know what you'd like changed.</div>
        </div>
      </div>
      <div style={{ padding: "22px 22px" }}>
        {error && <div style={{ background: t.redSoft, border: "1px solid rgba(201,84,46,0.25)", borderRadius: 7, padding: "9px 12px", color: t.red, fontSize: 12, marginBottom: 14 }}>{error}</div>}
        {mode === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setMode("accepting")} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = t.accentHover} onMouseLeave={e => e.currentTarget.style.background = t.accent}>
              <Check size={16} strokeWidth={3} /> Accept this proposal
            </button>
            <button onClick={() => { setMode("requesting"); setChangeNote(mergeNote); }} style={{ background: "transparent", color: t.text, border: `1px solid rgba(0,0,0,0.2)`, borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = t.text; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.text; }}>
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
            {savedFeedback.length > 0 && (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 13px", fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600, color: t.text }}>Your feedback tray is included below.</span> Every note you collected while reviewing has been carried in — edit or add to it before sending.
              </div>
            )}
            <div>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>What would you like changed?</label>
              <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Describe what you'd like LexOps to revise or clarify…" rows={savedFeedback.length > 0 ? 6 : 4} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} autoFocus />
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

const MAX_STAGE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const RUN_CAP = 10; // mirrors server RUN_CAP in proposalsV2.ts — keep in sync

// Does this stage plausibly call for client documents?
function stageDocSignal(stage) {
  const inputs = stage.inputs || [];
  if (inputs.length === 0) return "none"; // nothing needed from the client here
  const blob = inputs.map(i => `${i.name || ""} ${i.label || ""} ${i.description || ""} ${i.detail || ""}`).join(" ");
  return /document|file|upload|attach|evidence|contract|letter|form|certificate|statement|report|invoice|record|agreement|deed|passport|licen[cs]e|policy|deck|spreadsheet|filing/i.test(blob)
    ? "required" // inputs explicitly reference documents
    : "optional"; // inputs exist but may be answered without a file
}

// ─── Contextual, inline document uploader (controlled — parent owns files) ─────
// Files + updates flow through the parent so uploads survive stage navigation and
// the progress counters never revert. `onFilesChange(stageIndex, kind, nextFiles)`.
function DocumentUpload({ proposalId, token, wfId, stageIndex, files, onFilesChange, signal, kind = "submitted", title, subtitle, previewMode }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const list = files || [];

  async function handleUpload(fileList) {
    const picked = Array.from(fileList || []);
    if (!picked.length || !proposalId || !token) return;
    if (previewMode) { setErr("Preview mode — uploads are disabled here."); return; }
    const oversized = picked.filter(f => f.size > MAX_STAGE_FILE_BYTES);
    if (oversized.length) {
      setErr(`File${oversized.length > 1 ? "s" : ""} exceed the 10 MB limit: ${oversized.map(f => f.name).join(", ")}`);
      return;
    }
    setUploading(true); setErr("");
    const done = [];
    for (const file of picked) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      if (wfId) fd.append("workflow_id", wfId);
      fd.append("stage_index", String(stageIndex));
      fd.append("kind", kind);
      try {
        const res = await fetch(`/api/proposals/v2/${proposalId}/client-files`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setErr(data.message || "Upload failed — please try again."); continue; }
        done.push({ id: data.file?.id, name: data.file?.file_name || file.name, url: data.file?.file_url });
      } catch { setErr("Connection error — please check your network and try again."); }
    }
    if (done.length) onFilesChange?.(stageIndex, kind, [...list, ...done]);
    setUploading(false);
  }

  function removeFile(i) {
    const f = list[i];
    onFilesChange?.(stageIndex, kind, list.filter((_, j) => j !== i));
    if (f?.id && proposalId && token && !previewMode) {
      fetch(`/api/proposals/v2/${proposalId}/client-files/${f.id}?token=${encodeURIComponent(token)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  const required = signal === "required";
  const accentBg = required ? "rgba(55,89,113,0.06)" : t.surface;
  const accentBorder = required ? "rgba(55,89,113,0.24)" : t.border;

  return (
    <div style={{ background: accentBg, border: `1.5px ${required ? "solid" : "dashed"} ${accentBorder}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: required ? t.accent : t.card, border: required ? "none" : `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Upload size={16} color={required ? "#FFFFFF" : t.accent} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{title || (required ? "Upload the documents this stage needs" : "Add supporting documents (optional)")}</div>
          <div style={{ fontSize: 11, color: t.textMeta, marginTop: 1 }}>{subtitle || "We'll refine them and return another round of comments"}</div>
        </div>
        {list.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: t.green, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} strokeWidth={3} /> {list.length}
          </span>
        )}
      </div>

      {err && (
        <div style={{ background: t.redSoft, border: "1px solid rgba(201,84,46,0.25)", borderRadius: 8, padding: "9px 13px", color: t.red, fontSize: 12, marginBottom: 12 }}>
          {err}
          <button onClick={() => setErr("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600, textDecoration: "underline", fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {list.map((f, i) => (
            <div key={f.id || i} style={{ display: "flex", alignItems: "center", gap: 9, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 8, padding: "8px 12px" }}>
              <Paperclip size={14} color={t.green} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {f.url
                ? <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, flex: 1, color: t.green, textDecoration: "none", fontWeight: 500 }}>{f.name}</a>
                : <span style={{ fontSize: 12, flex: 1, color: t.green, fontWeight: 500 }}>{f.name}</span>}
              <span style={{ fontSize: 10, color: t.green, fontWeight: 700, marginRight: 4 }}>✓ Uploaded</span>
              <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMeta, fontSize: 13, padding: 2 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.rtf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
      <button
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        disabled={uploading}
        aria-label={list.length > 0 ? "Upload more documents" : (title || "Upload documents")}
        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", justifyContent: "center", background: uploading ? t.border : (required ? t.accent : "transparent"), color: uploading ? t.textMeta : (required ? "#FFFFFF" : t.accent), border: required ? "none" : `1px solid ${t.accentBorder}`, borderRadius: 9, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s, opacity 0.15s" }}
      >
        {uploading ? (
          <><div style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.15)", borderTop: `2px solid ${t.textSub}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} /> Uploading…</>
        ) : (
          <><Upload size={16} strokeWidth={2} /> {list.length > 0 ? "Upload more documents" : "Upload documents"}</>
        )}
      </button>
      <div style={{ fontSize: 11, color: t.textMeta, textAlign: "center", marginTop: 7 }}>PDF, DOCX, TXT, CSV, XLSX, images — up to 10 MB each</div>
    </div>
  );
}

// ─── Numbered narrative section header ────────────────────────────────────────
function SectionHeader({ index, title, subtitle, id }) {
  return (
    <div id={id} style={{ display: "flex", gap: 16, alignItems: "flex-start", margin: "0 0 20px", scrollMarginTop: 90 }}>
      <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 34, fontWeight: 700, lineHeight: 1, color: "transparent", WebkitTextStroke: `1.2px ${t.accent}`, flexShrink: 0, paddingTop: 2, userSelect: "none" }}>{index}</div>
      <div>
        <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em", color: t.text, margin: "0 0 4px", lineHeight: 1.25 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Story hero: the pain → objective journey ─────────────────────────────────
function StoryHero({ proposal, painPoints, objectives, workflows, tryEnabled }) {
  const stageCount = workflows.reduce((acc, wf) => acc + (wf.stages?.length || 0), 0);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ marginBottom: 48, animation: "fadeUp 0.35s ease-out" }}>
      <Eyebrow label={`Prepared for ${proposal.client_name || proposal.client_email || "you"}`} />
      <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: "clamp(26px,4.5vw,38px)", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.15, color: proposal.name ? t.text : t.textMeta, fontStyle: proposal.name ? "normal" : "italic" }}>
        {proposal.name || "Proposal title to be completed"}
      </h1>
      {proposal.description && (
        <p style={{ color: t.textSub, fontSize: 15, lineHeight: 1.75, margin: "0 0 26px", maxWidth: 640 }}>{proposal.description}</p>
      )}

      {/* The journey: where you are → where we'll take you */}
      <div className="hero-journey" style={{ display: "grid", gridTemplateColumns: "1fr 56px 1fr", gap: 0, alignItems: "stretch", marginBottom: 22 }}>
        {/* Today */}
        <div style={{ background: t.card, border: `1px solid ${t.amberBorder}`, borderRadius: 14, padding: "20px 22px", boxShadow: t.shadow, animation: "journeyIn 0.45s ease-out both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: t.amberSoft, border: `1px solid ${t.amberBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AlertTriangle size={15} color={t.amber} strokeWidth={2} /></div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: t.amber }}>Where you are today</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>The challenges holding you back</div>
            </div>
          </div>
          {painPoints.length > 0 ? painPoints.map((pp, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: i === 0 ? 16.5 : 14.5, fontWeight: i === 0 ? 600 : 500, color: t.text, lineHeight: 1.5, animation: `journeyIn 0.4s ${0.12 + i * 0.09}s ease-out both` }}>
              <span style={{ width: 21, height: 21, borderRadius: "50%", background: t.amberSoft, border: `1px solid ${t.amberBorder}`, color: t.amber, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
              {pp}
            </div>
          )) : <FieldTodo label="Pain points to be completed" />}
        </div>

        {/* Bridge arrow */}
        <div className="hero-bridge" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: t.shadowMd, animation: "popIn 0.4s 0.3s ease-out both" }}>
            <ArrowRight size={16} color="#fff" strokeWidth={2.5} className="hero-bridge-arrow" />
          </div>
        </div>

        {/* With LexOps */}
        <div style={{ background: t.card, border: `1px solid ${t.greenBorder}`, borderRadius: 14, padding: "20px 22px", boxShadow: t.shadow, animation: "journeyIn 0.45s 0.15s ease-out both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Target size={15} color={t.green} strokeWidth={2} /></div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: t.green }}>Where we'll take you</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>What this proposal delivers</div>
            </div>
          </div>
          {objectives.length > 0 ? objectives.map((obj, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: i === 0 ? 16.5 : 14.5, fontWeight: i === 0 ? 600 : 500, color: t.text, lineHeight: 1.5, animation: `journeyIn 0.4s ${0.25 + i * 0.09}s ease-out both` }}>
              <span style={{ width: 21, height: 21, borderRadius: "50%", background: t.greenSoft, border: `1px solid ${t.greenBorder}`, color: t.green, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}><Check size={12} strokeWidth={3} /></span>
              {obj}
            </div>
          )) : <FieldTodo label="Objectives to be completed" />}
        </div>
      </div>

      {/* Journey map + CTAs */}
      <div style={{ background: "linear-gradient(135deg, rgba(55,89,113,0.05), rgba(55,89,113,0.02))", border: `1px solid ${t.accentBorder}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", animation: "journeyIn 0.45s 0.3s ease-out both" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 3 }}>Your review, in {tryEnabled ? "three" : "two"} short steps</div>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>
            See how the workflow works{tryEnabled ? ", run it on your own case," : ""} then tell us what to refine — it takes about 10 minutes.
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button onClick={() => jump("section-workflow")} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = t.accentHover} onMouseLeave={e => e.currentTarget.style.background = t.accent}>
            See how it works <ArrowDown size={14} strokeWidth={2.5} />
          </button>
          {tryEnabled && (
            <button onClick={() => jump("section-try")} style={{ background: "#fff", color: t.accent, border: `1px solid ${t.accentBorder}`, borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Sparkles size={14} strokeWidth={2} /> Try your own case
            </button>
          )}
        </div>
      </div>

      {/* Proof strip */}
      <div style={{ display: "flex", gap: 22, marginTop: 18, flexWrap: "wrap" }}>
        {[
          { v: painPoints.length, l: `challenge${painPoints.length !== 1 ? "s" : ""} addressed` },
          { v: objectives.length, l: `objective${objectives.length !== 1 ? "s" : ""} delivered` },
          { v: workflows.length, l: `workflow${workflows.length !== 1 ? "s" : ""}` },
          { v: stageCount, l: `stage${stageCount !== 1 ? "s" : ""} end-to-end` },
        ].filter(s => s.v > 0).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 7, animation: `journeyIn 0.4s ${0.35 + i * 0.08}s ease-out both` }}>
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 22, fontWeight: 700, color: t.accent, letterSpacing: "-0.03em" }}>{s.v}</span>
            <span style={{ fontSize: 12, color: t.textSub }}>{s.l}</span>
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 640px){ .hero-journey{ grid-template-columns: 1fr !important; } .hero-bridge{ padding: 10px 0; } .hero-bridge-arrow{ transform: rotate(90deg); } }`}</style>
    </div>
  );
}

// ─── Visual, interactive AI-run output flow ───────────────────────────────────
function RunFlowVisualizer({ stages, runResult, running, proposalId, token, wfId, onAddFeedback, previewMode }) {
  const [selected, setSelected] = useState(0);
  const [revealed, setRevealed] = useState(running ? 0 : stages.length);
  const [copied, setCopied] = useState(false);
  const [caseFiles, setCaseFiles] = useState({}); // stageIndex -> real-case docs for this run

  // Hydrate real-case uploads so they persist across refresh (same "submitted"
  // bucket as the walkthrough, keyed by workflow + stage).
  useEffect(() => {
    if (!proposalId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposals/v2/${proposalId}/client-files?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data.files)) return;
        const byStage = {};
        data.files
          .filter(f => f.workflow_id === wfId && f.kind === "submitted" && f.stage_index != null)
          .forEach(f => { (byStage[f.stage_index] = byStage[f.stage_index] || []).push({ id: f.id, name: f.file_name, url: f.file_url }); });
        if (!cancelled) setCaseFiles(byStage);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [proposalId, token, wfId]);

  // While running: light nodes up one by one so the client watches their case
  // move through the pipeline. When the result lands, sweep the rest to done and
  // focus the first stage (so "Run again" never leaves a stale selection).
  useEffect(() => {
    if (running) {
      setRevealed(0);
      const id = setInterval(() => setRevealed(r => (r < stages.length - 1 ? r + 1 : r)), 1100);
      return () => clearInterval(id);
    }
    if (runResult) {
      setSelected(0);
      setRevealed(0);
      let n = 0;
      const id = setInterval(() => {
        n += 1;
        setRevealed(n);
        if (n >= stages.length) clearInterval(id);
      }, 160);
      return () => clearInterval(id);
    }
    setRevealed(0);
  }, [running, runResult, stages.length]);

  // Server keys outputs by stage_index; match on it (fall back to position) so a
  // skipped stage can't misalign every subsequent output.
  const output = (runResult || []).find(o => o && o.stage_index === selected) || runResult?.[selected];
  const outputText = (output?.content || "").replace(/\*\*(.*?)\*\*/g, "$1");

  function copyOutput() {
    navigator.clipboard?.writeText(outputText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="rfv-grid" style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: 0, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", background: t.card }}>
      {/* Pipeline rail */}
      <div style={{ borderRight: `1px solid ${t.border}`, background: t.bg, padding: "16px 12px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, margin: "0 0 12px 6px" }}>
          {running ? "Processing your case…" : "Your case, stage by stage"}
        </div>
        {stages.map((s, i) => {
          const done = !running && runResult && i < revealed;
          const inFlight = running && i === revealed;
          const pending = (running && i > revealed) || (!runResult && !running);
          const isSel = !running && runResult && selected === i;
          return (
            <button key={i} onClick={() => { if (done) setSelected(i); }} style={{ position: "relative", width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start", background: isSel ? t.accentLight : "none", border: "none", borderRadius: 9, padding: "8px 8px", cursor: done ? "pointer" : "default", fontFamily: "inherit", marginBottom: 2 }}>
              {i < stages.length - 1 && <span style={{ position: "absolute", left: 19, top: 30, bottom: -4, width: 2, background: done ? t.green : t.border, transformOrigin: "top", animation: done ? "growDown 0.4s ease-out" : "none", transition: "background 0.3s" }} />}
              <span style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, zIndex: 1, fontSize: 10.5, fontWeight: 800,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: done ? t.green : inFlight ? t.amber : "#fff",
                color: done || inFlight ? "#fff" : t.textMeta,
                border: done || inFlight ? "none" : `1.5px solid ${t.border}`,
                animation: inFlight ? "shimmer 1.1s ease-in-out infinite" : done ? "popIn 0.3s ease-out" : "none",
              }}>
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ minWidth: 0, paddingTop: 3 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? t.accent : pending ? t.textMeta : t.text, lineHeight: 1.35 }}>{s.emoji} {s.title || `Stage ${i + 1}`}</span>
                <span style={{ display: "block", fontSize: 10, marginTop: 2, fontWeight: 600, color: done ? t.green : inFlight ? t.amber : t.textMeta }}>
                  {done ? "✓ Generated" : inFlight ? "Generating…" : "Queued"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Output panel */}
      <div style={{ padding: "18px 20px", minHeight: 260 }}>
        {running ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: "30px 0" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: t.amber, animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 4 }}>Running your case through the workflow</div>
              <div style={{ fontSize: 12, color: t.textMeta }}>Each stage lights up as it completes — usually under a minute.</div>
            </div>
          </div>
        ) : runResult && stages[selected] ? (
          <div key={selected} style={{ animation: "stepIn 0.25s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#232A34", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{stages[selected].emoji || "📋"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stage {selected + 1} of {stages.length} — output for your case</div>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 15, fontWeight: 700, color: t.text }}>{stages[selected].title}</div>
              </div>
              <button onClick={copyOutput} title="Copy this output" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: copied ? t.green : t.textSub, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                {copied ? <><Check size={12} strokeWidth={3} /> Copied</> : <><Copy size={12} strokeWidth={2} /> Copy</>}
              </button>
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: t.text, lineHeight: 1.78, whiteSpace: "pre-wrap", maxHeight: 340, overflowY: "auto", marginBottom: 14 }}>
              {outputText || <span style={{ color: t.textMeta, fontStyle: "italic" }}>No output generated for this stage.</span>}
            </div>

            {/* Per-stage actions: react to THIS output */}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => onAddFeedback?.(`Stage ${selected + 1} (${stages[selected].title || "this stage"}): `)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.accentLight, color: t.accent, border: `1px solid ${t.accentBorder}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <MessageSquare size={13} strokeWidth={2} /> Give feedback on this stage
              </button>
              <button onClick={() => setSelected(s => Math.min(stages.length - 1, s + 1))} disabled={selected === stages.length - 1} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: selected === stages.length - 1 ? t.textMeta : t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: selected === stages.length - 1 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: selected === stages.length - 1 ? 0.5 : 1 }}>
                Next stage <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>

            {/* Upload real documents from the client's case for this stage */}
            {proposalId && token && (
              <DocumentUpload
                proposalId={proposalId} token={token} wfId={wfId} stageIndex={selected}
                files={caseFiles[selected] || []} onFilesChange={(idx, kind, next) => setCaseFiles(m => ({ ...m, [idx]: next }))}
                signal="optional" kind="submitted" previewMode={previewMode}
                title="Upload documents from your real case"
                subtitle="Share the actual files for this stage — we'll run the refined workflow on them"
              />
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textMeta, fontSize: 13, padding: "40px 0" }}>
            Run your case to see each stage's output here.
          </div>
        )}
      </div>
      <style>{`@media (max-width: 640px){ .rfv-grid{ grid-template-columns: 1fr !important; } .rfv-grid > div:first-child{ border-right: none !important; border-bottom: 1px solid ${t.border}; } }`}</style>
    </div>
  );
}

// ─── Unified feedback dock — one place for all feedback ───────────────────────
function FeedbackDock({ entries, onChangeText, onSave, open, setOpen, frozen }) {
  const count = entries.filter(e => e.text.trim()).length;
  if (frozen) return null;

  return (
    <>
      {/* Collapsed pill */}
      {!open && (
        <button onClick={() => setOpen(true)} style={{ position: "fixed", right: 22, bottom: 22, zIndex: 260, display: "inline-flex", alignItems: "center", gap: 8, background: t.text, color: "#fff", border: "none", borderRadius: 30, padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi', sans-serif", boxShadow: t.shadowLg, animation: "popIn 0.3s ease-out" }}>
          <MessageSquare size={15} strokeWidth={2} />
          Your feedback{count > 0 && <span style={{ background: t.accent, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>}
        </button>
      )}

      {/* Expanded dock */}
      {open && (
        <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 260, width: "min(400px, calc(100vw - 44px))", background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadowLg, overflow: "hidden", animation: "fadeUp 0.25s ease-out" }}>
          <div style={{ padding: "14px 18px", background: t.text, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquare size={15} strokeWidth={2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Satoshi', sans-serif" }}>Your feedback</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Collected as you review — included when you respond</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 7, width: 26, height: 26, color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ padding: "14px 18px", maxHeight: "min(380px, 50vh)", overflowY: "auto" }}>
            {entries.map((e, i) => (
              <div key={e.wfId} style={{ marginBottom: i < entries.length - 1 ? 14 : 0 }}>
                {entries.length > 1 && <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMeta, marginBottom: 6 }}>{e.wfName}</div>}
                <textarea
                  id={`fb-dock-${e.wfId}`}
                  value={e.text}
                  onChange={ev => onChangeText(e.wfId, ev.target.value)}
                  placeholder="What would you change, add, or clarify? Every note lands with the LexOps team…"
                  rows={entries.length > 1 ? 3 : 5}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6, fontSize: 13 }}
                />
                {(() => {
                  const dirty = e.text.trim() !== e.savedText.trim();
                  const clearing = dirty && !e.text.trim() && e.savedText.trim();
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
                      <button onClick={() => onSave(e.wfId)} disabled={e.saving || !dirty} style={{ background: dirty ? t.accent : t.surface, color: dirty ? "#fff" : t.textMeta, border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: e.saving || !dirty ? "default" : "pointer", fontFamily: "inherit" }}>
                        {e.saving ? "Saving…" : clearing ? "Clear" : !dirty && e.savedText.trim() ? "✓ Saved" : "Save"}
                      </button>
                      {e.error && <span style={{ fontSize: 11, color: t.red }}>{e.error}</span>}
                      {!e.error && !dirty && e.savedText.trim() && <span style={{ fontSize: 11, color: t.green }}>Shared with LexOps — also included if you request changes.</span>}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Guided, step-by-step workflow walkthrough ────────────────────────────────
function GuidedWorkflow({ stages, wfId, proposalId, token, frozen, previewMode }) {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const [filesByStage, setFilesByStage] = useState({});     // stageIndex -> "submitted" case docs
  const [expectedByStage, setExpectedByStage] = useState({}); // stageIndex -> "expected" templates
  const panelRef = useRef(null);

  // Load previously uploaded files once; live edits are then owned here so uploads
  // persist across stage navigation and the counters never revert.
  useEffect(() => {
    if (!proposalId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposals/v2/${proposalId}/client-files?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data.files)) return;
        const byStage = {}; const expByStage = {};
        data.files
          .filter(f => f.workflow_id === wfId && f.stage_index != null)
          .forEach(f => {
            const bucket = f.kind === "expected" ? expByStage : byStage;
            (bucket[f.stage_index] = bucket[f.stage_index] || []).push({ id: f.id, name: f.file_name, url: f.file_url });
          });
        if (!cancelled) { setFilesByStage(byStage); setExpectedByStage(expByStage); }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [proposalId, token, wfId]);

  function handleFilesChange(stageIndex, kind, nextFiles) {
    if (kind === "expected") setExpectedByStage(m => ({ ...m, [stageIndex]: nextFiles }));
    else setFilesByStage(m => ({ ...m, [stageIndex]: nextFiles }));
  }

  if (!stages || stages.length === 0) {
    return <div style={{ padding: "18px 4px 4px" }}><FieldTodo label="Workflow stages to be completed" /></div>;
  }

  const total = stages.length;
  const canUpload = !!proposalId && !!token && !frozen;
  const submittedCount = (i) => (filesByStage[i]?.length || 0);
  const expectedCount = (i) => (expectedByStage[i]?.length || 0);
  const requiredStages = stages.map((s, i) => ({ i, sig: stageDocSignal(s) })).filter(x => x.sig === "required");
  const requiredDone = requiredStages.filter(x => submittedCount(x.i) > 0).length;
  const templatesShared = stages.reduce((n, _, i) => n + expectedCount(i), 0);

  function go(i) { setActive(Math.max(0, Math.min(total - 1, i))); panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }); }

  // ── Intro state: overview + the walkthrough call to action ──────────────────
  if (!started) {
    return (
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "22px 22px 24px", boxShadow: t.shadow }}>
        <Eyebrow label={`${total} stage${total !== 1 ? "s" : ""} · step by step`} />
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: "-0.01em", marginBottom: 6 }}>See how we'd handle your case</div>
        <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, marginBottom: 18, maxWidth: 560 }}>
          Walk the workflow one stage at a time. At each step you'll see exactly what we need from you, what you'll get back — and you can upload documents and templates right there so we're aligned from day one.
        </div>
        {/* Stage mini-map */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "5px 12px 5px 8px" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#232A34", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5 }}>{s.emoji || "📋"}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.title ? t.text : t.textMeta, fontStyle: s.title ? "normal" : "italic", whiteSpace: "nowrap" }}>{s.title || "Stage"}</span>
              </div>
              {i < total - 1 && <span style={{ color: t.textMeta, fontSize: 12 }}>→</span>}
            </div>
          ))}
        </div>
        <button
          onClick={() => setStarted(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, background: t.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: t.shadow, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = t.accentHover}
          onMouseLeave={e => e.currentTarget.style.background = t.accent}
        >
          Walk through the workflow <span style={{ fontSize: 16 }}>→</span>
        </button>
        {requiredStages.length > 0 && (
          <div style={{ fontSize: 11.5, color: t.textMeta, marginTop: 12 }}>
            {requiredStages.length} stage{requiredStages.length !== 1 ? "s" : ""} will ask you to upload documents.
          </div>
        )}
      </div>
    );
  }

  const stage = stages[active];
  const sig = stageDocSignal(stage);
  const stats = stage.stats || [];
  const inputs = stage.inputs || [];
  const outputs = stage.outputs || [];
  const pct = Math.round(((active + 1) / total) * 100);
  const allReady = requiredStages.length > 0 && requiredDone === requiredStages.length;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow, overflow: "hidden" }}>
      {/* Progress header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>Step {active + 1} of {total}</div>
          <div style={{ height: 5, borderRadius: 3, background: t.surface, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: t.accent, borderRadius: 3, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {requiredStages.length > 0 && (
            <div style={{ fontSize: 11.5, color: allReady ? t.green : t.textMeta, fontWeight: 600, background: allReady ? t.greenSoft : t.surface, border: `1px solid ${allReady ? t.greenBorder : t.border}`, borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap" }}>
              {requiredDone} / {requiredStages.length} doc stages ready
            </div>
          )}
          {templatesShared > 0 && (
            <div style={{ fontSize: 11.5, color: t.green, fontWeight: 600, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Check size={12} strokeWidth={3} /> {templatesShared} template{templatesShared !== 1 ? "s" : ""} shared
            </div>
          )}
        </div>
      </div>

      {/* Mobile stepper strip (rail is desktop-only) */}
      <div className="gw-mobilebar" style={{ display: "none", gap: 6, overflowX: "auto", padding: "12px 14px", borderBottom: `1px solid ${t.border}`, WebkitOverflowScrolling: "touch" }}>
        {stages.map((s, i) => {
          const isActive = i === active; const uploaded = submittedCount(i) > 0;
          return (
            <button key={i} onClick={() => go(i)} aria-current={isActive ? "step" : undefined} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, background: isActive ? t.accent : uploaded ? t.greenSoft : t.surface, color: isActive ? "#fff" : uploaded ? t.green : t.textSub, border: `1px solid ${isActive ? t.accent : uploaded ? t.greenBorder : t.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", minHeight: 36 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: isActive ? "rgba(255,255,255,0.22)" : uploaded ? t.green : "#fff", color: isActive ? "#fff" : uploaded ? "#fff" : t.textSub, fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: isActive || uploaded ? "none" : `1px solid ${t.border}` }}>{uploaded ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
              {s.title || `Stage ${i + 1}`}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* ── Progress rail (desktop) ── */}
        <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${t.border}`, padding: "14px 10px", background: t.bg, position: "relative" }} className="gw-rail">
          {stages.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            const uploaded = submittedCount(i) > 0;
            const rowSig = stageDocSignal(s);
            return (
              <button key={i} onClick={() => go(i)} aria-current={isActive ? "step" : undefined} style={{ position: "relative", width: "100%", textAlign: "left", background: isActive ? t.accentLight : "none", border: "none", borderRadius: 9, padding: "9px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 2, transition: "background 0.15s" }}>
                {/* connector line */}
                {i < total - 1 && <span style={{ position: "absolute", left: 23, top: 30, bottom: -2, width: 2, background: isDone ? t.accent : t.border, transition: "background 0.3s" }} />}
                <span style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  background: isActive ? t.accent : isDone ? t.accent : uploaded ? t.green : "#fff",
                  color: (isActive || isDone || uploaded) ? "#fff" : t.textSub,
                  border: (isActive || isDone || uploaded) ? "none" : `1.5px solid ${t.border}`,
                  animation: isActive ? "ringPulse 1.8s ease-out infinite" : "none",
                  transition: "background 0.2s",
                }}>
                  {isDone || uploaded ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span style={{ minWidth: 0, paddingTop: 1 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: isActive ? 700 : 500, color: isActive ? t.accent : t.text, lineHeight: 1.35 }}>{s.title || `Stage ${i + 1}`}</span>
                  {rowSig === "required" && (
                    <span style={{ display: "inline-block", marginTop: 4, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: uploaded ? t.green : t.accent, background: uploaded ? t.greenSoft : t.accentLight, borderRadius: 5, padding: "2px 6px" }}>
                      {uploaded ? "Docs added" : "Docs needed"}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Active step panel ── */}
        <div ref={panelRef} key={active} style={{ flex: 1, minWidth: 0, padding: "22px 24px", animation: "stepIn 0.28s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: "#232A34", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23 }}>{stage.emoji || "📋"}</div>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>Stage {active + 1}</div>
              <h3 style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 20, fontWeight: 700, color: stage.title ? t.text : t.textMeta, fontStyle: stage.title ? "normal" : "italic", margin: 0, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{stage.title || "Stage title to be completed"}</h3>
            </div>
          </div>

          {/* description + stats */}
          <div style={{ background: "rgba(55,89,113,0.05)", border: `1px solid rgba(55,89,113,0.12)`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
            {stage.description ? (
              <p style={{ fontSize: 13.5, color: t.textSub, lineHeight: 1.72, margin: stats.length ? "0 0 16px" : 0 }}>{stage.description}</p>
            ) : (
              <div style={{ marginBottom: stats.length ? 12 : 0 }}><FieldTodo label="Stage description to be completed" /></div>
            )}
            {stats.length > 0 && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 21, fontWeight: 800, color: t.accent, letterSpacing: "-0.03em" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* inputs — what we need */}
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: t.text, margin: "0 0 10px", letterSpacing: "-0.01em" }}>What we need from you</h4>
            {inputs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {inputs.map((item, i) => (
                  <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 15px", display: "flex", gap: 13, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{item.emoji || "📋"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{item.name || item.label || <FieldTodo compact />}</div>
                      {(item.description || item.detail) && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>{item.description || item.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: t.textMeta, fontStyle: "italic", padding: "2px 0" }}>Nothing required from you at this stage — we handle it.</div>
            )}
          </div>

          {/* contextual upload — the client's real case documents for this stage */}
          {canUpload && sig !== "none" && (
            <div style={{ marginBottom: 20 }}>
              <DocumentUpload proposalId={proposalId} token={token} wfId={wfId} stageIndex={active} files={filesByStage[active] || []} onFilesChange={handleFilesChange} signal={sig} kind="submitted" previewMode={previewMode} />
            </div>
          )}

          {/* outputs — what you get */}
          <div style={{ marginBottom: 22 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: t.green, margin: "0 0 10px", letterSpacing: "-0.01em" }}>What you'll get back</h4>
            {outputs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {outputs.map((item, i) => (
                  <div key={i} style={{ background: "rgba(60,122,82,0.04)", border: `1px solid ${t.greenBorder}`, borderRadius: 10, padding: "12px 15px", display: "flex", gap: 13, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{item.emoji || "✓"}</span>
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

            {/* Alignment CTA — show us what good looks like (only where there's an output to match) */}
            {canUpload && outputs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <DocumentUpload
                  proposalId={proposalId} token={token} wfId={wfId} stageIndex={active}
                  files={expectedByStage[active] || []} onFilesChange={handleFilesChange} signal="required" kind="expected" previewMode={previewMode}
                  title="Show us what good looks like"
                  subtitle="Upload your current template or a past example of this output — we'll match your format exactly"
                />
              </div>
            )}
          </div>

          {/* nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
            <button onClick={() => go(active - 1)} disabled={active === 0} style={{ background: "transparent", color: active === 0 ? t.textMeta : t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: active === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: active === 0 ? 0.5 : 1 }}>← Previous</button>
            {active < total - 1 ? (
              <button onClick={() => go(active + 1)} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Next stage →</button>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.green, fontWeight: 600 }}>
                <Check size={15} strokeWidth={3} /> You've reached the final stage
              </div>
            )}
          </div>

          {/* final-step hand-off */}
          {active === total - 1 && (
            <div style={{ marginTop: 16, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 12, padding: "14px 16px", fontSize: 12.5, color: t.textSub, lineHeight: 1.6 }}>
              {requiredStages.length > 0
                ? <>You've uploaded documents for <strong style={{ color: t.green }}>{requiredDone} of {requiredStages.length}</strong> stages that need them. When you're ready, use <strong style={{ color: t.text }}>Accept</strong> or <strong style={{ color: t.text }}>Request changes</strong> below to send everything back for another round of comments.</>
                : <>That's the full workflow. Use <strong style={{ color: t.text }}>Accept</strong> or <strong style={{ color: t.text }}>Request changes</strong> below to respond.</>}
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 640px){ .gw-rail{ display:none !important; } .gw-mobilebar{ display:flex !important; } }`}</style>
    </div>
  );
}

// ─── Try your own matter wizard ───────────────────────────────────────────────
function TryMatterWizard({ wf, token, proposal, onAddFeedback, previewMode }) {
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
  const [runsRemaining, setRunsRemaining] = useState(RUN_CAP - (wf.run_count || 0));

  // ── Template state ─────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [hovTemplate, setHovTemplate] = useState(null);

  const stages = wf.stages || [];

  // Restore latest run result if available — and surface it (jump to results)
  // so a returning client immediately sees the run they already produced.
  useEffect(() => {
    if (wf.latest_run?.output_json) {
      setRunResult(wf.latest_run.output_json);
      setStep(3);
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
    } else if (formValues.__freeText?.trim()) {
      // Free-text fallback (no generated fields) — must actually reach the AI.
      parts.push(`MATTER DESCRIPTION:\n${formValues.__freeText.trim()}`);
    }
    return parts.join("\n\n---\n\n");
  }

  // Read text-based uploaded files so their contents actually reach the AI.
  // Binary files (PDF/DOCX) are noted by name — client-side extraction isn't reliable.
  async function readUploadedFilesText() {
    if (!uploadedFiles.length) return "";
    const TEXT_RE = /\.(txt|csv|md|json|html?|xml|rtf|log)$/i;
    const parts = [];
    for (const f of uploadedFiles) {
      if ((f.type && f.type.startsWith("text/")) || TEXT_RE.test(f.name)) {
        try {
          const text = await f.text();
          parts.push(`FILE: ${f.name}\n${text.slice(0, 8000)}`);
        } catch { parts.push(`FILE: ${f.name} (could not read contents)`); }
      } else {
        parts.push(`FILE ATTACHED: ${f.name} (${(f.size / 1024).toFixed(0)} KB) — binary file, contents not extracted`);
      }
    }
    return parts.join("\n\n---\n\n");
  }

  async function handleRun() {
    if (running || runsRemaining <= 0) return;
    if (previewMode) { setStep(3); setRunError("Preview mode — the live AI run is disabled here so it doesn't spend the client's run budget."); return; }
    // Required-field validation before spending a run
    if (fields && fields.length > 0) {
      const missing = fields.filter(f => f.required && !String(formValues[f.id] || "").trim());
      if (missing.length > 0) {
        setStep(1);
        setRunError(`Please complete required field${missing.length > 1 ? "s" : ""}: ${missing.map(f => f.label).join(", ")}`);
        return;
      }
    } else if (!buildInputText().trim() && !uploadedFiles.length) {
      // Free-text mode with nothing provided — don't let the AI invent a case.
      setStep(1);
      setRunError("Add a few details about your matter (or attach a document) before running.");
      return;
    }
    setRunning(true); setRunError("");
    try {
      const fileText = await readUploadedFilesText();
      const res = await fetch("/api/proposals/v2/demo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, workflow_id: wf.id, input_text: buildInputText() || null, file_content: fileText || null }),
      });
      const data = await res.json();
      if (!res.ok) { setRunError(data.message || "Generation failed. Please try again."); return; }
      setRunResult(data.output_json);
      setRunCount(data.run_number);
      setRunsRemaining(data.runs_remaining);
    } catch { setRunError("Connection error. Please check your connection and try again."); }
    finally { setRunning(false); }
  }

  function handleFileAdd(e) {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }

  function removeFile(i) { setUploadedFiles(prev => prev.filter((_, j) => j !== i)); }


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
        <div style={{ width: 32, height: 32, borderRadius: 7, background: t.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={16} strokeWidth={2} /></div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Satoshi', sans-serif" }}>Try your own case</div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, lineHeight: 1.5 }}>Describe a real matter and watch it flow through every stage — then react to each output while it's fresh</div>
        </div>
        {runCount > 0 && (
          <div style={{ marginLeft: "auto", fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {runCount} / {RUN_CAP} runs used
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div style={{ display: "flex", padding: "0 22px", borderBottom: `1px solid ${t.border}`, gap: 24 }}>
        <button style={tabStyle(step === 1, true)} onClick={() => setStep(1)}>Step 1 — Case details</button>
        <button style={tabStyle(step === 2, true)} onClick={() => setStep(2)}>Step 2 — Documents</button>
        <button style={tabStyle(step === 3, step >= 2 || !!runResult)} onClick={() => { if (step >= 2 || runResult) setStep(3); }}>Step 3 — Watch it run{runResult ? " ✓" : ""}</button>
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
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 26px 5px 10px", border: `1px solid ${t.accentBorder}`, borderRadius: 20, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, color: t.accent, transition: "background 0.12s" }}
                  >
                    <ClipboardList size={13} strokeWidth={2} />{tpl.name}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                    title="Remove this example" aria-label={`Remove example ${tpl.name}`}
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: hovTemplate === tpl.id ? t.red : t.textMeta, fontSize: 14, lineHeight: 1, padding: "2px 4px", display: "flex", alignItems: "center", transition: "color 0.12s" }}
                  >×</button>
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
                    <select value={formValues[field.id] || ""} onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))} style={{ ...inp, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239DB5C9' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}>
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
                    <Bookmark size={14} strokeWidth={2} /> Save these values as a reusable example
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
          <div role="button" tabIndex={0} aria-label="Upload documents for the AI run" onClick={() => fileInputRef.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }} style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: t.surface, transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = t.accentBorder} onMouseLeave={e => e.currentTarget.style.borderColor = t.border} onFocus={e => e.currentTarget.style.borderColor = t.accentBorder} onBlur={e => e.currentTarget.style.borderColor = t.border}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Upload size={26} color={t.accent} strokeWidth={1.5} /></div>
            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>Click to upload documents</div>
            <div style={{ fontSize: 11, color: t.textMeta, marginTop: 4 }}>PDF, DOCX, TXT, CSV, XLSX — up to 10 MB each</div>
          </div>
          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 13px" }}>
                  <Paperclip size={15} color={t.textMeta} strokeWidth={1.75} style={{ flexShrink: 0 }} />
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

      {/* Step 3: Watch your case flow through, stage by stage */}
      {step === 3 && (
        <div style={{ padding: "20px 22px" }}>
          {!running && runError && (
            <div style={{ background: t.redSoft, border: "1px solid rgba(201,84,46,0.25)", borderRadius: 8, padding: "12px 16px", color: t.red, fontSize: 13, marginBottom: 16 }}>
              {runError}
              <button onClick={() => { setRunError(""); handleRun(); }} style={{ marginLeft: 12, color: t.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>Retry</button>
            </div>
          )}

          {(running || runResult) && (
            <div style={{ animation: "fadeUp 0.3s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta }}>{running ? "Running…" : `Your case — Run ${runCount}`}</div>
                {!running && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setStep(1)} style={{ background: "transparent", color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Edit case</button>
                    <button onClick={handleRun} disabled={runsRemaining <= 0} style={{ background: "transparent", color: t.accent, border: `1px solid ${t.accentBorder}`, borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: runsRemaining <= 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                      {runsRemaining > 0 ? "▶ Run again" : "Limit reached"}
                    </button>
                  </div>
                )}
              </div>
              <RunFlowVisualizer
                stages={stages} runResult={runResult} running={running}
                proposalId={proposal?.id} token={token} wfId={wf.id}
                onAddFeedback={onAddFeedback} previewMode={previewMode}
              />
              {!running && runResult && (
                <div style={{ marginTop: 14, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: t.textSub, lineHeight: 1.6, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <MessageSquare size={15} color={t.accent} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Not quite right? Use <strong style={{ color: t.text }}>Give feedback on this stage</strong> on any output — every note collects in your feedback tray and reaches the LexOps team when you respond.</span>
                </div>
              )}
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

// ─── Workflow header strip (shared by walkthrough + try cards) ────────────────
function WorkflowHeader({ wf, index, showIndex }) {
  const stages = wf.stages || [];
  return (
    <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "#375971", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
        {wf.emoji || "⚙️"}
      </div>
      <div style={{ flex: 1 }}>
        {showIndex && <div style={{ fontSize: 10, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>Workflow {index + 1}</div>}
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: wf.name ? t.text : t.textMeta, fontStyle: wf.name ? "normal" : "italic" }}>
          {wf.name || "Workflow name to be completed"}
        </div>
        {stages.length > 0 && <div style={{ fontSize: 11, color: t.textMeta, marginTop: 2 }}>{stages.length} stage{stages.length !== 1 ? "s" : ""}</div>}
      </div>
      {wf.description && (
        <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, margin: 0, maxWidth: 300 }}>{wf.description}</p>
      )}
    </div>
  );
}

// ─── Chapter 1 card: the guided walkthrough for one workflow ──────────────────
function WorkflowWalkthroughCard({ wf, index, showIndex, token, proposal, frozen, previewMode }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: t.shadow, animation: `fadeUp ${0.3 + index * 0.07}s ease-out` }}>
      <WorkflowHeader wf={wf} index={index} showIndex={showIndex} />
      <div style={{ padding: "18px 18px 18px" }}>
        <GuidedWorkflow stages={wf.stages || []} wfId={wf.id} proposalId={proposal?.id} token={token} frozen={frozen} previewMode={previewMode} />
      </div>
    </div>
  );
}

// ─── V2 client review flow — a guided story in three chapters ─────────────────
function ClientReviewFlow({ proposal, token, onRefresh, previewMode }) {
  const workflows = proposal.workflows || [];
  const isFrozen = ["accepted", "feedback_received", "won", "lost", "converted"].includes(proposal.status);
  const frozen = isFrozen && !previewMode;
  const painPoints = Array.isArray(proposal.pain_points) ? proposal.pain_points : [];
  const objectives = Array.isArray(proposal.objectives) ? proposal.objectives : [];
  const tryWorkflows = workflows.filter(wf => wf.show_try_matter === true && (wf.stages || []).length > 0);
  const tryEnabled = tryWorkflows.length > 0 && !frozen;

  // ── Unified feedback: one tray, filled from anywhere, sent with the response ──
  const [fbEntries, setFbEntries] = useState(() => workflows.map(wf => ({
    wfId: wf.id, wfName: wf.name || "Workflow",
    text: wf.feedback_text || "", savedText: wf.feedback_text || "",
    saving: false, error: "",
  })));
  const [dockOpen, setDockOpen] = useState(false);

  function changeFbText(wfId, text) {
    setFbEntries(es => es.map(e => e.wfId === wfId ? { ...e, text, error: "" } : e));
  }

  async function saveFb(wfId) {
    const entry = fbEntries.find(e => e.wfId === wfId);
    if (!entry || entry.text.trim() === entry.savedText.trim()) return; // includes clearing to empty
    setFbEntries(es => es.map(e => e.wfId === wfId ? { ...e, saving: true, error: "" } : e));
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${wfId}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback_text: entry.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save.");
      setFbEntries(es => es.map(e => e.wfId === wfId ? { ...e, saving: false, savedText: entry.text } : e));
    } catch (err) {
      setFbEntries(es => es.map(e => e.wfId === wfId ? { ...e, saving: false, error: err.message || "Couldn't save — try again." } : e));
    }
  }

  // Called from anywhere (e.g. a stage output in the AI run) to drop a note into the tray.
  function addFeedback(wfId, prefill) {
    setFbEntries(es => es.map(e => e.wfId === wfId
      ? { ...e, text: e.text.trim() ? `${e.text.replace(/\s+$/, "")}\n${prefill}` : prefill }
      : e));
    setDockOpen(true);
    setTimeout(() => {
      const el = document.getElementById(`fb-dock-${wfId}`);
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    }, 320);
  }

  // Chapter numbering adapts when the try-section is hidden.
  const verdictIndex = tryEnabled ? "03" : "02";

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Satoshi', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Top bar */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
        <Logo />
        <div style={{ fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, padding: "5px 13px", borderRadius: 20 }}>
          Proposal for {proposal.client_name || proposal.client_email}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 120px" }}>

        {/* The story opens: where you are → where we'll take you */}
        <StoryHero proposal={proposal} painPoints={painPoints} objectives={objectives} workflows={workflows} tryEnabled={tryEnabled} />

        {/* Status banner — mirrors the verdict panel so the page never contradicts itself */}
        {isFrozen && (() => {
          const isChanges = proposal.status === "feedback_received";
          const isLost = proposal.status === "lost";
          const label = isChanges ? "Feedback received" : isLost ? "Proposal closed" : "Proposal submitted";
          const msg = isChanges
            ? "Thank you — your feedback has been sent to Lex Ops. We'll review it and get back to you shortly."
            : isLost
              ? "This proposal is now closed. Please contact your Lex Ops representative with any questions."
              : "Thank you — your review has been submitted to Lex Ops. We'll be in touch shortly with next steps.";
          const accent = isChanges ? t.amber : isLost ? t.textSub : t.green;
          const soft = isChanges ? t.amberSoft : isLost ? t.surface : t.greenSoft;
          const bord = isChanges ? t.amberBorder : isLost ? t.border : t.greenBorder;
          return (
            <div style={{ background: soft, border: `1px solid ${bord}`, borderRadius: 14, padding: "22px", marginBottom: 28, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", border: `1px solid ${bord}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{isChanges ? <MessageSquare size={18} color={accent} strokeWidth={2} /> : <Check size={19} color={accent} strokeWidth={2.5} />}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginBottom: 4, fontFamily: "'Satoshi', sans-serif" }}>{label}</div>
                <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>{msg}</div>
              </div>
            </div>
          );
        })()}

        {/* Chapter 01 — how the workflow works, stage by stage */}
        {workflows.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <SectionHeader
              index="01" id="section-workflow"
              title="How the workflow works"
              subtitle="Walk each stage one step at a time — see what we need from you, what you get back, and upload your documents and templates right where they belong."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {workflows.map((wf, i) => (
                <WorkflowWalkthroughCard key={wf.id} wf={wf} index={i} showIndex={workflows.length > 1} token={token} proposal={proposal} frozen={frozen} previewMode={previewMode} />
              ))}
            </div>
          </div>
        )}

        {/* Chapter 02 — try it on your own case (live AI run) */}
        {tryEnabled && (
          <div style={{ marginBottom: 52 }}>
            <SectionHeader
              index="02" id="section-try"
              title="Now try it with your own case"
              subtitle="Describe a real matter — Claude runs it through the exact workflow above, and you watch each stage produce its output live. React to anything that isn't right."
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {tryWorkflows.map(wf => (
                <div key={wf.id}>
                  {tryWorkflows.length > 1 && <Eyebrow label={wf.name || "Workflow"} />}
                  <TryMatterWizard wf={wf} token={token} proposal={proposal} onAddFeedback={(prefill) => addFeedback(wf.id, prefill)} previewMode={previewMode} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final chapter — your verdict */}
        <div>
          <SectionHeader
            index={verdictIndex} id="section-respond"
            title="Your verdict"
            subtitle="Happy with it? Accept and we start. Want changes? Everything in your feedback tray comes with your request — nothing gets lost."
          />
          <SimpleResponsePanel proposal={proposal} token={token} onRefresh={onRefresh} feedbackEntries={fbEntries} previewMode={previewMode} />
        </div>
      </div>

      {/* One feedback tray for the whole review */}
      {workflows.length > 0 && (
        <FeedbackDock entries={fbEntries} onChangeText={changeFbText} onSave={saveFb} open={dockOpen} setOpen={setDockOpen} frozen={frozen} />
      )}
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function ProposalPage({ token, previewMode = false }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recoverable, setRecoverable] = useState(false); // network/timeout vs. genuinely-invalid link
  const slowLoad = useSlowHint(loading);

  useEffect(() => {
    document.title = "LexOps | Review Your Proposal";
    load();
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRecoverable(false);
    try {
      const res = await fetchWithTimeout(`/api/proposals/v2/by-token/${encodeURIComponent(token)}`);
      if (!res.ok) {
        const { data, error: err } = await withTimeout(supabase.from("proposals").select("*").eq("token", token).single());
        if (err || !data) { setError("This proposal link is no longer valid or has expired."); return; }
        setProposal({ ...data, workflows: [] });
        return;
      }
      const data = await res.json();
      setProposal(data);
    } catch {
      // Network failure or timeout — this is recoverable, so offer a retry.
      setError("We couldn't load this proposal. Please check your connection and try again.");
      setRecoverable(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, textAlign: "center", fontFamily: "'Satoshi', sans-serif" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: t.textSub, fontSize: 13 }}>Loading your proposal…</span>
        {slowLoad && <span style={{ color: t.textMeta, fontSize: 12, maxWidth: 300, lineHeight: 1.5 }}>This is taking longer than usual — still working on it.</span>}
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
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.redSoft, border: "1px solid rgba(201,84,46,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: t.red }}>!</div>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Satoshi', sans-serif" }}>{recoverable ? "Couldn't load your proposal" : "Link Invalid or Expired"}</h2>
          <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{recoverable ? error : "This proposal link is no longer valid. Please contact your LexOps representative for a new link."}</p>
          {recoverable && (
            <button onClick={() => load()} style={{ marginTop: 20, background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
          )}
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
