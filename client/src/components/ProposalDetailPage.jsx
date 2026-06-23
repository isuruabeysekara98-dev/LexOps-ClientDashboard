import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#F4F3EF", card: "#FFFFFF", nav: "#FFFFFF",
  border: "#E5E3DC", borderLight: "#EDEBE4",
  text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentHover: "#093C3C", accentLight: "rgba(11,79,79,0.08)",
  green: "#059669", greenSoft: "#ECFDF5", greenBorder: "#A7F3D0",
  red: "#DC2626", redSoft: "#FEF2F2", redBorder: "#FECACA",
  yellow: "#D97706", yellowSoft: "#FFFBEB", yellowBorder: "#FDE68A",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
};

const STATUS_CFG = {
  draft:             { label: "Draft",             bg: "transparent",  color: t.textSub,  border: t.border },
  sent:              { label: "Sent",              bg: "#EFF6FF",      color: "#2563EB",  border: "#BFDBFE" },
  in_review:         { label: "In review",         bg: t.yellowSoft,   color: t.yellow,   border: t.yellowBorder },
  submitted:         { label: "Submitted",         bg: t.accent,       color: "#FFFFFF",  border: t.accent },
  feedback_received: { label: "Submitted",         bg: t.accent,       color: "#FFFFFF",  border: t.accent },
  viewed:            { label: "Viewed",            bg: "#EFF6FF",      color: "#2563EB",  border: "#BFDBFE" },
  won:               { label: "Won",               bg: t.greenSoft,    color: t.green,    border: t.greenBorder },
  lost:              { label: "Lost",              bg: t.redSoft,      color: t.red,      border: t.redBorder },
  converted:         { label: "Converted",         bg: t.accent,       color: "#FFFFFF",  border: t.accent },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
  return (
    <span style={{
      display: "inline-block", background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, borderRadius: 99, padding: "3px 12px",
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={56} height={18} viewBox="0 0 307 97" fill="none">
        <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#082B2B"/>
        <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#1A6666"/>
        <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#082B2B"/>
      </svg>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: t.textSub, background: "#F0EDE6", border: `1px solid ${t.border}`,
        borderRadius: 4, padding: "2px 6px",
      }}>Admin</span>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function CheckDot({ done, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        background: done ? t.green : "transparent",
        border: `1.5px solid ${done ? t.green : t.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {done && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, color: done ? t.text : t.textMeta }}>{label}</span>
    </div>
  );
}

function WorkflowCard({ wf, index }) {
  const [open, setOpen] = useState(false);
  const runDone = (wf.run_count || 0) > 0;
  const feedbackDone = !!wf.feedback_text;
  const proceeded = wf.has_proceeded;
  const complete = runDone && feedbackDone && proceeded;

  const stageOutputs = wf.latest_run?.output_json?.stages || [];

  return (
    <div style={{
      background: t.card, border: `1.5px solid ${complete ? t.greenBorder : t.border}`,
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: complete ? t.green : t.border,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: complete ? "#fff" : t.textSub, fontWeight: 700,
            }}>
              {complete ? "✓" : index + 1}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 2 }}>
                {wf.emoji || "🔷"} {wf.name}
              </div>
              <div style={{ fontSize: 11, color: t.textMeta }}>
                {wf.stages?.length || 0} stage{(wf.stages?.length || 0) !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {(wf.run_count || 0) > 0 && (
              <span style={{
                fontSize: 11, color: t.accent, background: t.accentLight,
                borderRadius: 99, padding: "2px 8px", fontWeight: 600,
              }}>
                {wf.run_count} run{wf.run_count !== 1 ? "s" : ""}
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: complete ? t.green : t.textMeta,
            }}>
              {complete ? "Complete ✓" : "Pending"}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.borderLight}` }}>
          <CheckDot done={runDone} label={`Demo run ${runDone ? `(${wf.run_count}×)` : "— not yet run"}`} />
          <CheckDot done={feedbackDone} label="Feedback submitted" />
          <CheckDot done={proceeded} label="Proceeded to next workflow" />
        </div>

        {feedbackDone && (
          <div style={{
            marginTop: 12, background: "#FAFAFA", border: `1px solid ${t.borderLight}`,
            borderRadius: 8, padding: "10px 14px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 5 }}>
              Client feedback
            </div>
            <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {wf.feedback_text}
            </div>
          </div>
        )}

        {stageOutputs.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              marginTop: 12, background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, color: t.accent, fontWeight: 600, padding: 0,
            }}
          >
            {open ? "▲ Hide demo output" : "▼ View latest demo output"}
          </button>
        )}
      </div>

      {open && stageOutputs.length > 0 && (
        <div style={{ borderTop: `1px solid ${t.borderLight}`, background: "#FAFAFA", padding: "16px 20px" }}>
          {stageOutputs.map((stage, i) => (
            <div key={i} style={{ marginBottom: i < stageOutputs.length - 1 ? 16 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 6 }}>
                {stage.emoji || ""} {stage.title}
              </div>
              <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {stage.content || stage.text || ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionPanel({ proposal, onMarkWon, onMarkLost, onConvert, marking }) {
  const status = proposal.status;

  if (status === "converted") {
    return (
      <div style={{
        background: t.accentLight, border: `1.5px solid ${t.accent}`,
        borderRadius: 12, padding: "20px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: t.accent, marginBottom: 4 }}>
          Converted to Active Project
        </div>
        <div style={{ fontSize: 12, color: t.textSub }}>
          Converted {fmtDate(proposal.converted_at)}
        </div>
      </div>
    );
  }

  if (status === "won") {
    return (
      <div style={{
        background: t.greenSoft, border: `1.5px solid ${t.greenBorder}`,
        borderRadius: 12, padding: "20px 24px",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.green, marginBottom: 6 }}>
          ✓ Marked as Won
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginBottom: 16, lineHeight: 1.6 }}>
          Ready to convert this proposal into an active project. This will freeze the proposal and create a new project workspace.
        </div>
        <button
          onClick={onConvert}
          disabled={marking}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: marking ? "#6B9999" : t.accent, color: "#fff",
            fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: marking ? "default" : "pointer",
          }}
        >
          {marking ? "Converting…" : "Convert to active project →"}
        </button>
      </div>
    );
  }

  if (status === "lost") {
    return (
      <div style={{
        background: t.redSoft, border: `1.5px solid ${t.redBorder}`,
        borderRadius: 12, padding: "20px 24px", textAlign: "center",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.red, marginBottom: 4 }}>
          Marked as Lost
        </div>
        <div style={{ fontSize: 12, color: t.textSub }}>
          This proposal is closed. No further actions are available.
        </div>
      </div>
    );
  }

  const canDecide = status === "feedback_received" || status === "submitted";
  if (!canDecide) return null;

  return (
    <div style={{
      background: t.card, border: `1.5px solid ${t.yellowBorder}`,
      borderRadius: 12, padding: "20px 24px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.yellow, marginBottom: 12 }}>
        ⚡ Admin decision required
      </div>
      <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, marginBottom: 20 }}>
        The client has submitted this proposal. Review the workflow outputs above, then mark it as Won or Lost.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onMarkWon}
          disabled={marking}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
            background: marking ? "#ccc" : t.green, color: "#fff",
            fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: marking ? "default" : "pointer",
          }}
        >
          {marking === "won" ? "Saving…" : "Mark as Won ✓"}
        </button>
        <button
          onClick={onMarkLost}
          disabled={marking}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            border: `1.5px solid ${t.redBorder}`, background: "#fff",
            color: t.red,
            fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: marking ? "default" : "pointer",
          }}
        >
          {marking === "lost" ? "Saving…" : "Mark as Lost"}
        </button>
      </div>
    </div>
  );
}

