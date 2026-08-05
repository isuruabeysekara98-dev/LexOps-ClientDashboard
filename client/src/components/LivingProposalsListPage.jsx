// ---------------------------------------------------------------------------
// The proposal admin — list.
// ---------------------------------------------------------------------------
// Named "Proposals" throughout the UI: as of 5 Aug 2026 this *is* the proposal
// product. The older workflow-based builder (ProposalsListPage.jsx,
// /admin/proposals) is archived — its routes still resolve and its data is
// untouched, but nothing navigates to it. The file and route names here keep
// the `living-` prefix on purpose, so the two remain unambiguous in code even
// though only one has a name on screen.
// ---------------------------------------------------------------------------
// Scoped entirely to `/api/lp/admin/proposals`, which the server restricts to
// rows that carry a `proposal_graphs` row (see the comment on that endpoint) —
// so this list is never contaminated by the older v2/workflow proposals that
// share the same `proposals` table but were never given a graph.
//
// Three things a row can do, matching how the build was asked for:
//   - Edit    → navigates in-app to the graph editor.
//   - Preview → mints (or reuses) the one tracked link for this proposal and
//               opens it in a new tab, without emailing or changing state.
//   - Send    → the same link, but emailed, which is the deliberate act that
//               flips `state` to "sent" and starts the turn engine.
// There is deliberately no "invite another person" action here — one proposal,
// one tracked link. See the server route's own comment for why.
// ---------------------------------------------------------------------------
import { useState, useEffect, useRef } from "react";
import { Zap, ClipboardList, Trash2, Send, Eye, Pencil, Link as LinkIcon, Copy as CopyIcon } from "lucide-react";
import { supabase } from "@/lib/supabase.js";
import { fetchWithTimeout, useSlowHint } from "@/lib/loadUtils.js";

const t = {
  bg: "#FAFBFC", surface: "#F4F8FB", surfaceHigh: "#E4F1F8",
  card: "#FFFFFF", nav: "#FFFFFF",
  border: "#E8E8E8", borderLight: "rgba(0,0,0,0.08)",
  text: "#232A34", textSub: "#616568", textMeta: "#9DB5C9",
  accent: "#375971", accentHover: "#232A34", accentLight: "rgba(55,89,113,0.07)",
  red: "#C9542E", redSoft: "rgba(201,84,46,0.08)",
  shadow: "0 1px 4px rgba(35,42,52,0.06)", shadowHover: "0 4px 12px rgba(35,42,52,0.08)",
};

// The turn-engine states from `proposals.state` (living_proposal.sql's CHECK
// constraint) — a different vocabulary from the v2 list's `status` column, so
// this gets its own pill map rather than sharing STATUS_CFG.
const STATE_CFG = {
  draft:            { label: "Draft",             bg: "transparent",           color: t.textSub, border: t.border },
  sent:             { label: "Sent — with client", bg: "#E4F1F8",              color: "#375971", border: "rgba(55,89,113,0.18)" },
  feedback_shared:  { label: "Client replied",     bg: "rgba(240,169,60,0.12)", color: "#B06F00", border: "rgba(240,169,60,0.35)" },
  revised:          { label: "Revised — resend",   bg: "rgba(240,169,60,0.12)", color: "#B06F00", border: "rgba(240,169,60,0.35)" },
  won:              { label: "Won",                bg: "#E7F3EC",              color: "#3C7A52", border: "rgba(60,122,82,0.22)" },
  lost:             { label: "Lost",               bg: "rgba(201,84,46,0.08)", color: "#C9542E", border: "rgba(201,84,46,0.2)" },
};

function StatePill({ state }) {
  const cfg = STATE_CFG[state] || { label: state || "Draft", bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
  return (
    <span style={{
      display: "inline-block", background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, borderRadius: 99, padding: "4px 10px",
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={56} height={18} viewBox="0 0 307 97" fill="none">
        <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#232A34"/>
        <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#375971"/>
        <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#232A34"/>
      </svg>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: t.textSub, background: "#F0EDE6", border: `1px solid ${t.border}`,
        borderRadius: 4, padding: "2px 6px",
      }}>Admin</span>
    </div>
  );
}

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 6,
  border: "none", borderRadius: 8, padding: "8px 12px",
  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
  cursor: "pointer", transition: "background 0.12s",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
}

