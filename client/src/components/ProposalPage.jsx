import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import ProposalViewer, { Logo } from "./ProposalViewer.jsx";
import WorkflowDemoModal from "./WorkflowDemoModal.jsx";

const t = {
  bg: "#F9F8F5", card: "#FFFFFF",
  border: "#E5E3DC", surface: "#F0F4F4", surfaceHigh: "#E5EDED",
  text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentLight: "rgba(11,79,79,0.07)", accentBorder: "rgba(11,79,79,0.18)",
  green: "#059669", greenSoft: "rgba(5,150,105,0.08)", greenBorder: "rgba(5,150,105,0.22)",
  amber: "#B45309", amberSoft: "rgba(180,83,9,0.07)", amberBorder: "rgba(180,83,9,0.2)",
  red: "#DC2626", redSoft: "rgba(220,38,38,0.08)",
  shadow: "0 1px 4px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
};

const inp = {
  width: "100%", background: t.card, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: "11px 14px", fontSize: 14, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

// ─── Client response panel (Accept / Request changes) ────────────────────────

function SimpleResponsePanel({ proposal, token, onRefresh }) {
  // mode: "idle" | "accepting" | "requesting" | "done-accept" | "done-request"
  const [mode, setMode] = useState("idle");
  const [signerName, setSignerName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFrozen = ["feedback_received", "won", "lost", "converted"].includes(proposal.status);
  const hasChangePending = proposal.status === "sent" && proposal.change_request_note;

  if (isFrozen || mode === "done-accept") {
    return (
      <div style={{
        background: t.greenSoft, border: `1px solid ${t.greenBorder}`,
        borderRadius: 14, padding: "28px 28px",
        display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: "#FFFFFF", border: `1px solid ${t.greenBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>✓</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.green, marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Proposal Accepted
          </div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>
            Thank you — your acceptance has been sent to the LexOps team. We'll be in touch shortly with next steps.
          </div>
        </div>
      </div>
    );
  }

  if (mode === "done-request") {
    return (
      <div style={{
        background: t.amberSoft, border: `1px solid ${t.amberBorder}`,
        borderRadius: 14, padding: "28px 28px",
        display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: "#FFFFFF", border: `1px solid ${t.amberBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>↩</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.amber, marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Change request sent
          </div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>
            The LexOps team has been notified and will reach out to discuss your feedback.
          </div>
        </div>
      </div>
    );
  }

  async function handleAccept() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signer_name: signerName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong. Please try again."); setSubmitting(false); return; }
      setMode("done-accept");
      if (onRefresh) onRefresh();
    } catch {
      setError("Connection error — please try again.");
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!changeNote.trim()) { setError("Please describe what you'd like changed."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, note: changeNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong. Please try again."); setSubmitting(false); return; }
      setMode("done-request");
      if (onRefresh) onRefresh();
    } catch {
      setError("Connection error — please try again.");
      setSubmitting(false);
    }
  }

  const labelStyle = {
    color: t.textSub, fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{
      background: t.card, border: `1px solid ${t.accentBorder}`,
      borderRadius: 14, overflow: "hidden", boxShadow: t.shadowMd,
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: `1px solid ${t.border}`,
        background: t.accentLight,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: t.card, border: `1px solid ${t.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>📋</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Ready to respond?
          </div>
          <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>
            Accept this proposal or let us know what you'd like changed.
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 24px" }}>
        {error && (
          <div style={{
            background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: 8, padding: "10px 14px", color: t.red,
            fontSize: 12, marginBottom: 16,
          }}>{error}</div>
        )}

        {/* Idle — two CTAs */}
        {mode === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hasChangePending && (
              <div style={{
                background: t.amberSoft, border: `1px solid ${t.amberBorder}`,
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: t.amber,
              }}>
                ↩ You previously requested changes. Accept to confirm you're happy with the revised proposal, or send a new change request.
              </div>
            )}
            <button
              onClick={() => setMode("accepting")}
              style={{
                background: t.accent, color: "#fff", border: "none", borderRadius: 8,
                padding: "13px 24px", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <span style={{ fontSize: 18 }}>✓</span>
              <span>Accept this proposal</span>
            </button>
            <button
              onClick={() => setMode("requesting")}
              style={{
                background: "transparent", color: t.textSub,
                border: `1px solid ${t.border}`, borderRadius: 8,
                padding: "13px 24px", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accentBorder; e.currentTarget.style.color = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSub; }}
            >
              <span style={{ fontSize: 18 }}>↩</span>
              <span>Request changes</span>
            </button>
          </div>
        )}

        {/* Accepting — optional name field */}
        {mode === "accepting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Your name <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: t.textMeta }}>— optional</span></label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="e.g. Jane Smith"
                style={inp}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleAccept}
                disabled={submitting}
                style={{
                  background: submitting ? t.border : t.accent, color: submitting ? t.textSub : "#fff",
                  border: "none", borderRadius: 8, padding: "11px 24px",
                  fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Confirming…" : "Confirm acceptance →"}
              </button>
              <button
                onClick={() => { setMode("idle"); setError(""); }}
                style={{
                  background: "transparent", color: t.textSub, border: `1px solid ${t.border}`,
                  borderRadius: 8, padding: "11px 20px", fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Requesting changes — textarea */}
        {mode === "requesting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>What would you like changed?</label>
              <textarea
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                placeholder="Describe what you'd like LexOps to revise or clarify…"
                rows={4}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleRequestChanges}
                disabled={submitting}
                style={{
                  background: submitting ? t.border : t.accent, color: submitting ? t.textSub : "#fff",
                  border: "none", borderRadius: 8, padding: "11px 24px",
                  fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Sending…" : "Send change request →"}
              </button>
              <button
                onClick={() => { setMode("idle"); setError(""); }}
                style={{
                  background: "transparent", color: t.textSub, border: `1px solid ${t.border}`,
                  borderRadius: 8, padding: "11px 20px", fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── V2 workflow unlock helpers ──────────────────────────────────────────────

function isUnlocked(workflows, index) {
  if (index === 0) return true;
  return workflows[index - 1]?.has_proceeded === true;
}

function getWorkflowStatus(wf, index, workflows) {
  if (!isUnlocked(workflows, index)) return "locked";
  if (wf.has_proceeded) return "complete";
  if (wf.run_count > 0 || wf.feedback_text) return "active";
  return "unlocked";
}

// ─── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = {
    locked:   { bg: t.surface,    border: t.border,         color: t.textMeta, label: "🔒 Locked" },
    unlocked: { bg: t.accentLight, border: t.accentBorder,  color: t.accent,   label: "Ready to start" },
    active:   { bg: t.amberSoft,  border: t.amberBorder,    color: t.amber,    label: "In progress" },
    complete: { bg: t.greenSoft,  border: t.greenBorder,    color: t.green,    label: "✓ Complete" },
  }[status] || {};
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      letterSpacing: "0.02em",
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Single workflow card ─────────────────────────────────────────────────────

function WorkflowCard({ wf, index, workflows, token, onOpenDemo, onProceed, isFrozen }) {
  const status = getWorkflowStatus(wf, index, workflows);
  const locked = status === "locked";
  const complete = status === "complete";

  const [proceeding, setProceeding] = useState(false);
  const [proceedError, setProceedError] = useState("");

  async function handleProceed() {
    setProceeding(true);
    setProceedError("");
    try {
      const res = await fetch(`/api/proposals/v2/workflow/${wf.id}/proceed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setProceedError(data.message || "Could not proceed."); setProceeding(false); return; }
      onProceed();
    } catch {
      setProceedError("Connection error. Please try again.");
      setProceeding(false);
    }
  }

  const canProceedHere = !isFrozen && status === "active" && wf.run_count >= 1 && !!wf.feedback_text?.trim();

  return (
    <div style={{
      background: t.card,
      border: `1px solid ${complete ? t.greenBorder : locked ? t.border : t.accentBorder}`,
      borderRadius: 14,
      overflow: "hidden",
      opacity: locked ? 0.55 : 1,
      boxShadow: locked ? "none" : t.shadow,
      transition: "opacity 0.3s",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
        borderBottom: `1px solid ${t.border}`,
        background: complete ? t.greenSoft : locked ? t.surface : "transparent",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: locked ? t.surface : complete ? t.greenSoft : t.accentLight,
          border: `1px solid ${locked ? t.border : complete ? t.greenBorder : t.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {wf.emoji || "⚙️"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.textMeta, marginBottom: 2 }}>Workflow {index + 1}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
            {wf.name}
          </div>
          <div style={{ fontSize: 11, color: t.textMeta, marginTop: 2 }}>
            {(wf.stages || []).length} stage{(wf.stages || []).length !== 1 ? "s" : ""}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Stages strip (visible when not locked) */}
      {!locked && (wf.stages || []).length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 20px",
          borderBottom: `1px solid ${t.border}`,
        }}>
          {(wf.stages || []).map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20,
              padding: "4px 10px", fontSize: 11, color: t.textSub,
            }}>
              <span>{s.emoji}</span>
              <span>{s.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Body — action area */}
      {!locked && (
        <div style={{ padding: "16px 20px" }}>
          {complete ? (
            // Complete summary
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ fontSize: 11, color: t.textMeta }}>
                  🔬 <strong style={{ color: t.text }}>{wf.run_count}</strong> demo run{wf.run_count !== 1 ? "s" : ""}
                </div>
                {wf.feedback_text && (
                  <div style={{ fontSize: 11, color: t.textMeta }}>
                    💬 Feedback submitted
                  </div>
                )}
              </div>
              {wf.feedback_text && (
                <div style={{
                  background: t.surface, border: `1px solid ${t.border}`,
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: 12, color: t.textSub, lineHeight: 1.6,
                  fontStyle: "italic",
                }}>
                  "{wf.feedback_text.length > 160 ? wf.feedback_text.slice(0, 160) + "…" : wf.feedback_text}"
                </div>
              )}
            </div>
          ) : (
            // Active / unlocked — show checklist + demo button
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Progress checklist */}
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { done: wf.run_count >= 1, label: "Run demo" },
                  { done: !!wf.feedback_text?.trim(), label: "Submit feedback" },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: item.done ? t.green : t.textMeta,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: item.done ? t.greenSoft : t.surface,
                      border: `1.5px solid ${item.done ? t.green : t.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800,
                    }}>
                      {item.done ? "✓" : ""}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {!isFrozen && (
                  <button
                    onClick={() => onOpenDemo(wf)}
                    style={{
                      background: t.accent, color: "#fff", border: "none",
                      borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 7,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <span>🔬</span>
                    Try your workflow and share feedback
                  </button>
                )}
                {canProceedHere && (
                  <button
                    onClick={handleProceed}
                    disabled={proceeding}
                    style={{
                      background: "transparent", color: t.accent,
                      border: `1px solid ${t.accentBorder}`, borderRadius: 8,
                      padding: "9px 18px", fontSize: 13, fontWeight: 600,
                      cursor: proceeding ? "not-allowed" : "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", gap: 7,
                    }}
                  >
                    {proceeding ? "Completing…" : "Proceed to next →"}
                  </button>
                )}
              </div>
              {proceedError && (
                <div style={{ fontSize: 12, color: t.red }}>{proceedError}</div>
              )}
            </div>
          )}
        </div>
      )}

      {locked && (
        <div style={{ padding: "14px 20px", fontSize: 12, color: t.textMeta }}>
          Complete the previous workflow to unlock this one.
        </div>
      )}
    </div>
  );
}

// ─── Final actions (after all workflows complete) ────────────────────────────

function FinalActions({ proposal, token, onRefresh }) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmitFinal() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/submit-final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Submission failed."); setSubmitting(false); return; }
      setSubmitted(true);
      onRefresh();
    } catch {
      setError("Connection error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    setRequestingChanges(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/v2/${proposal.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, note: changeNote }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Request failed."); setRequestingChanges(false); return; }
      setSubmitted(true);
      onRefresh();
    } catch {
      setError("Connection error. Please try again.");
      setRequestingChanges(false);
    }
  }

  if (submitted) return null;

  return (
    <div style={{
      background: t.card, border: `1px solid ${t.accentBorder}`,
      borderRadius: 14, padding: "24px 24px",
      boxShadow: t.shadowMd,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: t.accentLight,
        border: `1px solid ${t.accentBorder}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 20, marginBottom: 14,
      }}>🎉</div>
      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
        You've completed all workflows
      </h3>
      <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" }}>
        Thank you for taking the time to review each workflow and share your feedback. When you're ready, submit your review to LexOps, or let us know if you'd like any changes first.
      </p>
      {error && (
        <div style={{ marginBottom: 14, background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "10px 14px", color: t.red, fontSize: 12 }}>
          {error}
        </div>
      )}
      {showRequestChanges ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              What would you like changed?
            </label>
            <textarea
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              placeholder="Describe what you'd like Lex Ops to revise or clarify…"
              rows={4}
              style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleRequestChanges}
              disabled={requestingChanges}
              style={{
                background: t.accent, color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600,
                cursor: requestingChanges ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {requestingChanges ? "Sending…" : "Send change request"}
            </button>
            <button
              onClick={() => setShowRequestChanges(false)}
              style={{
                background: "transparent", color: t.textSub, border: `1px solid ${t.border}`,
                borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleSubmitFinal}
            disabled={submitting}
            style={{
              background: t.accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {submitting ? "Submitting…" : "Submit proposal to Lex Ops →"}
          </button>
          <button
            onClick={() => setShowRequestChanges(true)}
            style={{
              background: "transparent", color: t.textSub,
              border: `1px solid ${t.border}`, borderRadius: 8,
              padding: "12px 22px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Request changes
          </button>
        </div>
      )}
    </div>
  );
}

// ─── V2 client review flow ────────────────────────────────────────────────────

function ClientReviewFlow({ proposal, token, onRefresh }) {
  const [demoWorkflow, setDemoWorkflow] = useState(null);
  const workflows = proposal.workflows || [];
  const allComplete = workflows.length > 0 && workflows.every(wf => wf.has_proceeded);
  const isFrozen = ["feedback_received", "won", "lost", "converted"].includes(proposal.status);

  function handleModalClose({ proceeded } = {}) {
    setDemoWorkflow(null);
    onRefresh();
  }

  const painPoints = Array.isArray(proposal.pain_points) ? proposal.pain_points : [];
  const objectives = Array.isArray(proposal.objectives) ? proposal.objectives : [];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }`}</style>

      {/* Top bar */}
      <div style={{
        background: t.card, borderBottom: `1px solid ${t.border}`,
        padding: "14px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <Logo />
        <div style={{ fontSize: 11, color: t.textMeta, background: t.surface, border: `1px solid ${t.border}`, padding: "5px 12px", borderRadius: 20 }}>
          Proposal for {proposal.client_name || proposal.client_email}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 32, animation: "fadeUp 0.35s ease-out" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700,
            color: t.text, margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            {proposal.name}
          </h1>
          {proposal.description && (
            <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
              {proposal.description}
            </p>
          )}

          {/* Context strips */}
          {(painPoints.length > 0 || objectives.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: painPoints.length && objectives.length ? "1fr 1fr" : "1fr", gap: 14 }}>
              {painPoints.length > 0 && (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMeta, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Pain Points
                  </div>
                  {painPoints.map((pp, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12, color: t.text, lineHeight: 1.5 }}>
                      <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}>•</span>
                      {pp}
                    </div>
                  ))}
                </div>
              )}
              {objectives.length > 0 && (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMeta, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Objectives
                  </div>
                  {objectives.map((obj, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12, color: t.text, lineHeight: 1.5 }}>
                      <span style={{ color: t.green, flexShrink: 0, marginTop: 1 }}>→</span>
                      {obj}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submitted state */}
        {isFrozen && (
          <div style={{
            background: t.greenSoft, border: `1px solid ${t.greenBorder}`,
            borderRadius: 14, padding: "24px", marginBottom: 28,
            display: "flex", gap: 16, alignItems: "flex-start",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: t.greenSoft, border: `1px solid ${t.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✓</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.green, marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>Proposal Submitted</div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>
                Thank you — your review has been submitted to Lex Ops. We'll be in touch shortly with next steps.
              </div>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {workflows.length > 0 && (
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: t.textSub }}>
              {workflows.filter(wf => wf.has_proceeded).length} of {workflows.length} workflows complete
            </div>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: t.border, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, background: t.accent,
                width: `${workflows.length > 0 ? (workflows.filter(wf => wf.has_proceeded).length / workflows.length) * 100 : 0}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        )}

        {/* Workflow heading */}
        <div style={{
          fontSize: 11, fontWeight: 700, color: t.textMeta,
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 14,
        }}>
          {workflows.length > 1 ? "Workflows" : "Workflow"}
        </div>

        {/* Workflow cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {workflows.map((wf, i) => (
            <div key={wf.id} style={{ animation: `fadeUp ${0.3 + i * 0.08}s ease-out` }}>
              <WorkflowCard
                wf={wf}
                index={i}
                workflows={workflows}
                token={token}
                onOpenDemo={setDemoWorkflow}
                onProceed={onRefresh}
                isFrozen={isFrozen}
              />
            </div>
          ))}
        </div>

        {/* Final actions — always visible so client can respond at any point */}
        <div style={{ animation: "fadeUp 0.35s ease-out", marginTop: 8 }}>
          {allComplete && !isFrozen && (
            <div style={{ marginBottom: 16 }}>
              <FinalActions proposal={proposal} token={token} onRefresh={onRefresh} />
            </div>
          )}
          <SimpleResponsePanel proposal={proposal} token={token} onRefresh={onRefresh} />
        </div>
      </div>

      {/* Demo modal */}
      {demoWorkflow && (
        <WorkflowDemoModal
          workflow={demoWorkflow}
          token={token}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function ProposalPage({ token }) {
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
        const { data, error: err } = await supabase
          .from("proposals").select("*").eq("token", token).single();
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
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Logo />
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: t.shadow }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: t.red }}>!</div>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>Link Invalid or Expired</h2>
          <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>This proposal link is no longer valid. Please contact your LexOps representative for a new link.</p>
        </div>
        <div style={{ color: t.textMeta, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</div>
      </div>
    );
  }

  if (!proposal) return null;

  // V2 review flow: proposals with workflows
  if ((proposal.workflows || []).length > 0) {
    return (
      <ClientReviewFlow
        proposal={proposal}
        token={token}
        onRefresh={load}
      />
    );
  }

  // Legacy flow: proposals with no workflows
  return (
    <ProposalViewer
      proposal={proposal}
      footer={<SimpleResponsePanel proposal={proposal} token={token} onRefresh={load} />}
    />
  );
}