function ProjectStarterScreen({ proposal, navigate }) {
  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      fontFamily: "'Inter', sans-serif", color: t.text,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}>🚀</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em",
          color: t.text, marginBottom: 12,
        }}>
          Project started
        </h1>
        <p style={{ fontSize: 15, color: t.textSub, lineHeight: 1.7, marginBottom: 32 }}>
          <strong style={{ color: t.text }}>{proposal.name}</strong> has been converted to an active project.
          The Active Projects workspace is where you'll manage delivery, milestones, and client communications.
        </p>

        <div style={{
          background: t.card, border: `1px solid ${t.border}`,
          borderRadius: 16, padding: "28px 32px", marginBottom: 32, textAlign: "left",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 16 }}>
            What's been captured
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "📋", label: "Proposal name & client context", done: true },
              { icon: "⚙️", label: `${proposal.workflows?.length || 0} workflow${(proposal.workflows?.length || 0) !== 1 ? "s" : ""} with demo outputs & feedback`, done: (proposal.workflows?.length || 0) > 0 },
              { icon: "💬", label: "Client feedback for each workflow", done: true },
              { icon: "📄", label: "Submitted proposal snapshot (frozen)", done: true },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: t.textSub }}>{item.label}</span>
                <span style={{ marginLeft: "auto", color: t.green, fontSize: 12, fontWeight: 600 }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: t.accentLight, border: `1px dashed ${t.accent}`,
          borderRadius: 12, padding: "18px 24px", marginBottom: 32,
          color: t.textSub, fontSize: 13, lineHeight: 1.7,
        }}>
          <strong style={{ color: t.accent }}>Coming soon (Section B):</strong> Full active-project workspace with phases, tasks, documents, invoicing, and client portal — built on top of this proposal data.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => navigate("/active-projects")}
            style={{
              padding: "11px 24px", borderRadius: 8,
              background: t.accent, color: "#fff", border: "none",
              fontFamily: "inherit", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            ⚡ Go to Active Projects
          </button>
          <button
            onClick={() => navigate("/admin/proposals")}
            style={{
              padding: "11px 24px", borderRadius: 8,
              background: "transparent", color: t.textSub,
              border: `1px solid ${t.border}`,
              fontFamily: "inherit", fontWeight: 500, fontSize: 14, cursor: "pointer",
            }}
          >
            ← Back to Proposals
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProposalDetailPage({ id, navigate, onLogout }) {
  const [proposal, setProposal] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovBtn, setHovBtn] = useState(null);
  const [converted, setConverted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      const prRes = await fetch(`/api/proposals/v2/${id}`, { headers });
      if (prRes.ok) {
        const pr = await prRes.json();
        setProposal(pr);
        document.title = `LexOps | ${pr.name || "Proposal"}`;
        if (pr.status === "converted") setConverted(true);
      }

      const { data: subs } = await supabase
        .from("workflow_submissions")
        .select("*, workflow_runs(*, workflows(name))")
        .eq("proposal_id", id)
        .order("created_at", { ascending: false })
        .then(r => r, () => ({ data: [] }));

      const subList = subs || [];
      setSubmissions(subList);
      if (subList.length > 0) setSelectedSub(subList[0]);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(status) {
    if (!proposal) return;
    setMarking(status);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/proposals/v2/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status }),
    });
    setProposal(p => ({ ...p, status }));
    setMarking(false);
  }

  async function convert() {
    await setStatus("converted");
    setConverted(true);
  }

  function copyLink() {
    if (!proposal) return;
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.token}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvite() {
    if (!proposal?.client_email) {
      setSendMsg({ ok: false, text: "Add a client email before sending." });
      setTimeout(() => setSendMsg(null), 4000);
      return;
    }
    setSending(true);
    setSendMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/v2/${id}/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendMsg({ ok: false, text: j.message || "Failed to send." });
      } else {
        setSendMsg({ ok: true, text: "Invite sent ✓" });
        setProposal(p => ({ ...p, status: p.status === "draft" ? "sent" : p.status }));
      }
    } catch {
      setSendMsg({ ok: false, text: "Network error — try again." });
    } finally {
      setSending(false);
      setTimeout(() => setSendMsg(null), 5000);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!proposal) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ color: t.textSub }}>Proposal not found.</div>
      <button onClick={() => navigate("/admin/proposals")} style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>← Back to proposals</button>
    </div>
  );

  if (converted) return <ProjectStarterScreen proposal={proposal} navigate={navigate} />;

  const hasWorkflows = (proposal.workflows?.length || 0) > 0;
  const stageCount = proposal.workflows?.reduce((acc, wf) => acc + (wf.stages?.length || 0), 0) || 0;
  const workflowsComplete = hasWorkflows && proposal.workflows.every(wf => wf.has_proceeded);

  const btnBase = {
    background: "transparent", border: "none", cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, borderRadius: 7, padding: "7px 12px", transition: "all 0.12s",
  };

  const subData = selectedSub?.data || selectedSub?.response_data || {};

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`,
        padding: "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => navigate("/active-projects")}
            onMouseEnter={() => setHovBtn("projects")} onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.textSub, background: hovBtn === "projects" ? "#F0EDE6" : "transparent" }}
          >
            ⚡ Active Projects
          </button>
          <button
            onClick={() => navigate("/admin/proposals")}
            onMouseEnter={() => setHovBtn("proposals")} onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.accent, fontWeight: 600, background: hovBtn === "proposals" ? t.accentLight : "transparent" }}
          >
            📋 Proposals
          </button>
          <button
            onClick={() => navigate("/admin/proposals/new")}
            onMouseEnter={() => setHovBtn("new")} onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, background: hovBtn === "new" ? t.accentHover : t.accent, color: "#fff", fontWeight: 600 }}
          >
            + New proposal
          </button>
          <div style={{ width: 1, height: 18, background: t.border, margin: "0 6px" }} />
          <button
            onClick={onLogout}
            onMouseEnter={() => setHovBtn("logout")} onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.textSub, background: hovBtn === "logout" ? "#F0EDE6" : "transparent" }}
          >
            Log out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "36px 24px" }}>
        <button
          onClick={() => navigate("/admin/proposals")}
          style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Back to proposals
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{
                margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em",
                fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.2,
              }}>
                {proposal.name || "Untitled Proposal"}
              </h1>
              <StatusPill status={proposal.status} />
            </div>
            <div style={{ color: t.textSub, fontSize: 13 }}>
              {[
                proposal.client_email,
                stageCount ? `${stageCount} stage${stageCount !== 1 ? "s" : ""}` : null,
                `Created ${fmtDate(proposal.created_at)}`,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {sendMsg && (
              <span style={{
                fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 7,
                background: sendMsg.ok ? t.greenSoft : t.redSoft,
                color: sendMsg.ok ? t.green : t.red,
                border: `1px solid ${sendMsg.ok ? t.greenBorder : t.redBorder}`,
              }}>
                {sendMsg.text}
              </span>
            )}
            <button
              onClick={() => navigate(`/admin/proposals/${id}/preview`)}
              onMouseEnter={() => setHovBtn("preview")} onMouseLeave={() => setHovBtn(null)}
              style={{ ...btnBase, border: `1px solid ${t.border}`, color: t.text, background: hovBtn === "preview" ? "#F0EDE6" : t.card }}
            >
              Preview
            </button>
            <button
              onClick={() => navigate(`/admin/proposals/${id}/edit`)}
              onMouseEnter={() => setHovBtn("edit")} onMouseLeave={() => setHovBtn(null)}
              style={{ ...btnBase, border: `1px solid ${t.border}`, color: t.text, background: hovBtn === "edit" ? "#F0EDE6" : t.card }}
            >
              Edit
            </button>
            <button
              onClick={sendInvite}
              disabled={sending}
              onMouseEnter={() => setHovBtn("send")} onMouseLeave={() => setHovBtn(null)}
              style={{
                ...btnBase, fontWeight: 600,
                background: sending ? t.border : (hovBtn === "send" ? t.accentHover : t.accent),
                color: "#fff", opacity: sending ? 0.7 : 1, cursor: sending ? "default" : "pointer",
              }}
            >
              {sending ? "Sending…" : "✉ Send invite"}
            </button>
            <button
              onClick={copyLink}
              onMouseEnter={() => setHovBtn("copy")} onMouseLeave={() => setHovBtn(null)}
              title="Copy proposal link to share manually"
              style={{
                ...btnBase,
                border: `1px solid ${t.border}`,
                color: copied ? t.accent : t.text,
                background: copied ? "#EBF4F4" : (hovBtn === "copy" ? "#F0EDE6" : t.card),
                fontWeight: copied ? 600 : 400,
              }}
            >
              {copied ? "✓ Link copied" : "🔗 Copy link"}
            </button>
          </div>
        </div>

        {hasWorkflows ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
            <div>
              {proposal.change_request_note && (
                <div style={{
                  background: t.yellowSoft, border: `1.5px solid ${t.yellowBorder}`,
                  borderRadius: 12, padding: "16px 20px", marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.yellow, marginBottom: 6 }}>
                    Client requested changes
                  </div>
                  <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {proposal.change_request_note}
                  </div>
                </div>
              )}

              {/* Client details */}
              {(proposal.client_name || proposal.client_contact_name || proposal.client_email) && (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 14 }}>
                    Client details
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                    {proposal.client_name && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 3 }}>Organisation</div>
                        <div style={{ fontSize: 13, color: t.text }}>{proposal.client_name}</div>
                      </div>
                    )}
                    {proposal.client_contact_name && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 3 }}>Contact</div>
                        <div style={{ fontSize: 13, color: t.text }}>{proposal.client_contact_name}</div>
                      </div>
                    )}
                    {proposal.client_email && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 3 }}>Email</div>
                        <div style={{ fontSize: 13, color: t.text }}>{proposal.client_email}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pain points + Objectives */}
              {((proposal.pain_points?.length > 0) || (proposal.objectives?.length > 0)) && (
                <div style={{ display: "grid", gridTemplateColumns: proposal.pain_points?.length > 0 && proposal.objectives?.length > 0 ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 20 }}>
                  {proposal.pain_points?.length > 0 && (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 22px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 12 }}>
                        Pain points
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {proposal.pain_points.map((pp, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: t.text, lineHeight: 1.6 }}>
                            <span style={{ color: t.accent, flexShrink: 0, fontWeight: 700 }}>•</span>
                            {pp}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proposal.objectives?.length > 0 && (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 22px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 12 }}>
                        Objectives
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {proposal.objectives.map((obj, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, fontSize: 13, color: t.text, lineHeight: 1.6 }}>
                            <span style={{ color: t.green, flexShrink: 0, fontWeight: 700 }}>→</span>
                            {obj}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMeta, marginBottom: 12 }}>
                Workflows ({proposal.workflows.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {proposal.workflows.map((wf, i) => (
                  <WorkflowCard key={wf.id} wf={wf} index={i} />
                ))}
              </div>

              {proposal.signer_note && (
                <div style={{
                  marginTop: 20, background: "#FFFCF0", border: `1.5px solid #F5E4A0`,
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#92701A", marginBottom: 6 }}>
                    💬 Client note (left on submission)
                  </div>
                  <div style={{ fontSize: 13, color: "#5C4A1A", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {proposal.signer_note}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 14 }}>
                  Proposal overview
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Client</span>
                    <span style={{ fontWeight: 500, color: t.text }}>{proposal.client_email || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Workflows</span>
                    <span style={{ fontWeight: 500, color: t.text }}>{proposal.workflows.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Demo runs</span>
                    <span style={{ fontWeight: 500, color: t.text }}>
                      {proposal.workflows.reduce((a, w) => a + (w.run_count || 0), 0)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Workflows complete</span>
                    <span style={{ fontWeight: 500, color: workflowsComplete ? t.green : t.textSub }}>
                      {proposal.workflows.filter(w => w.has_proceeded).length} / {proposal.workflows.length}
                    </span>
                  </div>
                  {proposal.submitted_at && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: t.textSub }}>Submitted</span>
                      <span style={{ fontWeight: 500, color: t.text }}>{fmtDate(proposal.submitted_at)}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.borderLight}` }}>
                  <button
                    onClick={() => window.open(`/proposal/${proposal.token}`, "_blank")}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 7,
                      border: `1px solid ${t.border}`, background: "#FAFAFA",
                      color: t.textSub, fontFamily: "inherit", fontSize: 12,
                      cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    View as client ↗
                  </button>
                </div>
              </div>

              <DecisionPanel
                proposal={proposal}
                onMarkWon={() => setStatus("won")}
                onMarkLost={() => setStatus("lost")}
                onConvert={convert}
                marking={marking}
              />
            </div>
          </div>
        ) : (
          /* ── No-workflow proposal: show full content ── */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
            {/* Main content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Change request banner */}
              {proposal.change_request_note && (
                <div style={{
                  background: t.yellowSoft, border: `1.5px solid ${t.yellowBorder}`,
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.yellow, marginBottom: 6 }}>
                    ↩ Client requested changes
                  </div>
                  <div style={{ fontSize: 13, color: t.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {proposal.change_request_note}
                  </div>
                </div>
              )}

              {/* Signer note */}
              {proposal.signer_note && (
                <div style={{
                  background: "#FFFCF0", border: `1.5px solid #F5E4A0`,
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#92701A", marginBottom: 6 }}>
                    💬 Client note
                  </div>
                  <div style={{ fontSize: 13, color: "#5C4A1A", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {proposal.signer_note}
                  </div>
                </div>
              )}

              {/* Client details */}
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 16 }}>
                  Client details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  {proposal.client_name && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 4 }}>Organisation</div>
                      <div style={{ fontSize: 14, color: t.text }}>{proposal.client_name}</div>
                    </div>
                  )}
                  {proposal.client_contact_name && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 4 }}>Contact name</div>
                      <div style={{ fontSize: 14, color: t.text }}>{proposal.client_contact_name}</div>
                    </div>
                  )}
                  {proposal.client_email && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 4 }}>Email</div>
                      <div style={{ fontSize: 14, color: t.text }}>{proposal.client_email}</div>
                    </div>
                  )}
                  {proposal.client_company_name && proposal.client_company_name !== proposal.client_name && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 4 }}>Company</div>
                      <div style={{ fontSize: 14, color: t.text }}>{proposal.client_company_name}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pain points + Objectives */}
              {((proposal.pain_points?.length > 0) || (proposal.objectives?.length > 0)) && (
                <div style={{ display: "grid", gridTemplateColumns: proposal.pain_points?.length > 0 && proposal.objectives?.length > 0 ? "1fr 1fr" : "1fr", gap: 16 }}>
                  {proposal.pain_points?.length > 0 && (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 14 }}>
                        Pain points
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {proposal.pain_points.map((pp, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: t.text, lineHeight: 1.6 }}>
                            <span style={{ color: t.accent, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>•</span>
                            {pp}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proposal.objectives?.length > 0 && (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 14 }}>
                        Objectives
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {proposal.objectives.map((obj, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: t.text, lineHeight: 1.6 }}>
                            <span style={{ color: t.green, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>→</span>
                            {obj}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stages / content sections from persona */}
              {(proposal.stages?.length > 0) && (
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 16 }}>
                    Proposal stages ({proposal.stages.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {proposal.stages.map((stage, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px", background: "#FAFAF8", borderRadius: 8, border: `1px solid ${t.borderLight}` }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          background: t.accentLight, border: `1px solid rgba(11,79,79,0.15)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: t.accent,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: t.text, marginBottom: stage.description ? 4 : 0 }}>
                            {stage.emoji ? `${stage.emoji} ` : ""}{stage.title || stage.name || `Stage ${i + 1}`}
                          </div>
                          {stage.description && (
                            <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>{stage.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when no content at all */}
              {!proposal.change_request_note && !proposal.signer_note && !proposal.pain_points?.length && !proposal.objectives?.length && !proposal.stages?.length && (
                <div style={{
                  background: t.card, border: `1.5px dashed ${t.border}`,
                  borderRadius: 12, padding: "40px 28px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 6 }}>No proposal content yet</div>
                  <div style={{ color: t.textMeta, fontSize: 13, lineHeight: 1.6 }}>
                    Edit this proposal to add pain points, objectives, and stages.
                  </div>
                  <button
                    onClick={() => navigate(`/admin/proposals/${id}/edit`)}
                    style={{
                      marginTop: 16, padding: "9px 20px", borderRadius: 8,
                      background: t.accent, color: "#fff", border: "none",
                      fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Edit proposal →
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Overview card */}
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 14 }}>
                  Proposal overview
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Status</span>
                    <StatusPill status={proposal.status} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: t.textSub }}>Created</span>
                    <span style={{ fontWeight: 500, color: t.text }}>{fmtDate(proposal.created_at)}</span>
                  </div>
                  {proposal.submitted_at && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: t.textSub }}>Submitted</span>
                      <span style={{ fontWeight: 500, color: t.green }}>{fmtDate(proposal.submitted_at)}</span>
                    </div>
                  )}
                  {proposal.updated_at && proposal.updated_at !== proposal.created_at && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: t.textSub }}>Last updated</span>
                      <span style={{ fontWeight: 500, color: t.text }}>{fmtDate(proposal.updated_at)}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.borderLight}` }}>
                  <button
                    onClick={() => window.open(`/proposal/${proposal.token}`, "_blank")}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 7,
                      border: `1px solid ${t.border}`, background: "#FAFAFA",
                      color: t.textSub, fontFamily: "inherit", fontSize: 12,
                      cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    View as client ↗
                  </button>
                </div>
              </div>

              <DecisionPanel
                proposal={proposal}
                onMarkWon={() => setStatus("won")}
                onMarkLost={() => setStatus("lost")}
                onConvert={convert}
                marking={marking}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
