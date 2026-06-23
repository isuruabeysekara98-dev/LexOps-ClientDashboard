import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#F4F3EF", card: "#FFFFFF",
  border: "#E5E3DC", text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentHover: "#093C3C",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function ProposalPreviewPage({ id, navigate }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/v2/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProposal(data);
        document.title = `Preview | ${data.name || "Proposal"}`;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>

      {/* Preview banner */}
      <div style={{
        background: t.accent, color: "#fff",
        padding: "8px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 13, fontWeight: 500,
      }}>
        <span>👁 Preview mode — this is what the client will see</span>
        <button
          onClick={() => navigate(`/admin/proposals/${id}`)}
          style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff", borderRadius: 6, padding: "5px 14px",
            cursor: "pointer", fontFamily: "inherit", fontSize: 13,
          }}
        >
          ← Back to proposal
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
          <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : !proposal ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 0", flexDirection: "column", gap: 12 }}>
          <div style={{ color: t.textSub }}>Proposal not found.</div>
          <button onClick={() => navigate("/admin/proposals")} style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            ← Back to proposals
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px" }}>

          {/* Proposal header */}
          <div style={{ marginBottom: 40, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: t.textMeta, marginBottom: 12, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {proposal.client_name}
            </div>
            <h1 style={{
              margin: "0 0 12px",
              fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em",
              fontFamily: "'Playfair Display', Georgia, serif",
              lineHeight: 1.2,
            }}>
              {proposal.name || "Untitled Proposal"}
            </h1>
            {proposal.description && (
              <p style={{ color: t.textSub, fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
                {proposal.description}
              </p>
            )}
          </div>

          {/* Placeholder content */}
          <div style={{
            background: t.card, border: `1.5px dashed ${t.border}`, borderRadius: 14,
            padding: "60px 40px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🚧</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>
              Client view coming soon
            </div>
            <div style={{ color: t.textMeta, fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
              This is the scaffolding for the client-facing proposal preview. The full layout — workflow stages, stats, inputs, outputs, and submission form — will be built here.
            </div>

            {/* Stage count summary */}
            {proposal.workflows?.length > 0 && (
              <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {proposal.workflows.map((wf, wi) => (
                  <div key={wi} style={{
                    background: "#F7F6F2", border: `1px solid ${t.border}`, borderRadius: 8,
                    padding: "10px 18px", fontSize: 13, color: t.textSub,
                  }}>
                    {wf.emoji || "⚙️"} {wf.name} · {wf.stages?.length || 0} stage{(wf.stages?.length || 0) !== 1 ? "s" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
