import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase.js";
import { fetchWithTimeout, useSlowHint } from "@/lib/loadUtils.js";
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
  const [loadError, setLoadError] = useState(null);
  const slowLoad = useSlowHint(loading);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetchWithTimeout(`/api/proposals/v2/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token || null);
        document.title = `Preview — ${data.name || "Proposal"}`;
      } else if (res.status !== 404) {
        // 5xx / auth — a real, retryable error rather than a genuinely-missing proposal.
        setLoadError("We couldn't load this preview. Please try again.");
      }
    } catch (err) {
      console.error("[ProposalPreviewPage] load failed:", err?.message || err);
      setLoadError("We couldn't load this preview. Please check your connection and try again.");
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
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <div style={{ width: 28, height: 28, border: `2px solid ${ta.border}`, borderTop: `2px solid ${ta.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ color: ta.textSub, fontSize: 13 }}>Loading preview…</span>
          {slowLoad && <span style={{ color: ta.textSub, fontSize: 12, opacity: 0.8, maxWidth: 300, lineHeight: 1.5 }}>This is taking longer than usual — still working on it.</span>}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : loadError ? (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, textAlign: "center", padding: 24 }}>
          <div style={{ color: ta.text, fontSize: 15, fontWeight: 600, maxWidth: 340, lineHeight: 1.4 }}>{loadError}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => load()} style={{ background: ta.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
            <button onClick={() => navigate("/admin/proposals")} style={{ background: "none", border: `1px solid ${ta.border}`, borderRadius: 8, padding: "9px 18px", color: ta.textSub, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>← Back to proposals</button>
          </div>
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
