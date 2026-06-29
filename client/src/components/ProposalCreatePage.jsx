import { useState, useEffect } from "react";
import { Trash2, Zap, ClipboardList, Frown, Target, LayoutTemplate, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#FAFBFC",
  surface: "#F4F8FB",
  surfaceHigh: "#E4F1F8",
  card: "#FFFFFF",
  nav: "#FFFFFF",
  border: "#E8E8E8",
  borderLight: "rgba(0,0,0,0.08)",
  text: "#232A34",
  textSub: "#616568",
  textMeta: "#9DB5C9",
  accent: "#375971",
  accentHover: "#232A34",
  accentLight: "rgba(55,89,113,0.07)",
  red: "#C9542E",
  redSoft: "rgba(201,84,46,0.08)",
  shadow: "0 1px 4px rgba(35,42,52,0.06)",
};

const inp = {
  background: "#FFFFFF",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#232A34",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  width: "100%",
};

function Eyebrow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#9DB5C9", display: "inline-block" }} />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#616568" }}>{label}</span>
    </div>
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

const DEFAULT_STAGES = [
  { title: "Client intake form", emoji: "📋", description: "Collect initial matter details from the client", stats: [{ value: "<2 min", label: "Avg completion" }], inputs: [{ emoji: "📄", label: "Matter description", detail: "Overview of the legal matter" }], outputs: [{ label: "Completed intake form", detail: "Structured matter summary" }] },
  { title: "Document review", emoji: "🔍", description: "Review all submitted documents and identify gaps", stats: [], inputs: [{ emoji: "📁", label: "Supporting documents", detail: "Any relevant documents" }], outputs: [{ label: "Document checklist", detail: "Reviewed and flagged" }] },
  { title: "Legal assessment", emoji: "⚖️", description: "Conduct legal analysis and draft recommendations", stats: [], inputs: [], outputs: [{ label: "Legal assessment report", detail: "Structured recommendations" }] },
  { title: "Final delivery", emoji: "📝", description: "Deliver completed work product to the client", stats: [], inputs: [], outputs: [{ label: "Completed deliverable", detail: "Ready for client sign-off" }] },
];

function defaultStage() {
  return { id: null, title: "", emoji: "📋", description: "", stats: [], inputs: [], outputs: [] };
}

function SubRow({ label, items, onAdd, onDel, onSet, addLabel, renderItem }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMeta }}>
          {label}
        </span>
        <button onClick={onAdd} style={{
          background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: 12, color: t.accent, fontWeight: 600, padding: "2px 0",
        }}>
          + {addLabel}
        </button>
      </div>
      {items.length === 0 && (
        <div style={{ color: t.textMeta, fontSize: 12, fontStyle: "italic" }}>None yet</div>
      )}
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
          {renderItem(item, i)}
          <button onClick={() => onDel(i)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: t.red, padding: "2px 4px", flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center",
          }}><Trash2 size={14} strokeWidth={1.75} /></button>
        </div>
      ))}
    </div>
  );
}

