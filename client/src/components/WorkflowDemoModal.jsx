import { useState, useEffect, useRef } from "react";

const t = {
  bg: "#F9F8F5", card: "#FFFFFF",
  border: "#E5E3DC", surface: "#F0F4F4", surfaceHigh: "#E5EDED",
  text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentLight: "rgba(11,79,79,0.07)", accentBorder: "rgba(11,79,79,0.18)",
  green: "#059669", greenSoft: "rgba(5,150,105,0.08)", greenBorder: "rgba(5,150,105,0.22)",
  amber: "#B45309", amberSoft: "rgba(180,83,9,0.07)", amberBorder: "rgba(180,83,9,0.2)",
  red: "#DC2626", redSoft: "rgba(220,38,38,0.08)",
  shadow: "0 1px 4px rgba(0,0,0,0.06)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.12)",
};

const inp = {
  width: "100%", background: t.card, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: "10px 13px", fontSize: 13, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  resize: "vertical", lineHeight: 1.6,
};

const LOAD_STAGES = [
  "Reading your input…",
  "Mapping to workflow stages…",
  "Analysing client context…",
  "Generating stage outputs…",
  "Structuring results…",
];

function LoadingAnimation({ stages }) {
  const [step, setStep] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => (s + 1) % LOAD_STAGES.length), 1400);
    const dotTimer = setInterval(() => setDotCount(d => (d % 3) + 1), 450);
    return () => { clearInterval(stepTimer); clearInterval(dotTimer); };
  }, []);

  const dots = ".".repeat(dotCount);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 24px", gap: 28,
    }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `3px solid ${t.accentBorder}`,
        }} />
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `3px solid transparent`,
          borderTopColor: t.accent,
          animation: "spin 0.9s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 8, borderRadius: "50%",
          border: `2px solid transparent`,
          borderTopColor: t.accent,
          opacity: 0.4,
          animation: "spin 1.4s linear infinite reverse",
        }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 13, color: t.accent, fontWeight: 600, letterSpacing: "0.01em",
          marginBottom: 6,
        }}>
          Running demo{dots}
        </div>
        <div style={{ fontSize: 12, color: t.textMeta, minHeight: 18, transition: "opacity 0.3s" }}>
          {LOAD_STAGES[step]}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {(stages || []).map((s, i) => (
          <div key={i} style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 20,
            background: i <= step % (stages.length || 1) ? t.accentLight : t.surface,
            color: i <= step % (stages.length || 1) ? t.accent : t.textMeta,
            border: `1px solid ${i <= step % (stages.length || 1) ? t.accentBorder : t.border}`,
            transition: "all 0.4s",
          }}>
            {s.emoji} {s.title}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function StageBlock({ stage, index }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      border: `1px solid ${t.border}`, borderRadius: 12,
      overflow: "hidden", background: t.card,
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          borderBottom: expanded ? `1px solid ${t.border}` : "none",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = t.surface}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: t.accentLight, border: `1px solid ${t.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>
          {stage.emoji || "📋"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: t.textMeta, marginBottom: 1 }}>
            Stage {index + 1}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
            {stage.title}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: t.accent, fontWeight: 600,
          background: t.accentLight, padding: "3px 10px", borderRadius: 20,
          border: `1px solid ${t.accentBorder}`,
        }}>
          ✓ Generated
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.textMeta} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{
            fontSize: 13, color: t.text, lineHeight: 1.75, whiteSpace: "pre-wrap",
          }}>
            {(stage.content || "").replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowDemoModal({ workflow, token, onClose }) {
  const [activeTab, setActiveTab] = useState("describe");
  const [inputText, setInputText] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [result, setResult] = useState(null);
  const [runId, setRunId] = useState(null);
  const [runCount, setRunCount] = useState(workflow.run_count || 0);
  const [runsRemaining, setRunsRemaining] = useState(10 - (workflow.run_count || 0));

  const [feedback, setFeedback] = useState(workflow.feedback_text || "");
  const [feedbackSaved, setFeedbackSaved] = useState(!!workflow.feedback_text);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [lastSavedFeedback, setLastSavedFeedback] = useState(workflow.feedback_text || "");

  const [proceeding, setProceeding] = useState(false);
  const [proceedError, setProceedError] = useState("");
  const [proceeded, setProceeded] = useState(workflow.has_proceeded || false);

  const fileInputRef = useRef(null);

  // Initialise result from latest_run if available
  useEffect(() => {
    if (workflow.latest_run?.output_json) {
      setResult(workflow.latest_run.output_json);
      setRunId(workflow.latest_run.id);
    }
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const isText = /\.(txt|csv|md|json|xml|html|htm|log|tsv)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = ev => setFileContent(ev.target?.result || "");
      reader.readAsText(file);
    } else {
      setFileContent(`[File uploaded: ${file.name} (${(file.size / 1024).toFixed(0)} KB)]`);
    }
  }

  async function handleRun() {
    if (running) return;
    if (runsRemaining <= 0) {
      setRunError(`You've reached the ${10}-run limit for this workflow.`);
      return;
    }
    setRunning(true);
    setRunError("");
    try {
      const res = await fetch("/api/proposals/v2/demo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          workflow_id: workflow.id,
          input_text: inputText.trim() || null,
          pasted_text: pastedText.trim() || null,
          file_content: fileContent || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRunError(data.message || "Generation failed. Please try again."); return; }
      setResult(data.output_json);
      setRunId(data.run_id);
      setRunCount(data.run_number);
      setRunsRemaining(data.runs_remaining);
    } catch {
      setRunError("Connection error. Please check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSaveFeedback() {
    if (!feedback.trim()) { setFeedbackError("Please enter some feedback before saving."); return; }
    setSavingFeedback(true);
    setFeedbackError("");
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${workflow.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback_text: feedback, final_run_id: runId }),
      });
      const data = await res.json();
      if (!res.ok) { setFeedbackError(data.message || "Failed to save feedback."); return; }
      setFeedbackSaved(true);
      setLastSavedFeedback(feedback);
    } catch {
      setFeedbackError("Connection error. Please try again.");
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleProceed() {
    setProceeding(true);
    setProceedError("");
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${workflow.id}/proceed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setProceedError(data.message || "Could not proceed."); setProceeding(false); return; }
      setProceeded(true);
      setTimeout(() => onClose({ proceeded: true }), 800);
    } catch {
      setProceedError("Connection error. Please try again.");
      setProceeding(false);
    }
  }

  function handleDownloadPdf() {
    if (!runId) return;
    window.open(`/api/proposals/v2/runs/${runId}/pdf`, "_blank");
  }

  const feedbackChanged = feedback.trim() !== lastSavedFeedback.trim();
  const canProceed = runCount >= 1 && feedbackSaved && !feedbackChanged;
  const tabStyle = (active) => ({
    padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", fontFamily: "inherit",
    background: active ? t.accent : "transparent",
    color: active ? "#fff" : t.textSub,
    transition: "all 0.15s",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(8,20,20,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "stretch", justifyContent: "flex-end",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose({}); }}
    >
      <div style={{
        width: "min(860px, 100vw)", background: t.bg,
        display: "flex", flexDirection: "column",
        boxShadow: t.shadowLg,
        animation: "slideIn 0.22s ease-out",
        overflowY: "auto",
      }}>
        <style>{`
          @keyframes slideIn { from { transform: translateX(32px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, padding: "18px 24px",
          borderBottom: `1px solid ${t.border}`, background: t.card, flexShrink: 0,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: t.accentLight, border: `1px solid ${t.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {workflow.emoji || "⚙️"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: t.textMeta, marginBottom: 1 }}>Workflow Demo</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {workflow.name}
            </div>
          </div>
          <div style={{
            fontSize: 11, color: runsRemaining > 0 ? t.textMeta : t.red,
            background: t.surface, border: `1px solid ${t.border}`,
            padding: "4px 10px", borderRadius: 20, flexShrink: 0,
          }}>
            {runCount} / 10 runs used
          </div>
          <button
            onClick={() => onClose({})}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              border: `1px solid ${t.border}`, background: t.surface,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: t.textSub, fontSize: 16, fontFamily: "inherit",
            }}
          >✕</button>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Input section */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.border}`, background: t.card }}>
            <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Your Input
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {[["describe", "✍️ Describe"], ["paste", "📋 Paste text"], ["upload", "📎 Upload file"]].map(([key, label]) => (
                <button key={key} style={tabStyle(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </div>

            {activeTab === "describe" && (
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Describe your situation, ask a question, or give context for this workflow…\n\nExample: "We receive 40–60 estate administration referrals per month from three regional solicitor firms. Currently all intake is by email and phone, with manual data entry into a spreadsheet…"`}
                rows={5}
                style={inp}
              />
            )}
            {activeTab === "paste" && (
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste sample documents, email threads, data extracts, or any relevant text…"
                rows={5}
                style={inp}
              />
            )}
            {activeTab === "upload" && (
              <div>
                <input ref={fileInputRef} type="file" onChange={handleFileChange}
                  style={{ display: "none" }}
                  accept=".txt,.csv,.md,.pdf,.docx,.xlsx,.json,.xml,.html,.htm,.log,.tsv"
                />
                <div style={{
                  border: `2px dashed ${t.border}`, borderRadius: 10,
                  padding: "24px", textAlign: "center", cursor: "pointer",
                  background: t.surface,
                }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileName ? (
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>📎</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{fileName}</div>
                      <div style={{ fontSize: 11, color: t.textMeta, marginTop: 4 }}>Click to replace</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>⬆️</div>
                      <div style={{ fontSize: 13, color: t.textSub }}>Click to upload a file</div>
                      <div style={{ fontSize: 11, color: t.textMeta, marginTop: 4 }}>PDF, DOCX, TXT, CSV, XLSX supported</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={handleRun}
                disabled={running || runsRemaining <= 0}
                style={{
                  background: running || runsRemaining <= 0 ? t.surface : t.accent,
                  color: running || runsRemaining <= 0 ? t.textMeta : "#fff",
                  border: `1px solid ${running || runsRemaining <= 0 ? t.border : t.accent}`,
                  borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600,
                  cursor: running || runsRemaining <= 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {running
                  ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "#fff", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Generating…</>
                  : runsRemaining <= 0 ? "Run limit reached" : result ? "▶ Run again" : "▶ Run demo"
                }
              </button>
              {runsRemaining > 0 && (
                <span style={{ fontSize: 11, color: t.textMeta }}>
                  {runsRemaining} run{runsRemaining !== 1 ? "s" : ""} remaining
                </span>
              )}
            </div>
            {runError && (
              <div style={{ marginTop: 10, background: t.redSoft, border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 8, padding: "9px 13px", fontSize: 12, color: t.red }}>
                {runError}
              </div>
            )}
          </div>

          {/* Loading */}
          {running && (
            <div style={{ padding: "0 24px" }}>
              <LoadingAnimation stages={workflow.stages || []} />
            </div>
          )}

          {/* Results */}
          {!running && result && (
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.border}`, animation: "fadeIn 0.3s ease-out" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Results — Run {runCount}
                </div>
                <button
                  onClick={handleDownloadPdf}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: t.card, border: `1px solid ${t.border}`, borderRadius: 7,
                    padding: "6px 13px", fontSize: 12, fontWeight: 600, color: t.accent,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = t.surface}
                  onMouseLeave={e => e.currentTarget.style.background = t.card}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.map((stage, i) => (
                  <StageBlock key={i} stage={stage} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {(result || runCount > 0) && (
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.border}`, background: t.card, animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Your Feedback
              </div>
              <div style={{ fontSize: 12, color: t.textSub, marginBottom: 12 }}>
                Share your thoughts on this workflow demo — what worked, what you'd change, or any questions.
              </div>
              <textarea
                value={feedback}
                onChange={e => { setFeedback(e.target.value); setFeedbackSaved(false); }}
                placeholder="What did you think of this workflow? Were the outputs relevant to your situation? Any gaps or areas you'd like Lex Ops to address?"
                rows={4}
                style={{
                  ...inp,
                  borderColor: feedbackSaved && !feedbackChanged ? t.green : t.border,
                  boxShadow: feedbackSaved && !feedbackChanged ? `0 0 0 3px ${t.greenSoft}` : "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
              {feedbackError && (
                <div style={{ marginTop: 8, color: t.red, fontSize: 12 }}>{feedbackError}</div>
              )}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={handleSaveFeedback}
                  disabled={savingFeedback || !feedback.trim()}
                  style={{
                    background: feedbackSaved && !feedbackChanged ? t.greenSoft : t.accent,
                    color: feedbackSaved && !feedbackChanged ? t.green : "#fff",
                    border: `1px solid ${feedbackSaved && !feedbackChanged ? t.greenBorder : t.accent}`,
                    borderRadius: 8, padding: "9px 20px", fontSize: 12, fontWeight: 600,
                    cursor: savingFeedback || !feedback.trim() ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: !feedback.trim() ? 0.5 : 1,
                    display: "flex", alignItems: "center", gap: 7,
                    transition: "all 0.15s",
                  }}
                >
                  {savingFeedback
                    ? <><span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "#fff", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Saving…</>
                    : feedbackSaved && !feedbackChanged ? "✓ Feedback saved" : "Save feedback"
                  }
                </button>
                {feedbackSaved && !feedbackChanged && (
                  <span style={{ fontSize: 11, color: t.green }}>Saved successfully</span>
                )}
                {feedbackChanged && lastSavedFeedback && (
                  <span style={{ fontSize: 11, color: t.amber }}>Unsaved changes</span>
                )}
              </div>
            </div>
          )}

          {/* Proceed section */}
          {(result || runCount > 0) && (
            <div style={{ padding: "20px 24px" }}>
              <div style={{
                background: proceeded ? t.greenSoft : canProceed ? t.accentLight : t.surface,
                border: `1px solid ${proceeded ? t.greenBorder : canProceed ? t.accentBorder : t.border}`,
                borderRadius: 12, padding: "18px 20px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: proceeded ? t.green : t.text, marginBottom: 8 }}>
                  {proceeded ? "✓ Workflow complete" : "Completion checklist"}
                </div>
                {!proceeded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                    {[
                      { done: runCount >= 1, label: "Run the demo at least once" },
                      { done: feedbackSaved && !feedbackChanged, label: "Save your feedback" },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: item.done ? t.green : t.textSub }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          background: item.done ? t.greenSoft : t.card,
                          border: `1.5px solid ${item.done ? t.green : t.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: item.done ? t.green : t.textMeta,
                        }}>
                          {item.done ? "✓" : ""}
                        </div>
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
                {proceeded ? (
                  <div style={{ fontSize: 12, color: t.green }}>
                    You've completed this workflow. The next one is now unlocked.
                  </div>
                ) : (
                  <button
                    onClick={handleProceed}
                    disabled={!canProceed || proceeding}
                    style={{
                      background: canProceed ? t.accent : t.surface,
                      color: canProceed ? "#fff" : t.textMeta,
                      border: `1px solid ${canProceed ? t.accent : t.border}`,
                      borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600,
                      cursor: canProceed && !proceeding ? "pointer" : "not-allowed",
                      fontFamily: "inherit", opacity: canProceed ? 1 : 0.6,
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s",
                    }}
                  >
                    {proceeding
                      ? <><span style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "#fff", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Marking complete…</>
                      : "Proceed to next workflow →"
                    }
                  </button>
                )}
                {proceedError && (
                  <div style={{ marginTop: 10, color: t.red, fontSize: 12 }}>{proceedError}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
