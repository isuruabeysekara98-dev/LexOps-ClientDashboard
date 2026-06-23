import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#F4F3EF",
  card: "#FFFFFF",
  nav: "#FFFFFF",
  border: "#E5E3DC",
  borderLight: "#EDEBE4",
  text: "#1A1A18",
  textSub: "#6B6B5F",
  textMeta: "#9B9B8F",
  accent: "#0B4F4F",
  accentHover: "#093C3C",
  accentLight: "rgba(11,79,79,0.08)",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.08)",
};

const STATUS_CFG = {
  draft:          { label: "Draft",             bg: "transparent",          color: t.textSub,   border: t.border },
  sent:           { label: "Sent",              bg: "#EFF6FF",              color: "#2563EB",   border: "#BFDBFE" },
  in_review:      { label: "In review",         bg: "#FFFBEB",              color: "#D97706",   border: "#FDE68A" },
  submitted:          { label: "Feedback received", bg: t.accent,  color: "#FFFFFF", border: t.accent },
  feedback_received:  { label: "Feedback received", bg: t.accent,  color: "#FFFFFF", border: t.accent },
  viewed:             { label: "Viewed",             bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  won:                { label: "Won / Graduated",   bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  lost:               { label: "Lost",              bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  converted:          { label: "Converted",         bg: t.accent,  color: "#FFFFFF", border: t.accent },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
  return (
    <span style={{
      display: "inline-block",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99, padding: "3px 10px",
      fontSize: 12, fontWeight: 500,
      whiteSpace: "nowrap",
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
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: t.textSub,
        background: "#F0EDE6", border: `1px solid ${t.border}`,
        borderRadius: 4, padding: "2px 6px",
      }}>Admin</span>
    </div>
  );
}

function IconCopy() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
}

export default function ProposalsListPage({ navigate, onLogout }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [hovCard, setHovCard] = useState(null);
  const [hovBtn, setHovBtn] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importTab, setImportTab] = useState("pdf");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptUploading, setTranscriptUploading] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);
  const fileInputRef = useRef(null);
  const txtInputRef = useRef(null);

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
      if (res.ok) setProposals(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(e, pr) {
    e.stopPropagation();
    const url = `${window.location.origin}/proposal/${pr.token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(pr.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleOpen(e, pr) {
    e.stopPropagation();
    window.open(`/proposal/${pr.token}`, "_blank");
  }

  function openImportModal(tab = "pdf") {
    setPdfFile(null);
    setPdfError(null);
    setTranscriptText("");
    setTranscriptError(null);
    setImportTab(tab);
    setImportModal(true);
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setPdfError("Only PDF files are supported.");
      return;
    }
    setPdfError(null);
    setPdfFile(file);
  }

  function handleTxtFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setTranscriptText(e.target.result || "");
    reader.readAsText(file);
    setTranscriptError(null);
  }

  async function submitPdf() {
    if (!pdfFile) return;
    setPdfUploading(true);
    setPdfError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", pdfFile);
      const res = await fetch("/api/proposals/v2/import-pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: form,
      });
      const j = await res.json();
      if (!res.ok) {
        setPdfError(j.message || "Import failed.");
      } else {
        setImportModal(false);
        navigate(`/admin/proposals/${j.id}`);
      }
    } catch {
      setPdfError("Network error — please try again.");
    } finally {
      setPdfUploading(false);
    }
  }

  async function submitTranscript() {
    const text = transcriptText.trim();
    if (!text || text.length < 20) {
      setTranscriptError("Please paste or upload a transcript with at least a few sentences.");
      return;
    }
    setTranscriptUploading(true);
    setTranscriptError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/proposals/v2/import-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ text }),
      });
      const j = await res.json();
      if (!res.ok) {
        setTranscriptError(j.message || "Import failed.");
      } else {
        setImportModal(false);
        navigate(`/admin/proposals/${j.id}`);
      }
    } catch {
      setTranscriptError("Network error — please try again.");
    } finally {
      setTranscriptUploading(false);
    }
  }

  const btnBase = {
    background: "transparent", border: "none", cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, borderRadius: 7, padding: "6px 10px", transition: "background 0.12s",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>

      {/* Nav */}
      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`,
        padding: "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/")}
            onMouseEnter={() => setHovBtn("home")}
            onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.textSub, background: hovBtn === "home" ? "#F0EDE6" : "transparent", gap: 4 }}
          >
            ← Back
          </button>
          <div style={{ width: 1, height: 18, background: t.border }} />
          <Logo />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => navigate("/active-projects")}
            onMouseEnter={() => setHovBtn("projects")}
            onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.textSub, background: hovBtn === "projects" ? "#F0EDE6" : "transparent" }}
          >
            ⚡ Active Projects
          </button>
          <button
            onClick={() => navigate("/admin/proposals")}
            onMouseEnter={() => setHovBtn("proposals")}
            onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.accent, fontWeight: 600, background: hovBtn === "proposals" ? t.accentLight : "transparent" }}
          >
            <IconGrid /> Proposals
          </button>
          <button
            onClick={() => openImportModal("pdf")}
            onMouseEnter={() => setHovBtn("import")}
            onMouseLeave={() => setHovBtn(null)}
            style={{
              ...btnBase,
              border: `1px solid ${t.border}`,
              color: t.text,
              background: hovBtn === "import" ? "#F0EDE6" : t.card,
            }}
          >
            ⬆ Import
          </button>
          <button
            onClick={() => navigate("/admin/proposals/new")}
            onMouseEnter={() => setHovBtn("new")}
            onMouseLeave={() => setHovBtn(null)}
            style={{
              ...btnBase,
              background: hovBtn === "new" ? t.accentHover : t.accent,
              color: "#fff", fontWeight: 600, paddingLeft: 14, paddingRight: 14,
            }}
          >
            + New proposal
          </button>
          <div style={{ width: 1, height: 18, background: t.border, margin: "0 6px" }} />
          <button
            onClick={onLogout}
            onMouseEnter={() => setHovBtn("logout")}
            onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, color: t.textSub, background: hovBtn === "logout" ? "#F0EDE6" : "transparent" }}
          >
            <IconLogout /> Log out
          </button>
        </div>
      </nav>

      {/* Body */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
              fontFamily: "'Playfair Display', Georgia, serif", color: t.text,
              lineHeight: 1.15,
            }}>
              Proposals
            </h1>
            {!loading && (
              <p style={{ margin: "4px 0 0", color: t.textMeta, fontSize: 13 }}>
                {proposals.length} total
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/admin/proposals/new")}
            onMouseEnter={() => setHovBtn("new2")}
            onMouseLeave={() => setHovBtn(null)}
            style={{
              ...btnBase,
              background: hovBtn === "new2" ? t.accentHover : t.accent,
              color: "#fff", fontWeight: 600, paddingLeft: 16, paddingRight: 16, fontSize: 13,
            }}
          >
            + New proposal
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div style={{ width: 26, height: 26, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : proposals.length === 0 ? (
          <div style={{
            background: t.card, border: `1.5px dashed ${t.border}`, borderRadius: 14,
            padding: "64px 0", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
            <div style={{ color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No proposals yet</div>
            <div style={{ color: t.textMeta, fontSize: 13, marginBottom: 24 }}>Create your first proposal to get started.</div>
            <button
              onClick={() => navigate("/admin/proposals/new")}
              style={{ ...btnBase, background: t.accent, color: "#fff", fontWeight: 600, padding: "9px 20px", margin: "0 auto" }}
            >
              + New proposal
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {proposals.map(pr => {
              const isHov = hovCard === pr.id;
              const isDraft = pr.status === "draft";
              const title = pr.name || "";
              const clientName = pr.client_name || "";
              const contact = pr.client_contact_name || "";
              const stageCount = pr.stage_count ?? 0;

              const meta = [clientName, `${stageCount} stage${stageCount !== 1 ? "s" : ""}`, contact]
                .filter(Boolean).join(" · ");

              return (
                <div
                  key={pr.id}
                  onClick={() => navigate(`/admin/proposals/${pr.id}`)}
                  onMouseEnter={() => setHovCard(pr.id)}
                  onMouseLeave={() => setHovCard(null)}
                  style={{
                    background: t.card,
                    border: `1px solid ${isHov ? "#C8C5BC" : t.border}`,
                    borderRadius: 12, padding: "18px 22px",
                    boxShadow: isHov ? t.shadowHover : t.shadow,
                    cursor: "pointer", transition: "all 0.12s",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isDraft && !title ? (
                      <div style={{ marginBottom: 5 }}>
                        <StatusPill status="draft" />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>
                          {title || <span style={{ color: t.textMeta }}>Untitled</span>}
                        </span>
                        {!isDraft && <StatusPill status={pr.status} />}
                        {isDraft && <StatusPill status="draft" />}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: t.textSub }}>{meta}</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: t.textMeta, whiteSpace: "nowrap" }}>
                      {timeAgo(pr.updated_at || pr.created_at)}
                    </span>

                    {!isDraft && (
                      <>
                        <button
                          onClick={e => handleCopy(e, pr)}
                          title={copied === pr.id ? "Copied!" : "Copy link"}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: copied === pr.id ? t.accent : t.textMeta, padding: 4, borderRadius: 5,
                            display: "flex", alignItems: "center",
                          }}
                        >
                          <IconCopy />
                        </button>
                        <button
                          onClick={e => handleOpen(e, pr)}
                          title="Open proposal"
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: t.textMeta, padding: 4, borderRadius: 5,
                            display: "flex", alignItems: "center",
                          }}
                        >
                          <IconExternalLink />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: "none" }}
        onChange={e => handleFileSelect(e.target.files?.[0])}
      />
      <input
        ref={txtInputRef}
        type="file"
        accept=".txt,.md,text/plain"
        style={{ display: "none" }}
        onChange={e => handleTxtFileSelect(e.target.files?.[0])}
      />

      {/* Import Modal */}
      {importModal && (
        <div
          onClick={() => !pdfUploading && !transcriptUploading && setImportModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(8,43,43,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: t.card, borderRadius: 16, width: "100%", maxWidth: 520,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "22px 28px 0",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 3 }}>
                  Import proposal
                </div>
                <div style={{ fontSize: 12, color: t.textMeta, lineHeight: 1.5 }}>
                  AI auto-generates client details, pain points, objectives, and a full workflow
                </div>
              </div>
              <button
                onClick={() => setImportModal(false)}
                disabled={pdfUploading || transcriptUploading}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: t.textMeta, fontSize: 20, lineHeight: 1, padding: 4,
                  opacity: pdfUploading || transcriptUploading ? 0.4 : 1,
                  marginTop: -2,
                }}
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", gap: 0, padding: "16px 28px 0",
              borderBottom: `1px solid ${t.border}`,
            }}>
              {[
                { id: "pdf", label: "📄 PDF" },
                { id: "transcript", label: "📝 Transcript" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setImportTab(tab.id); setPdfError(null); setTranscriptError(null); }}
                  disabled={pdfUploading || transcriptUploading}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 13, fontWeight: importTab === tab.id ? 600 : 400,
                    color: importTab === tab.id ? t.accent : t.textSub,
                    padding: "8px 16px",
                    borderBottom: importTab === tab.id ? `2px solid ${t.accent}` : "2px solid transparent",
                    marginBottom: -1, transition: "all 0.12s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* PDF tab */}
            {importTab === "pdf" && (
              <div style={{ padding: "24px 28px 0" }}>
                <div
                  onClick={() => !pdfUploading && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); if (!pdfUploading) setPdfDragOver(true); }}
                  onDragLeave={() => setPdfDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setPdfDragOver(false);
                    if (!pdfUploading) handleFileSelect(e.dataTransfer.files?.[0]);
                  }}
                  style={{
                    border: `2px dashed ${pdfDragOver ? t.accent : pdfFile ? t.accent : t.border}`,
                    borderRadius: 12, padding: "32px 20px", textAlign: "center",
                    cursor: pdfUploading ? "default" : "pointer",
                    background: pdfDragOver ? "#E8F4F4" : pdfFile ? "#F0F7F7" : "#FAFAF8",
                    transition: "all 0.15s",
                  }}
                >
                  {pdfFile ? (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 4 }}>{pdfFile.name}</div>
                      <div style={{ fontSize: 12, color: t.textMeta }}>{(pdfFile.size / 1024).toFixed(0)} KB · Click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📑</div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: t.text, marginBottom: 4 }}>Drop a PDF here or click to browse</div>
                      <div style={{ fontSize: 12, color: t.textMeta }}>Up to 20 MB · Text-based PDFs only (not scanned)</div>
                    </>
                  )}
                </div>

                {pdfError && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>
                    {pdfError}
                  </div>
                )}
                {pdfUploading && (
                  <div style={{ marginTop: 12, padding: 14, textAlign: "center", background: "#E8F4F4", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div style={{ width: 18, height: 18, border: `2px solid rgba(11,79,79,0.2)`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 13, color: t.accent, fontWeight: 500 }}>Reading PDF · generating workflows with AI…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transcript tab */}
            {importTab === "transcript" && (
              <div style={{ padding: "24px 28px 0" }}>
                <textarea
                  value={transcriptText}
                  onChange={e => { setTranscriptText(e.target.value); setTranscriptError(null); }}
                  disabled={transcriptUploading}
                  placeholder="Paste a meeting transcript, discovery call notes, or any written summary describing the client's needs and scope…"
                  style={{
                    width: "100%", minHeight: 200, resize: "vertical",
                    border: `1.5px solid ${t.border}`, borderRadius: 10,
                    padding: "14px 16px", fontFamily: "inherit", fontSize: 13,
                    color: t.text, background: "#FAFAF8", lineHeight: 1.6,
                    outline: "none", boxSizing: "border-box",
                    opacity: transcriptUploading ? 0.6 : 1,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: t.textMeta }}>or</span>
                  <button
                    onClick={() => txtInputRef.current?.click()}
                    disabled={transcriptUploading}
                    style={{
                      background: "none", border: `1px solid ${t.border}`, borderRadius: 6,
                      padding: "5px 12px", fontSize: 12, color: t.textSub,
                      fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    Upload .txt file
                  </button>
                  {transcriptText.length > 0 && (
                    <span style={{ fontSize: 12, color: t.textMeta, marginLeft: "auto" }}>
                      {transcriptText.length.toLocaleString()} characters
                    </span>
                  )}
                </div>
                {transcriptError && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626" }}>
                    {transcriptError}
                  </div>
                )}
                {transcriptUploading && (
                  <div style={{ marginTop: 12, padding: 14, textAlign: "center", background: "#E8F4F4", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div style={{ width: 18, height: 18, border: `2px solid rgba(11,79,79,0.2)`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 13, color: t.accent, fontWeight: 500 }}>Reading transcript · generating workflows with AI…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: "20px 28px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setImportModal(false)}
                disabled={pdfUploading || transcriptUploading}
                style={{
                  padding: "9px 18px", borderRadius: 8,
                  border: `1px solid ${t.border}`, background: "transparent",
                  color: t.textSub, fontFamily: "inherit", fontSize: 13,
                  cursor: pdfUploading || transcriptUploading ? "default" : "pointer",
                  opacity: pdfUploading || transcriptUploading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              {importTab === "pdf" && (
                <button
                  onClick={submitPdf}
                  disabled={!pdfFile || pdfUploading}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: !pdfFile || pdfUploading ? t.border : t.accent,
                    color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                    cursor: !pdfFile || pdfUploading ? "default" : "pointer",
                  }}
                >
                  {pdfUploading ? "Importing…" : "Import & create draft →"}
                </button>
              )}
              {importTab === "transcript" && (
                <button
                  onClick={submitTranscript}
                  disabled={transcriptText.trim().length < 20 || transcriptUploading}
                  style={{
                    padding: "9px 20px", borderRadius: 8, border: "none",
                    background: transcriptText.trim().length < 20 || transcriptUploading ? t.border : t.accent,
                    color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                    cursor: transcriptText.trim().length < 20 || transcriptUploading ? "default" : "pointer",
                  }}
                >
                  {transcriptUploading ? "Importing…" : "Import & create draft →"}
                </button>
              )}
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}
