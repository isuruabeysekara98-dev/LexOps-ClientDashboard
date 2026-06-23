import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#F4F3EF", card: "#FFFFFF", nav: "#FFFFFF",
  border: "#E5E3DC", borderLight: "#EDEBE4",
  text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentHover: "#093C3C", accentLight: "rgba(11,79,79,0.08)",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const STATUS_CFG = {
  draft:     { label: "Draft",             bg: "transparent", color: t.textSub, border: t.border },
  sent:      { label: "Sent",              bg: "#EFF6FF",     color: "#2563EB", border: "#BFDBFE" },
  in_review: { label: "In review",         bg: "#FFFBEB",     color: "#D97706", border: "#FDE68A" },
  submitted:         { label: "Feedback received", bg: t.accent,  color: "#FFFFFF", border: t.accent },
  feedback_received: { label: "Feedback received", bg: t.accent,  color: "#FFFFFF", border: t.accent },
  viewed:            { label: "Viewed",             bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  won:               { label: "Won / Graduated",   bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  lost:      { label: "Lost",              bg: "#FEF2F2",     color: "#DC2626", border: "#FECACA" },
  converted: { label: "Converted",         bg: t.accent,      color: "#FFFFFF", border: t.accent },
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

function MetaField({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: t.text, lineHeight: 1.6 }}>{value}</div>
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

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      const [prRes] = await Promise.all([
        fetch(`/api/proposals/v2/${id}`, { headers }),
      ]);

      if (prRes.ok) {
        const pr = await prRes.json();
        setProposal(pr);
        document.title = `LexOps | ${pr.name || "Proposal"}`;
      }

      // Load submissions for this proposal
      const { data: subs } = await supabase
        .from("workflow_submissions")
        .select("*, workflow_runs(*, workflows(name))")
        .eq("proposal_id", id)
        .order("created_at", { ascending: false });

      const subList = subs || [];
      setSubmissions(subList);
      if (subList.length > 0) setSelectedSub(subList[0]);
    } finally {
      setLoading(false);
    }
  }

  async function markWon() {
    if (!proposal) return;
    setMarking(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/proposals/v2/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status: "won" }),
    });
    setProposal(p => ({ ...p, status: "won" }));
    setMarking(false);
  }

  function copyLink() {
    if (!proposal) return;
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.token}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const stageCount = proposal.workflows?.reduce((acc, wf) => acc + (wf.stages?.length || 0), 0) || 0;
  const btnBase = {
    background: "transparent", border: "none", cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, borderRadius: 7, padding: "7px 12px", transition: "all 0.12s",
  };

  // Extract matter details from selected submission
  const subData = selectedSub?.data || selectedSub?.response_data || {};

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`,
        padding: "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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

      {/* Body */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px" }}>
        {/* Back link */}
        <button
          onClick={() => navigate("/admin/proposals")}
          style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Back to proposals
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 28 }}>
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
              {[proposal.client_name, stageCount ? `${stageCount} stage${stageCount !== 1 ? "s" : ""}` : null, `Created ${fmtDate(proposal.created_at)}`].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={copyLink}
              onMouseEnter={() => setHovBtn("copy")} onMouseLeave={() => setHovBtn(null)}
              style={{
                ...btnBase, border: `1px solid ${t.border}`,
                color: copied ? t.accent : t.text,
                background: hovBtn === "copy" ? "#F0EDE6" : t.card,
              }}
            >
              {copied ? "✓ Copied" : "Copy link"}
            </button>
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
            {proposal.status !== "won" && (
              <button
                onClick={markWon}
                disabled={marking}
                onMouseEnter={() => setHovBtn("won")} onMouseLeave={() => setHovBtn(null)}
                style={{
                  ...btnBase, fontWeight: 600,
                  background: marking ? "#6B9999" : hovBtn === "won" ? t.accentHover : t.accent,
                  color: "#fff",
                }}
              >
                {marking ? "Marking…" : "Mark as Won / Graduated"}
              </button>
            )}
          </div>
        </div>

        {/* Content: two-column */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
          {/* Left: Submissions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMeta, marginBottom: 12 }}>
              Submissions ({submissions.length})
            </div>
            {submissions.length === 0 ? (
              <div style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
                padding: "24px 16px", textAlign: "center", color: t.textMeta, fontSize: 13,
              }}>
                No submissions yet.
                <br /><br />
                Once the client completes the workflow, their submission will appear here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {submissions.map(sub => {
                  const isSelected = selectedSub?.id === sub.id;
                  const data = sub.data || sub.response_data || {};
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSub(sub)}
                      style={{
                        background: t.card,
                        border: `1.5px solid ${isSelected ? t.accent : t.border}`,
                        borderRadius: 10, padding: "14px 16px",
                        cursor: "pointer", transition: "border-color 0.12s",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                        {data.client_name || proposal.client_contact_name || "Submission"}
                      </div>
                      <div style={{ color: t.textSub, fontSize: 12, marginBottom: 4 }}>
                        {data.matter_type || sub.workflow_runs?.workflows?.name || "—"}
                      </div>
                      <div style={{ color: t.textMeta, fontSize: 11 }}>{timeAgo(sub.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Matter details */}
          <div>
            {selectedSub ? (
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "28px 28px" }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 24, fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Matter details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <MetaField label="Client name" value={subData.client_name} />
                  <MetaField label="Matter type" value={subData.matter_type} />
                  <MetaField label="Key parties" value={subData.key_parties} />
                  <MetaField label="Complexity" value={subData.complexity} />
                </div>
                <MetaField label="Key facts" value={subData.key_facts} />
                <MetaField label="Additional notes" value={subData.additional_notes} />

                {/* Fallback: show raw data if known fields are empty */}
                {!subData.client_name && !subData.matter_type && (
                  <div style={{ color: t.textSub, fontSize: 13 }}>
                    <pre style={{ background: "#F7F6F2", borderRadius: 8, padding: 14, fontSize: 12, overflowX: "auto", margin: 0 }}>
                      {JSON.stringify(subData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
                padding: "64px 28px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: t.text }}>Awaiting client submission</div>
                <div style={{ color: t.textMeta, fontSize: 13, maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>
                  Once you send this proposal and the client completes their workflow, their matter details will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
