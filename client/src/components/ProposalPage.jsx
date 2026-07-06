import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ClipboardList, Bookmark, Upload, Paperclip, Clock } from "lucide-react";
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
  @keyframes stepIn { from { opacity:0; transform:translateX(14px) } to { opacity:1; transform:translateX(0) } }
  @keyframes ringPulse { 0%{box-shadow:0 0 0 0 rgba(55,89,113,0.32)} 70%{box-shadow:0 0 0 8px rgba(55,89,113,0)} 100%{box-shadow:0 0 0 0 rgba(55,89,113,0)} }
`;

// ─── Full-page thank-you screen (after accept / request changes) ──────────────
function CompletionScreen({ kind }) {
  const accepted = kind === "accepted";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: t.bg, fontFamily: "'Satoshi', sans-serif", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <style>{`
        @font-face { font-family: 'Satoshi'; src: url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'); }
        ${GLOBAL_CSS}
      `}</style>
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
function SimpleResponsePanel({ proposal, token, onRefresh }) {
  // Saved per-workflow feedback (from the "Try your case" wizard) so it can be
  // surfaced — and carried through — as part of the change request.
  const savedFeedback = (proposal.workflows || [])
    .map(w => ({ name: w.name, text: (w.feedback_text || "").trim() }))
    .filter(f => f.text);
  const [mode, setMode] = useState("idle");
  const [signerName, setSignerName] = useState("");
  const [changeNote, setChangeNote] = useState(
    savedFeedback.map(f => `${f.name ? f.name + " — " : ""}${f.text}`).join("\n\n")
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isFrozen = ["accepted", "feedback_received", "won", "lost", "converted"].includes(proposal.status);

  // Just completed this session → full-page thank-you screen.
  if (mode === "done-accept") return <CompletionScreen kind="accepted" />;
  if (mode === "done-request") return <CompletionScreen kind="changes" />;

  // Returning to an already-accepted proposal → inline acknowledgement.
  if (isFrozen) {
    return (
      <div style={{ background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 14, padding: "24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "#fff", border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={20} color={t.green} strokeWidth={2.5} /></div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.green, marginBottom: 5, fontFamily: "'Satoshi', sans-serif" }}>Proposal Accepted</div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>Thank you — your acceptance has been sent to the LexOps team. We'll be in touch shortly.</div>
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
        <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: t.card, border: `1px solid ${t.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ClipboardList size={18} color={t.accent} strokeWidth={2} /></div>
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
              <Check size={16} strokeWidth={3} /> Accept this proposal
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
            {savedFeedback.length > 0 && (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 13px", fontSize: 12, color: t.textSub, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600, color: t.text }}>Your workflow feedback is included below.</span> We've carried over the notes you saved while trying the workflow — edit or add to them before sending.
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

// Does this stage plausibly call for client documents?
function stageDocSignal(stage) {
  const inputs = stage.inputs || [];
  if (inputs.length === 0) return "none"; // nothing needed from the client here
  const blob = inputs.map(i => `${i.name || ""} ${i.label || ""} ${i.description || ""} ${i.detail || ""}`).join(" ");
  return /document|file|upload|attach|evidence|contract|letter|form|certificate|statement|report|invoice|record|agreement|deed|passport|licen[cs]e|policy|deck|spreadsheet|filing/i.test(blob)
    ? "required" // inputs explicitly reference documents
    : "optional"; // inputs exist but may be answered without a file
}

// ─── Contextual, inline document uploader (one surface, reused per stage) ──────
function DocumentUpload({ proposalId, token, wfId, stageIndex, initialFiles, onCountChange, signal }) {
  const [files, setFiles] = useState(initialFiles || []);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onCountChange?.(stageIndex, files.length); }, [files.length]);

  async function handleUpload(fileList) {
    const picked = Array.from(fileList || []);
    if (!picked.length || !proposalId || !token) return;
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
      fd.append("kind", "submitted");
      try {
        const res = await fetch(`/api/proposals/v2/${proposalId}/client-files`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setErr(data.message || "Upload failed — please try again."); continue; }
        done.push({ id: data.file?.id, name: data.file?.file_name || file.name, url: data.file?.file_url });
      } catch { setErr("Connection error — please check your network and try again."); }
    }
    if (done.length) setFiles(prev => [...prev, ...done]);
    setUploading(false);
  }

  function removeFile(i) {
    const f = files[i];
    setFiles(prev => prev.filter((_, j) => j !== i));
    if (f?.id && proposalId && token) {
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
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{required ? "Upload the documents this stage needs" : "Add supporting documents (optional)"}</div>
          <div style={{ fontSize: 11, color: t.textMeta, marginTop: 1 }}>We'll refine them and return another round of comments</div>
        </div>
        {files.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: t.green, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} strokeWidth={3} /> {files.length}
          </span>
        )}
      </div>

      {err && (
        <div style={{ background: t.redSoft, border: "1px solid rgba(201,84,46,0.25)", borderRadius: 8, padding: "9px 13px", color: t.red, fontSize: 12, marginBottom: 12 }}>
          {err}
          <button onClick={() => setErr("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600, textDecoration: "underline", fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, borderRadius: 8, padding: "8px 12px" }}>
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
        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", justifyContent: "center", background: uploading ? t.border : (required ? t.accent : "transparent"), color: uploading ? t.textMeta : (required ? "#FFFFFF" : t.accent), border: required ? "none" : `1px solid ${t.accentBorder}`, borderRadius: 9, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s, opacity 0.15s" }}
      >
        {uploading ? (
          <><div style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,0.15)", borderTop: `2px solid ${t.textSub}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} /> Uploading…</>
        ) : (
          <><Upload size={16} strokeWidth={2} /> {files.length > 0 ? "Upload more documents" : "Upload documents"}</>
        )}
      </button>
      <div style={{ fontSize: 11, color: t.textMeta, textAlign: "center", marginTop: 7 }}>PDF, DOCX, TXT, CSV, XLSX, images — up to 10 MB each</div>
    </div>
  );
}

// ─── Guided, step-by-step workflow walkthrough ────────────────────────────────
function GuidedWorkflow({ stages, wfId, proposalId, token, frozen }) {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const [counts, setCounts] = useState({});           // stageIndex -> uploaded file count
  const [filesByStage, setFilesByStage] = useState({}); // persisted files, loaded once
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef(null);

  // Load previously submitted files for this workflow (so reloads show progress).
  useEffect(() => {
    if (!proposalId || !token) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposals/v2/${proposalId}/client-files?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data.files)) { setLoaded(true); return; }
        const byStage = {}; const initCounts = {};
        data.files
          .filter(f => f.workflow_id === wfId && f.kind === "submitted" && f.stage_index != null)
          .forEach(f => {
            (byStage[f.stage_index] = byStage[f.stage_index] || []).push({ id: f.id, name: f.file_name, url: f.file_url });
          });
        Object.keys(byStage).forEach(k => { initCounts[k] = byStage[k].length; });
        if (!cancelled) { setFilesByStage(byStage); setCounts(initCounts); }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [proposalId, token, wfId]);

  if (!stages || stages.length === 0) {
    return <div style={{ padding: "18px 4px 4px" }}><FieldTodo label="Workflow stages to be completed" /></div>;
  }

  const total = stages.length;
  const canUpload = !!proposalId && !!token && !frozen;
  const requiredStages = stages.map((s, i) => ({ i, sig: stageDocSignal(s) })).filter(x => x.sig === "required");
  const requiredDone = requiredStages.filter(x => (counts[x.i] || 0) > 0).length;

  function go(i) { setActive(Math.max(0, Math.min(total - 1, i))); panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }); }

  // ── Intro state: overview + the "Try your own case" call to action ──────────
  if (!started) {
    return (
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: "22px 22px 24px", boxShadow: t.shadow }}>
        <Eyebrow label={`${total} stage${total !== 1 ? "s" : ""} · step by step`} />
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: "-0.01em", marginBottom: 6 }}>See how we'd handle your case</div>
        <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.65, marginBottom: 18, maxWidth: 560 }}>
          Walk the workflow one stage at a time. At each step you'll see exactly what we need from you and what you'll get back — and you can upload your documents right there for us to refine.
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
          Try your own case <span style={{ fontSize: 16 }}>→</span>
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
  const pct = total > 1 ? Math.round((active / (total - 1)) * 100) : 100;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow, overflow: "hidden" }}>
      {/* Progress header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>Step {active + 1} of {total}</div>
          <div style={{ height: 5, borderRadius: 3, background: t.surface, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: t.accent, borderRadius: 3, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
        {requiredStages.length > 0 && (
          <div style={{ fontSize: 11.5, color: requiredDone === requiredStages.length ? t.green : t.textMeta, fontWeight: 600, background: requiredDone === requiredStages.length ? t.greenSoft : t.surface, border: `1px solid ${requiredDone === requiredStages.length ? t.greenBorder : t.border}`, borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap", flexShrink: 0 }}>
            {requiredDone} / {requiredStages.length} doc stages ready
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* ── Progress rail ── */}
        <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${t.border}`, padding: "14px 10px", background: t.bg, position: "relative" }} className="gw-rail">
          {stages.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            const uploaded = (counts[i] || 0) > 0;
            const rowSig = stageDocSignal(s);
            return (
              <button key={i} onClick={() => go(i)} style={{ position: "relative", width: "100%", textAlign: "left", background: isActive ? t.accentLight : "none", border: "none", borderRadius: 9, padding: "9px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 2, transition: "background 0.15s" }}>
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
                  <div key={i} style={{ background: "#FBF9F5", border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 15px", display: "flex", gap: 13, alignItems: "flex-start" }}>
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

          {/* contextual upload */}
          {canUpload && sig !== "none" && (
            <div style={{ marginBottom: 20 }}>
              <DocumentUpload proposalId={proposalId} token={token} wfId={wfId} stageIndex={active} initialFiles={filesByStage[active] || []} onCountChange={(idx, n) => setCounts(c => ({ ...c, [idx]: n }))} signal={sig} />
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
      <style>{`@media (max-width: 640px){ .gw-rail{ display:none !important; } }`}</style>
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
        <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, background: t.accentLight, padding: "3px 10px", borderRadius: 20, border: `1px solid ${t.accentBorder}`, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={12} strokeWidth={3} /> Generated</div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textMeta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.78, whiteSpace: "pre-wrap", marginBottom: outputs.length > 0 ? 16 : 0 }}>
            {(aiOutput?.content || "").replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
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
    // Required-field validation before spending a run
    if (fields && fields.length > 0) {
      const missing = fields.filter(f => f.required && !String(formValues[f.id] || "").trim());
      if (missing.length > 0) {
        setStep(1);
        setRunError(`Please complete required field${missing.length > 1 ? "s" : ""}: ${missing.map(f => f.label).join(", ")}`);
        return;
      }
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
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Satoshi', sans-serif" }}>Run a live AI demo</div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, lineHeight: 1.5 }}>Watch the workflow process a sample matter end-to-end — for context only, separate from your document submission</div>
        </div>
        {runCount > 0 && (
          <div style={{ marginLeft: "auto", fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {runCount} / 10 runs used
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div style={{ display: "flex", padding: "0 22px", borderBottom: `1px solid ${t.border}`, gap: 24 }}>
        <button style={tabStyle(step === 1, true)} onClick={() => setStep(1)}>Step 1 — Case details</button>
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
                    <ClipboardList size={13} strokeWidth={2} />{tpl.name}
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
          <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: t.surface, transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = t.accentBorder} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
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

              {/* Workflow feedback is captured via the proposal's "Request changes" flow, not here. */}
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: "transparent", color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Try again</button>
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

// ─── Single workflow block ─────────────────────────────────────────────────────
function WorkflowBlock({ wf, index, totalWorkflows, token, proposal, isFrozen, previewMode, onRefresh }) {
  const stages = wf.stages || [];
  const showTryMatter = wf.show_try_matter === true;
  const frozen = isFrozen && !previewMode;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: t.shadow, animation: `fadeUp ${0.3 + index * 0.07}s ease-out` }}>
      {/* Workflow header */}
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "#375971", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
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

      {/* Guided, step-by-step walkthrough + contextual document upload */}
      <div style={{ padding: "18px 18px 18px" }}>
        <GuidedWorkflow stages={stages} wfId={wf.id} proposalId={proposal?.id} token={token} frozen={frozen} />
      </div>

      {/* Optional live AI demo — separate, clearly-labelled, opt-in per workflow */}
      {showTryMatter && (!isFrozen || previewMode) && stages.length > 0 && (
        <div style={{ padding: "0 18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 12px" }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, whiteSpace: "nowrap" }}>Or see it run live with AI</span>
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>
          <TryMatterWizard wf={wf} token={token} proposal={proposal} />
        </div>
      )}
    </div>
  );
}

// ─── V2 client review flow ────────────────────────────────────────────────────
function ClientReviewFlow({ proposal, token, onRefresh, previewMode }) {
  const workflows = proposal.workflows || [];
  const isFrozen = ["accepted", "feedback_received", "won", "lost", "converted"].includes(proposal.status);
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
            <div style={{ width: 38, height: 38, borderRadius: 10, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={19} color={t.green} strokeWidth={2.5} /></div>
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
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: t.red }}>!</div>
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
