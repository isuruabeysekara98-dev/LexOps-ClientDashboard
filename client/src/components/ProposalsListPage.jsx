import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#FFFFFF", surface: "#F0F4F4", surfaceHigh: "#E5EDED",
  border: "#C5D4D4", text: "#082B2B", textSub: "#3A6666",
  accent: "#1A6666", accentLight: "#0F4444",
  shadow: "0 1px 3px rgba(8,43,43,0.06)",
};

const STATUS_META = {
  draft:      { label: "Draft",       bg: "#F3F4F6", color: "#6B7280" },
  sent:       { label: "Sent",        bg: "#EFF6FF", color: "#2563EB" },
  in_review:  { label: "In Review",   bg: "#FFFBEB", color: "#D97706" },
  submitted:  { label: "Submitted",   bg: "#F5F3FF", color: "#7C3AED" },
  won:        { label: "Won",         bg: "#F0FDF4", color: "#16A34A" },
  lost:       { label: "Lost",        bg: "#FEF2F2", color: "#DC2626" },
  converted:  { label: "Converted",   bg: "#F0F9F6", color: "#1A6666" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span style={{
      display: "inline-block",
      background: m.bg, color: m.color,
      border: `1px solid ${m.color}30`,
      borderRadius: 99, padding: "3px 10px",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}>
      {m.label}
    </span>
  );
}

function Logo() {
  return (
    <svg width={63} height={20} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#082B2B"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#1A6666"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#082B2B"/>
    </svg>
  );
}

export default function ProposalsListPage({ navigate }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "LexOps | Proposals";
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/proposals/v2", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load proposals");
      setProposals(await res.json());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function fmt(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, background: t.bg,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Logo />
          <div style={{ width: 1, height: 20, background: t.border }} />
          <button
            onClick={() => navigate("/")}
            style={{
              background: "transparent", border: "none", color: t.textSub,
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6, padding: 0,
            }}
          >
            ← Home
          </button>
          <div style={{ width: 1, height: 20, background: t.border }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Proposals</span>
        </div>
        <button
          onClick={() => navigate("/admin/proposals/new")}
          style={{
            background: t.accent, color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 16px", fontSize: 13,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + New Proposal
        </button>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
            fontFamily: "'Playfair Display', Georgia, serif",
            color: t.text, margin: 0, marginBottom: 4,
          }}>
            Proposals
          </h1>
          <p style={{ color: t.textSub, fontSize: 13, margin: 0 }}>
            All client proposals — drafts, sent, and submitted.
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : error ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "16px 20px", color: "#DC2626", fontSize: 13 }}>
            {error}
          </div>
        ) : proposals.length === 0 ? (
          <div style={{
            background: t.surface, border: `1px dashed ${t.border}`,
            borderRadius: 14, padding: "64px 0", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ color: t.text, fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No proposals yet</div>
            <div style={{ color: t.textSub, fontSize: 13, marginBottom: 24 }}>Create your first proposal to get started.</div>
            <button
              onClick={() => navigate("/admin/proposals/new")}
              style={{
                background: t.accent, color: "#fff", border: "none",
                borderRadius: 8, padding: "9px 20px", fontSize: 13,
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              + New Proposal
            </button>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: t.shadow }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 200px 120px 130px 100px",
              borderBottom: `1px solid ${t.border}`,
              padding: "0 20px",
            }}>
              {["Proposal", "Client email", "Status", "Created", ""].map((h, i) => (
                <div key={i} style={{
                  padding: "10px 8px", color: t.textSub,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {proposals.map((pr, i) => (
              <div
                key={pr.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 200px 120px 130px 100px",
                  padding: "0 20px",
                  borderBottom: i < proposals.length - 1 ? `1px solid ${t.border}` : "none",
                  alignItems: "center",
                }}
              >
                <div style={{ padding: "14px 8px" }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: t.text, marginBottom: 2 }}>{pr.name}</div>
                </div>
                <div style={{ padding: "14px 8px", color: t.textSub, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pr.client_email || <span style={{ color: t.border }}>—</span>}
                </div>
                <div style={{ padding: "14px 8px" }}>
                  <StatusBadge status={pr.status} />
                </div>
                <div style={{ padding: "14px 8px", color: t.textSub, fontSize: 13 }}>
                  {fmt(pr.created_at)}
                </div>
                <div style={{ padding: "14px 8px", display: "flex", gap: 6 }}>
                  <button
                    onClick={() => navigate(`/admin/proposals/${pr.id}/edit`)}
                    style={{
                      background: t.surface, border: `1px solid ${t.border}`,
                      borderRadius: 6, padding: "5px 12px", fontSize: 12,
                      color: t.text, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
