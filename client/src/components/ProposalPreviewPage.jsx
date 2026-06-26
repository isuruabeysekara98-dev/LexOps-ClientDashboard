import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase.js";
import ProposalPage from "./ProposalPage.jsx";

const ta = {
  accent: "#375971",
  border: "#E8E8E8",
  text: "#232A34",
  textSub: "#616568",
};

export default function ProposalPreviewPage({ id, navigate }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/v2/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token || null);
        document.title = `Preview — ${data.name || "Proposal"}`;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Satoshi', sans-serif" }}>

      {/* Admin preview banner — sticky */}
      <div style={{
        background: ta.accent, color: "#fff",
        padding: "9px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 13, fontWeight: 500, position: "sticky", top: 0, zIndex: 200,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Eye size={15} strokeWidth={2} style={{ opacity: 0.7, flexShrink: 0 }} />
          <span>Preview mode — this is exactly what the client will see</span>
        </div>
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
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, border: `2px solid ${ta.border}`, borderTop: `2px solid ${ta.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : !token ? (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ color: ta.textSub }}>Proposal not found.</div>
          <button onClick={() => navigate("/admin/proposals")} style={{ background: "none", border: "none", color: ta.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            ← Back to proposals
          </button>
        </div>
      ) : (
        <ProposalPage token={token} previewMode={true} />
      )}
    </div>
  );
}