export default function ProposalCreatePage({ navigate, editId = null, onLogout }) {
  const [proposalId, setProposalId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saveMsg, setSaveMsg] = useState(null);
  const [expanded, setExpanded] = useState(new Set([0]));
  const [hovBtn, setHovBtn] = useState(null);

  const [form, setForm] = useState({
    name: "",
    client_name: "",
    client_contact_name: "",
    client_email: "",
    pain_points: [""],
    objectives: [""],
    workflows: [{ id: null, name: "Workflow 1", emoji: "⚙️", show_try_matter: false, stages: [] }],
  });

  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.title = editId ? "LexOps | Edit Proposal" : "LexOps | New Proposal";
    if (editId) loadEdit();
  }, [editId]);

  async function loadEdit() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/v2/${editId}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setProposalId(data.id);
      setForm({
        name: data.name || "",
        client_name: data.client_name || "",
        client_contact_name: data.client_contact_name || "",
        client_email: data.client_email || "",
        pain_points: data.pain_points?.length ? data.pain_points : [""],
        objectives: data.objectives?.length ? data.objectives : [""],
        workflows: (data.workflows || []).length ? data.workflows.map(wf => ({
          id: wf.id, name: wf.name || "", emoji: wf.emoji || "⚙️",
          show_try_matter: wf.show_try_matter === true,
          stages: (wf.stages || []).map(s => ({
            id: s.id, title: s.title || "", emoji: s.emoji || "📋",
            description: s.description || "",
            stats: s.stats || [], inputs: s.inputs || [], outputs: s.outputs || [],
          })),
        })) : [{ id: null, name: "Workflow 1", emoji: "⚙️", show_try_matter: false, stages: [] }],
      });
      const expandedSet = new Set();
      if (data.workflows?.[0]?.stages?.length) expandedSet.add(`0-0`);
      setExpanded(expandedSet);
    } finally {
      setLoadingEdit(false);
    }
  }

  // ── Stage helpers ─────────────────────────────────────────────────────────
  const getStages = (wi) => form.workflows[wi]?.stages || [];

  const setStages = (wi, newStages) => setForm(f => ({
    ...f, workflows: f.workflows.map((wf, i) => i !== wi ? wf : { ...wf, stages: newStages }),
  }));

  const setStageField = (wi, si, k, v) => setStages(wi,
    getStages(wi).map((s, j) => j !== si ? s : { ...s, [k]: v })
  );

  const addStage = (wi) => {
    const si = getStages(wi).length;
    setStages(wi, [...getStages(wi), defaultStage()]);
    setExpanded(e => new Set([...e, `${wi}-${si}`]));
  };

  const delStage = (wi, si) => {
    setStages(wi, getStages(wi).filter((_, j) => j !== si));
    setExpanded(e => { const n = new Set(e); n.delete(`${wi}-${si}`); return n; });
  };

  const moveStage = (wi, si, dir) => {
    const stages = [...getStages(wi)];
    const ni = si + dir;
    if (ni < 0 || ni >= stages.length) return;
    [stages[si], stages[ni]] = [stages[ni], stages[si]];
    setStages(wi, stages);
  };

  const toggleExpanded = (key) => setExpanded(e => {
    const n = new Set(e);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  const useDefaultTemplate = (wi) => {
    const stages = DEFAULT_STAGES.map(s => ({ ...s, id: null }));
    setStages(wi, stages);
    setExpanded(new Set(stages.map((_, si) => `${wi}-${si}`)));
  };

  // Sub-array helpers
  const setSubArr = (wi, si, key, arr) => setStageField(wi, si, key, arr);
  const addSub = (wi, si, key, item) => {
    const s = getStages(wi)[si];
    setStageField(wi, si, key, [...(s[key] || []), item]);
  };
  const delSub = (wi, si, key, di) => {
    const s = getStages(wi)[si];
    setStageField(wi, si, key, (s[key] || []).filter((_, j) => j !== di));
  };
  const setSub = (wi, si, key, di, field, val) => {
    const s = getStages(wi)[si];
    const arr = (s[key] || []).map((item, j) => j !== di ? item : { ...item, [field]: val });
    setStageField(wi, si, key, arr);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    setSaveMsg(null);
    if (!form.name.trim()) { setSaveMsg({ ok: false, text: "Proposal name is required." }); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };

      const body = {
        id: proposalId,
        name: form.name,
        client_name: form.client_name,
        client_contact_name: form.client_contact_name,
        client_email: form.client_email,
        pain_points: form.pain_points.filter(v => v.trim()),
        objectives: form.objectives.filter(v => v.trim()),
        workflows: form.workflows,
      };

      const saveRes = await fetch("/api/proposals/v2", { method: "POST", headers, body: JSON.stringify(body) });
      if (!saveRes.ok) {
        const j = await saveRes.json().catch(() => ({}));
        setSaveMsg({ ok: false, text: j.message || "Save failed." });
        return;
      }
      const { id } = await saveRes.json();
      if (!proposalId) setProposalId(id);

      setSaveMsg({ ok: true, text: "Saved" });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingEdit) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const btnBase = {
    background: "transparent", border: "none", cursor: "pointer",
    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, borderRadius: 8, padding: "8px 12px", transition: "all 0.2s",
    whiteSpace: "nowrap",
  };

  return (
    <div className="lx-create" style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Satoshi', sans-serif", color: t.text }}>
      <style>{`
        @font-face { font-family: 'Satoshi'; src: url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'); }
        @keyframes spin{to{transform:rotate(360deg)}}
        .lx-create input:focus, .lx-create textarea:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accentLight}; }
      `}</style>

      {/* Nav */}
      <nav style={{
        background: t.nav, borderBottom: `1px solid ${t.border}`,
        padding: mobile ? "0 12px" : "0 28px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!mobile && (
            <button
              onClick={() => navigate("/active-projects")}
              onMouseEnter={() => setHovBtn("projects")} onMouseLeave={() => setHovBtn(null)}
              style={{ ...btnBase, color: t.textSub, background: hovBtn === "projects" ? "#F0EDE6" : "transparent" }}
            >
              <Zap size={15} strokeWidth={2} /> Active Projects
            </button>
          )}
          {!mobile && (
            <button
              onClick={() => navigate("/admin/proposals")}
              onMouseEnter={() => setHovBtn("proposals")} onMouseLeave={() => setHovBtn(null)}
              style={{ ...btnBase, color: t.accent, fontWeight: 600, background: hovBtn === "proposals" ? t.accentLight : "transparent" }}
            >
              <ClipboardList size={15} strokeWidth={2} /> Proposals
            </button>
          )}
          <div style={{ width: 1, height: 18, background: t.border, margin: "0 6px" }} />
          {onLogout && (
            <button
              onClick={onLogout}
              onMouseEnter={() => setHovBtn("logout")} onMouseLeave={() => setHovBtn(null)}
              style={{ ...btnBase, color: t.textSub, background: hovBtn === "logout" ? "#F0EDE6" : "transparent" }}
            >
              {mobile ? "→" : "Log out"}
            </button>
          )}
        </div>
      </nav>

      {/* Body */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "36px 24px 80px" }}>
        {/* Back */}
        <button
          onClick={() => navigate("/admin/proposals")}
          style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 5 }}
        >
          ← Back to proposals
        </button>

        <h1 style={{ margin: "0 0 28px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {editId ? "Edit proposal" : "New proposal"}
        </h1>

        {/* Section: Basic details */}
        <div style={{ background: t.card, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 24px", marginBottom: 16, boxShadow: t.shadow }}>
          <Eyebrow label="Basic details" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>
                Proposal name
              </label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Probate & Estates — Okafor & Partners" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>
                Client company
              </label>
              <input style={inp} value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="e.g. Okafor & Partners" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>
                Contact name
              </label>
              <input style={inp} value={form.client_contact_name} onChange={e => setForm(f => ({ ...f, client_contact_name: e.target.value }))} placeholder="e.g. Margaret Okafor" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 6 }}>
                Client email
              </label>
              <input style={inp} type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="client@example.com" />
            </div>
          </div>
        </div>

        {/* Client context: Pain points + Objectives */}
        <div style={{ background: t.card, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 24px", marginBottom: 16, boxShadow: t.shadow }}>
          <Eyebrow label="Client context" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Pain points */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.text, display: "inline-flex", alignItems: "center", gap: 6 }}><Frown size={14} strokeWidth={2} /> Pain points</label>
                <button
                  onClick={() => setForm(f => ({ ...f, pain_points: [...f.pain_points, ""] }))}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: t.accent, fontWeight: 600, padding: 0 }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {form.pain_points.map((pt, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      style={{ ...inp, flex: 1 }}
                      value={pt}
                      onChange={e => setForm(f => ({ ...f, pain_points: f.pain_points.map((v, j) => j === i ? e.target.value : v) }))}
                      placeholder={`e.g. Manual document review`}
                    />
                    {form.pain_points.length > 1 && (
                      <button
                        onClick={() => setForm(f => ({ ...f, pain_points: f.pain_points.filter((_, j) => j !== i) }))}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: t.red, padding: "2px 4px", flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                      ><Trash2 size={14} strokeWidth={1.75} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Objectives */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.text, display: "inline-flex", alignItems: "center", gap: 6 }}><Target size={14} strokeWidth={2} /> Objectives</label>
                <button
                  onClick={() => setForm(f => ({ ...f, objectives: [...f.objectives, ""] }))}
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: t.accent, fontWeight: 600, padding: 0 }}
                >
                  + Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {form.objectives.map((ob, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      style={{ ...inp, flex: 1 }}
                      value={ob}
                      onChange={e => setForm(f => ({ ...f, objectives: f.objectives.map((v, j) => j === i ? e.target.value : v) }))}
                      placeholder={`e.g. Automate intake process`}
                    />
                    {form.objectives.length > 1 && (
                      <button
                        onClick={() => setForm(f => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }))}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: t.red, padding: "2px 4px", flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
                      ><Trash2 size={14} strokeWidth={1.75} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Stages */}
        {form.workflows.map((wf, wi) => {
          const stages = getStages(wi);
          return (
            <div key={wi} style={{ background: t.card, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "24px 24px", marginBottom: 16, boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Eyebrow label="Workflow stages" />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* show_try_matter toggle */}
                  <div title={`When on, clients see a 3-step wizard to run their own case through this workflow`} style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, padding: "5px 12px", background: wf.show_try_matter ? "rgba(55,89,113,0.08)" : t.surface, border: `1px solid ${wf.show_try_matter ? "rgba(55,89,113,0.22)" : t.border}`, borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }} onClick={() => setForm(f => ({ ...f, workflows: f.workflows.map((w, j) => j !== wi ? w : { ...w, show_try_matter: !w.show_try_matter }) }))}>
                    <div style={{ width: 30, height: 17, borderRadius: 9, background: wf.show_try_matter ? t.accent : "#C9C7BC", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: wf.show_try_matter ? 14 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: wf.show_try_matter ? t.accent : t.textSub, whiteSpace: "nowrap" }}>Try your case</span>
                  </div>
                  <button
                    onClick={() => useDefaultTemplate(wi)}
                    onMouseEnter={() => setHovBtn(`tpl-${wi}`)} onMouseLeave={() => setHovBtn(null)}
                    style={{
                      ...btnBase, border: `1px solid rgba(0,0,0,0.2)`, color: t.text, fontSize: 12,
                      background: hovBtn === `tpl-${wi}` ? t.accentLight : "transparent",
                      padding: "6px 16px",
                    }}
                  >
                    <LayoutTemplate size={14} strokeWidth={1.75} /> Use default template
                  </button>
                  <button
                    onClick={() => addStage(wi)}
                    onMouseEnter={() => setHovBtn(`add-${wi}`)} onMouseLeave={() => setHovBtn(null)}
                    style={{
                      ...btnBase, border: `1px solid rgba(0,0,0,0.2)`, color: t.text, fontSize: 12,
                      background: hovBtn === `add-${wi}` ? t.accentLight : "transparent",
                      padding: "6px 16px",
                    }}
                  >
                    + Add stage
                  </button>
                </div>
              </div>

              {stages.length === 0 ? (
                <div style={{
                  border: `1.5px dashed rgba(0,0,0,0.12)`, borderRadius: 12,
                  padding: "40px 0", textAlign: "center", background: t.surface,
                }}>
                  <div style={{ color: t.textMeta, fontSize: 13, marginBottom: 16 }}>
                    No stages yet. Use the default template or build from scratch.
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button
                      onClick={() => useDefaultTemplate(wi)}
                      style={{ ...btnBase, border: "1px solid rgba(0,0,0,0.2)", color: t.text, fontSize: 13, padding: "10px 24px", background: "transparent" }}
                    >
                      <LayoutTemplate size={14} strokeWidth={1.75} /> Use default template
                    </button>
                    <button
                      onClick={() => addStage(wi)}
                      style={{ ...btnBase, border: "1px solid rgba(0,0,0,0.2)", color: t.text, fontSize: 13, padding: "10px 24px", background: "transparent" }}
                    >
                      + Add blank stage
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stages.map((s, si) => {
                    const key = `${wi}-${si}`;
                    const isOpen = expanded.has(key);
                    return (
                      <div key={si} style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: t.shadow }}>
                        {/* Stage header */}
                        <div style={{
                          display: "grid", gridTemplateColumns: "28px 28px auto 1fr 1fr auto auto auto auto",
                          gap: 8, alignItems: "center", padding: "10px 14px",
                          background: isOpen ? t.surface : t.card,
                          borderBottom: isOpen ? `1px solid ${t.border}` : "none",
                          cursor: "default",
                        }}>
                          {/* Drag handle placeholder */}
                          <div style={{ color: t.border, fontSize: 16, cursor: "grab", textAlign: "center" }}>⠿</div>

                          {/* Number */}
                          <div style={{
                            width: 24, height: 24, borderRadius: 8,
                            background: t.accent, color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {si + 1}
                          </div>

                          {/* Emoji */}
                          <input
                            value={s.emoji}
                            onChange={e => setStageField(wi, si, "emoji", e.target.value)}
                            maxLength={2}
                            style={{ ...inp, width: 36, textAlign: "center", fontSize: 16, padding: "3px", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8 }}
                          />

                          {/* Name */}
                          <input
                            value={s.title}
                            onChange={e => setStageField(wi, si, "title", e.target.value)}
                            placeholder="Untitled stage"
                            style={{ ...inp, fontWeight: s.title ? 500 : 400, color: s.title ? t.text : t.textMeta, gridColumn: "4 / 6", background: "transparent", border: "none" }}
                          />

                          {/* Move up */}
                          <button onClick={() => moveStage(wi, si, -1)} disabled={si === 0} style={{ background: "none", border: "none", cursor: si === 0 ? "default" : "pointer", color: si === 0 ? t.border : t.textSub, fontSize: 14, padding: 2 }}>↑</button>
                          {/* Move down */}
                          <button onClick={() => moveStage(wi, si, 1)} disabled={si === stages.length - 1} style={{ background: "none", border: "none", cursor: si === stages.length - 1 ? "default" : "pointer", color: si === stages.length - 1 ? t.border : t.textSub, fontSize: 14, padding: 2 }}>↓</button>
                          {/* Delete */}
                          <button onClick={() => delStage(wi, si)} style={{ background: "none", border: "none", cursor: "pointer", color: t.red, padding: 2, display: "flex", alignItems: "center" }}><Trash2 size={14} strokeWidth={1.75} /></button>
                          {/* Expand */}
                          <button onClick={() => toggleExpanded(key)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textSub, fontSize: 14, padding: 2, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>∧</button>
                        </div>

                        {/* Stage body (expanded) */}
                        {isOpen && (
                          <div style={{ padding: "16px 16px", background: "#FCFBF8" }}>
                            {/* Row: emoji + name + description */}
                            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gap: 10, marginBottom: 20 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 5 }}>Emoji</label>
                                <input value={s.emoji} onChange={e => setStageField(wi, si, "emoji", e.target.value)} maxLength={2} style={{ ...inp, textAlign: "center", fontSize: 18, padding: "6px" }} />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 5 }}>Stage name</label>
                                <input value={s.title} onChange={e => setStageField(wi, si, "title", e.target.value)} placeholder="e.g. External Form" style={inp} />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textMeta, marginBottom: 5 }}>Description</label>
                                <input value={s.description} onChange={e => setStageField(wi, si, "description", e.target.value)} placeholder="One-line summary" style={inp} />
                              </div>
                            </div>

                            {/* Stats */}
                            <SubRow
                              label="Stats"
                              addLabel="Add stat"
                              items={s.stats || []}
                              onAdd={() => addSub(wi, si, "stats", { value: "", label: "" })}
                              onDel={di => delSub(wi, si, "stats", di)}
                              renderItem={(item, di) => (
                                <>
                                  <input value={item.value} onChange={e => setSub(wi, si, "stats", di, "value", e.target.value)} placeholder="Value (e.g. <2 min)" style={{ ...inp, flex: 1 }} />
                                  <input value={item.label} onChange={e => setSub(wi, si, "stats", di, "label", e.target.value)} placeholder="Label (e.g. Avg submission)" style={{ ...inp, flex: 1 }} />
                                </>
                              )}
                            />

                            {/* Inputs */}
                            <SubRow
                              label="Inputs"
                              addLabel="Add input"
                              items={s.inputs || []}
                              onAdd={() => addSub(wi, si, "inputs", { emoji: "📄", label: "", detail: "" })}
                              onDel={di => delSub(wi, si, "inputs", di)}
                              renderItem={(item, di) => (
                                <>
                                  <input value={item.emoji} onChange={e => setSub(wi, si, "inputs", di, "emoji", e.target.value)} maxLength={2} style={{ ...inp, width: 38, textAlign: "center", fontSize: 16, padding: "5px 4px", flexShrink: 0 }} />
                                  <input value={item.label} onChange={e => setSub(wi, si, "inputs", di, "label", e.target.value)} placeholder="Label" style={{ ...inp, flex: 1 }} />
                                  <input value={item.detail} onChange={e => setSub(wi, si, "inputs", di, "detail", e.target.value)} placeholder="Detail" style={{ ...inp, flex: 1 }} />
                                </>
                              )}
                            />

                            {/* Outputs */}
                            <SubRow
                              label="Outputs"
                              addLabel="Add output"
                              items={s.outputs || []}
                              onAdd={() => addSub(wi, si, "outputs", { label: "", detail: "" })}
                              onDel={di => delSub(wi, si, "outputs", di)}
                              renderItem={(item, di) => (
                                <>
                                  <CheckCircle2 size={16} color="#3C7A52" strokeWidth={2} style={{ flexShrink: 0 }} />
                                  <input value={item.label} onChange={e => setSub(wi, si, "outputs", di, "label", e.target.value)} placeholder="Label" style={{ ...inp, flex: 1 }} />
                                  <input value={item.detail} onChange={e => setSub(wi, si, "outputs", di, "detail", e.target.value)} placeholder="Detail" style={{ ...inp, flex: 1 }} />
                                </>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer actions */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
          paddingTop: 8,
        }}>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.ok ? "#3C7A52" : t.red, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {saveMsg.ok && <CheckCircle2 size={14} strokeWidth={2} />}{saveMsg.text}
            </span>
          )}
          <button
            onClick={() => navigate("/admin/proposals")}
            onMouseEnter={() => setHovBtn("cancel")} onMouseLeave={() => setHovBtn(null)}
            style={{ ...btnBase, border: "1px solid rgba(0,0,0,0.2)", color: t.text, background: hovBtn === "cancel" ? t.accentLight : "transparent" }}
          >
            Cancel
          </button>
          <button
            onClick={() => save()}
            disabled={saving}
            onMouseEnter={() => setHovBtn("save")} onMouseLeave={() => setHovBtn(null)}
            style={{
              ...btnBase, fontWeight: 600, padding: "8px 22px",
              background: saving ? t.textSub : hovBtn === "save" ? t.accentHover : t.accent,
              color: "#fff", opacity: saving ? 0.85 : 1, cursor: saving ? "default" : "pointer",
            }}
          >
            {saving
              ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Saving…</>
              : "Save proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}