export default function LivingProposalsListPage({ navigate, onLogout }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const slowLoad = useSlowHint(loading);

  const [busyId, setBusyId] = useState(null);      // row currently running an action
  const [linkModal, setLinkModal] = useState(null); // { proposal, email, name, note, sending }
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { document.title = "LexOps | Proposals"; load(); }, []);

  async function load() {
    setLoading(true); setLoadError(null);
    try {
      const res = await fetchWithTimeout("/api/lp/admin/proposals", { headers: await authHeaders() });
      if (!res.ok) { setLoadError("We couldn't load the proposal list. Please try again."); return; }
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch (err) {
      console.error("[LivingProposalsListPage] load failed:", err?.message || err);
      setLoadError("We couldn't load the proposal list. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    // The one place this list departs from in-app navigation: creation opens
    // in its own window so a half-built proposal never costs the admin their
    // place in the list they were just looking at.
    window.open("/admin/living-proposals/new", "_blank", "noopener");
  }

  async function preview(p) {
    setBusyId(p.id);
    try {
      const res = await fetchWithTimeout(`/api/lp/admin/proposals/${p.id}/recipients`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          email: p.client_email || `preview+${p.id}@lex-ops.io`,
          name: p.client_contact_name || p.client_name,
          send: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Couldn't create a preview link."); return; }
      window.open(data.url, "_blank", "noopener");
      load();
    } finally {
      setBusyId(null);
    }
  }

  function openSendModal(p) {
    setLinkModal({
      proposal: p,
      email: p.client_email || "",
      name: p.client_contact_name || p.client_name || "",
      note: "",
      sending: false,
    });
  }

  async function confirmSend() {
    if (!linkModal) return;
    if (!linkModal.email.trim()) { alert("An email address is required."); return; }
    setLinkModal(m => ({ ...m, sending: true }));
    try {
      const res = await fetchWithTimeout(`/api/lp/admin/proposals/${linkModal.proposal.id}/recipients`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          email: linkModal.email.trim(),
          name: linkModal.name.trim() || null,
          note: linkModal.note.trim() || undefined,
          send: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Couldn't send the link."); setLinkModal(m => ({ ...m, sending: false })); return; }
      setLinkModal(null);
      load();
    } catch (err) {
      alert("Couldn't send the link — check your connection.");
      setLinkModal(m => ({ ...m, sending: false }));
    }
  }

  function copyLink(p) {
    if (!p.link?.url) return;
    navigator.clipboard.writeText(p.link.url).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((id) => (id === p.id ? null : id)), 1600);
    });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setBusyId(deleteConfirm.id);
    try {
      // The v2 delete route operates on the shared `proposals` table and
      // cascades every FK — including `proposal_graphs` — so it's correct to
      // reuse rather than duplicate here.
      const res = await fetchWithTimeout(`/api/proposals/v2/${deleteConfirm.id}`, {
        method: "DELETE", headers: await authHeaders(),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.message || "Couldn't delete this proposal."); return; }
      setDeleteConfirm(null);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Satoshi', sans-serif", color: t.text }}>
      <style>{`
        @font-face { font-family: 'Satoshi'; src: url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'); }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`,
        padding: mobile ? "0 12px" : "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 10 }}>
          <button onClick={() => navigate("/active-projects")} style={{ ...btnBase, color: t.textSub, background: "transparent" }}>
            ← Back
          </button>
          <div style={{ width: 1, height: 18, background: t.border }} />
          <Logo />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!mobile && (
            <button onClick={() => navigate("/active-projects")} style={{ ...btnBase, color: t.textSub, background: "transparent" }}>
              <Zap size={15} strokeWidth={2} /> Active Projects
            </button>
          )}
          <button onClick={openNew} style={{ ...btnBase, background: t.accent, color: "#fff", padding: "8px 16px" }}>
            + New proposal
          </button>
          <div style={{ width: 1, height: 18, background: t.border, margin: "0 6px" }} />
          <button onClick={onLogout} style={{ ...btnBase, color: t.textSub, background: "transparent" }}>
            Log out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: mobile ? "28px 14px" : "44px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Proposals</h1>
        </div>
        <p style={{ color: t.textSub, fontSize: 13.5, margin: "4px 0 28px", lineHeight: 1.5 }}>
          The interactive map, roadmap and investment pages your clients open at their own link.
          Editing here is what a client sees — there's no separate copy of this content anywhere else.
        </p>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            {slowLoad && <span style={{ color: t.textMeta, fontSize: 12 }}>Still loading — this is taking longer than usual.</span>}
          </div>
        )}

        {!loading && loadError && (
          <div style={{ padding: 24, background: t.redSoft, border: `1px solid rgba(201,84,46,0.2)`, borderRadius: 10, color: t.red, fontSize: 13.5 }}>
            {loadError} <button onClick={load} style={{ ...btnBase, color: t.red, background: "none", padding: 0, textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {!loading && !loadError && proposals.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px", background: t.card,
            border: `1px dashed ${t.border}`, borderRadius: 14,
          }}>
            <ClipboardList size={28} color={t.textMeta} strokeWidth={1.5} />
            <p style={{ margin: "14px 0 18px", color: t.textSub, fontSize: 14 }}>No living proposals yet.</p>
            <button onClick={openNew} style={{ ...btnBase, background: t.accent, color: "#fff", padding: "10px 18px" }}>
              + Create the first one
            </button>
          </div>
        )}

        {!loading && !loadError && proposals.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {proposals.map((p) => (
              <div key={p.id} style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
                padding: mobile ? "14px 16px" : "16px 20px",
                display: "flex", flexDirection: mobile ? "column" : "row",
                alignItems: mobile ? "stretch" : "center", gap: mobile ? 10 : 16,
                boxShadow: t.shadow,
              }}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/admin/living-proposals/${p.id}/edit`)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                    <StatePill state={p.state} />
                  </div>
                  <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 3 }}>
                    {p.client_name}{p.client_email ? ` · ${p.client_email}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.textMeta, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>{p.node_count} node{p.node_count === 1 ? "" : "s"}</span>
                    <span>{p.edge_count} edge{p.edge_count === 1 ? "" : "s"}</span>
                    <span>{p.preset}</span>
                    <span>Updated {timeAgo(p.graph_updated_at || p.updated_at)}</span>
                    {p.link && <span style={{ color: t.accent }}>Link opened{p.link.first_opened_at ? "" : " — not yet"}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate(`/admin/living-proposals/${p.id}/edit`)}
                    style={{ ...btnBase, color: t.textSub, background: t.surface }}
                    title="Edit the map, needs, roadmap and costing"
                  >
                    <Pencil size={13} strokeWidth={2} /> Edit
                  </button>
                  <button
                    onClick={() => preview(p)}
                    disabled={busyId === p.id || p.node_count === 0}
                    style={{ ...btnBase, color: t.textSub, background: t.surface, opacity: p.node_count === 0 ? 0.5 : 1 }}
                    title={p.node_count === 0 ? "Add at least one node before previewing" : "Open exactly what the client sees"}
                  >
                    <Eye size={13} strokeWidth={2} /> Preview
                  </button>
                  {p.link && (
                    <button
                      onClick={() => copyLink(p)}
                      style={{ ...btnBase, color: t.textSub, background: t.surface }}
                      title="Copy the client's link"
                    >
                      <CopyIcon size={13} strokeWidth={2} /> {copiedId === p.id ? "Copied" : "Copy link"}
                    </button>
                  )}
                  <button
                    onClick={() => openSendModal(p)}
                    disabled={p.node_count === 0}
                    style={{ ...btnBase, background: t.accent, color: "#fff", opacity: p.node_count === 0 ? 0.5 : 1 }}
                    title={p.node_count === 0 ? "Add at least one node before sending" : (p.link ? "Re-send the same link" : "Mint and send the link")}
                  >
                    <Send size={13} strokeWidth={2} /> {p.link ? "Re-send" : "Send"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(p)}
                    style={{ ...btnBase, color: t.red, background: "transparent", padding: "8px 8px" }}
                    title="Delete"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send-link modal */}
      {linkModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(35,42,52,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
        }} onClick={() => !linkModal.sending && setLinkModal(null)}>
          <div
            style={{ background: t.card, borderRadius: 16, width: "100%", maxWidth: 440, padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <LinkIcon size={17} color={t.accent} />
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
                {linkModal.proposal.link ? "Re-send the link" : "Send to the client"}
              </h2>
            </div>
            <p style={{ fontSize: 12.5, color: t.textSub, margin: "6px 0 18px", lineHeight: 1.5 }}>
              {linkModal.proposal.link
                ? "This proposal already has one tracked link — sending again reuses the same token, so nothing the client has already answered is affected."
                : "This mints the one link this proposal will ever have, and marks it sent."}
            </p>
            <label style={fieldLabel}>Email</label>
            <input
              type="email" value={linkModal.email}
              onChange={(e) => setLinkModal(m => ({ ...m, email: e.target.value }))}
              style={inp} placeholder="client@example.com"
            />
            <label style={{ ...fieldLabel, marginTop: 12 }}>Name</label>
            <input
              value={linkModal.name}
              onChange={(e) => setLinkModal(m => ({ ...m, name: e.target.value }))}
              style={inp} placeholder="Contact name"
            />
            <label style={{ ...fieldLabel, marginTop: 12 }}>Note (optional)</label>
            <textarea
              value={linkModal.note} rows={2}
              onChange={(e) => setLinkModal(m => ({ ...m, note: e.target.value }))}
              style={{ ...inp, resize: "vertical" }} placeholder="A line that appears above the button in the email"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setLinkModal(null)} disabled={linkModal.sending} style={{ ...btnBase, background: t.surface, color: t.textSub }}>
                Cancel
              </button>
              <button onClick={confirmSend} disabled={linkModal.sending} style={{ ...btnBase, background: t.accent, color: "#fff", padding: "8px 18px" }}>
                {linkModal.sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(35,42,52,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
        }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: t.card, borderRadius: 16, width: "100%", maxWidth: 420, padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Delete “{deleteConfirm.name}”?</h2>
            <p style={{ fontSize: 12.5, color: t.textSub, marginBottom: 20, lineHeight: 1.5 }}>
              This removes the proposal, its graph, every answer the client has given, and its link.
              This can't be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...btnBase, background: t.surface, color: t.textSub }}>Cancel</button>
              <button onClick={confirmDelete} disabled={busyId === deleteConfirm.id} style={{ ...btnBase, background: t.red, color: "#fff", padding: "8px 18px" }}>
                {busyId === deleteConfirm.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldLabel = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMeta, marginBottom: 6 };
const inp = {
  width: "100%", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13.5, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
