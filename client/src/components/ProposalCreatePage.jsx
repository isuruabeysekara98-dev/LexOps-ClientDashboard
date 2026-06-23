import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#FFFFFF", surface: "#F0F4F4", surfaceHigh: "#E5EDED",
  border: "#C5D4D4", text: "#082B2B", textSub: "#3A6666",
  accent: "#1A6666", accentLight: "#0F4444", red: "#DC2626",
  redSoft: "rgba(220,38,38,0.08)", green: "#16A34A", greenSoft: "rgba(22,163,74,0.07)",
  shadow: "0 1px 3px rgba(8,43,43,0.06)",
};

const inp = {
  width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const lbl = {
  color: t.textSub, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
  display: "block", marginBottom: 6,
};

function Logo() {
  return (
    <svg width={63} height={20} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#082B2B"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#1A6666"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#082B2B"/>
    </svg>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.text, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.01em" }}>
        {title}
      </div>
      {subtitle && <div style={{ color: t.textSub, fontSize: 12, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#FFFFFF", border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "24px 24px",
      boxShadow: t.shadow, ...style,
    }}>
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, danger = false, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? t.redSoft : t.surfaceHigh) : "transparent",
        border: "none", borderRadius: 6, padding: "4px 8px",
        cursor: "pointer", fontSize: 13,
        color: danger ? t.red : t.textSub,
        fontFamily: "inherit", transition: "background 0.12s",
      }}
    >
      {children}
    </button>
  );
}

function defaultWorkflow() {
  return { id: null, name: "", emoji: "⚙️", stages: [defaultStage()], doc_requirements: [] };
}
function defaultStage() {
  return { title: "", emoji: "📋", description: "" };
}
function defaultDoc() {
  return { label: "", type: "file", required: true };
}

export default function ProposalCreatePage({ navigate, editId = null }) {
  const [proposalId, setProposalId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saveMsg, setSaveMsg] = useState(null);
  const [form, setForm] = useState({
    name: "", client_email: "",
    pain_points: [""], objectives: [""],
    workflows: [defaultWorkflow()],
  });

  useEffect(() => {
    document.title = editId ? "LexOps | Edit Proposal" : "LexOps | New Proposal";
    if (editId) loadEdit();
  }, [editId]);

  async function loadEdit() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/v2/${editId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProposalId(data.id);
      setForm({
        name: data.name || "",
        client_email: data.client_email || "",
        pain_points: data.pain_points?.length ? data.pain_points : [""],
        objectives: data.objectives?.length ? data.objectives : [""],
        workflows: (data.workflows || []).length
          ? data.workflows.map(wf => ({
              id: wf.id,
              name: wf.name || "",
              emoji: wf.emoji || "⚙️",
              stages: wf.stages?.length ? wf.stages.map(s => ({ title: s.title || "", emoji: s.emoji || "📋", description: s.description || "" })) : [defaultStage()],
              doc_requirements: (wf.doc_requirements || []).map(d => ({ label: d.label || "", type: d.type || "file", required: d.required !== false })),
            }))
          : [defaultWorkflow()],
      });
    } finally {
      setLoadingEdit(false);
    }
  }

  // ── State helpers ─────────────────────────────────────────────────────────

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setPP = (i, v) => setForm(f => { const a = [...f.pain_points]; a[i] = v; return { ...f, pain_points: a }; });
  const addPP = () => setForm(f => ({ ...f, pain_points: [...f.pain_points, ""] }));
  const delPP = (i) => setForm(f => ({ ...f, pain_points: f.pain_points.filter((_, j) => j !== i) }));

  const setObj = (i, v) => setForm(f => { const a = [...f.objectives]; a[i] = v; return { ...f, objectives: a }; });
  const addObj = () => setForm(f => ({ ...f, objectives: [...f.objectives, ""] }));
  const delObj = (i) => setForm(f => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }));

  const setWF = (wi, k, v) => setForm(f => ({ ...f, workflows: f.workflows.map((w, i) => i === wi ? { ...w, [k]: v } : w) }));
  const addWF = () => setForm(f => ({ ...f, workflows: [...f.workflows, defaultWorkflow()] }));
  const delWF = (wi) => setForm(f => ({ ...f, workflows: f.workflows.filter((_, i) => i !== wi) }));
  const moveWF = (wi, dir) => setForm(f => {
    const wfs = [...f.workflows]; const ni = wi + dir;
    if (ni < 0 || ni >= wfs.length) return f;
    [wfs[wi], wfs[ni]] = [wfs[ni], wfs[wi]];
    return { ...f, workflows: wfs };
  });

  const setStage = (wi, si, k, v) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : {
      ...w, stages: w.stages.map((s, j) => j === si ? { ...s, [k]: v } : s),
    }),
  }));
  const addStage = (wi) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : { ...w, stages: [...w.stages, defaultStage()] }),
  }));
  const delStage = (wi, si) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : { ...w, stages: w.stages.filter((_, j) => j !== si) }),
  }));

  const setDoc = (wi, di, k, v) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : {
      ...w, doc_requirements: w.doc_requirements.map((d, j) => j === di ? { ...d, [k]: v } : d),
    }),
  }));
  const addDoc = (wi) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : { ...w, doc_requirements: [...w.doc_requirements, defaultDoc()] }),
  }));
  const delDoc = (wi, di) => setForm(f => ({
    ...f, workflows: f.workflows.map((w, i) => i !== wi ? w : { ...w, doc_requirements: w.doc_requirements.filter((_, j) => j !== di) }),
  }));

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save({ send = false } = {}) {
    setSaveMsg(null);
    if (!form.name.trim()) { setSaveMsg({ ok: false, text: "Proposal name is required." }); return; }
    if (send && !form.client_email.trim()) { setSaveMsg({ ok: false, text: "Client email is required before sending." }); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };

      const saveRes = await fetch("/api/proposals/v2", {
        method: "POST", headers,
        body: JSON.stringify({ id: proposalId, ...form }),
      });
      if (!saveRes.ok) {
        const j = await saveRes.json().catch(() => ({}));
        setSaveMsg({ ok: false, text: j.message || "Save failed." });
        return;
      }
      const { id } = await saveRes.json();
      if (!proposalId) setProposalId(id);

      if (!send) {
        setSaveMsg({ ok: true, text: "Draft saved ✓" });
        setTimeout(() => setSaveMsg(null), 3000);
        return;
      }

      const sendRes = await fetch(`/api/proposals/v2/${id}/send`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!sendRes.ok) {
        const j = await sendRes.json().catch(() => ({}));
        setSaveMsg({ ok: false, text: j.message || "Saved but failed to send." });
        return;
      }
      setSaveMsg({ ok: true, text: "Proposal sent ✓" });
      setTimeout(() => navigate("/admin/proposals"), 1500);
    } catch {
      setSaveMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingEdit) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sticky header */}
      <div style={{
        borderBottom: `1px solid ${t.border}`, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, background: t.bg, position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo />
          <div style={{ width: 1, height: 20, background: t.border }} />
          <button onClick={() => navigate("/admin/proposals")} style={{
            background: "transparent", border: "none", color: t.textSub, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: 0,
          }}>← Proposals</button>
          <div style={{ width: 1, height: 20, background: t.border }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
            {editId ? "Edit Proposal" : "New Proposal"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsg.ok ? t.green : t.red, fontWeight: 500 }}>
              {saveMsg.text}
            </span>
          )}
          {saving && (
            <div style={{ width: 16, height: 16, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          )}
          <button
            onClick={() => save({ send: false })}
            disabled={saving}
            style={{
              background: t.surface, border: `1px solid ${t.border}`, color: t.text,
              borderRadius: 8, padding: "7px 16px", fontSize: 13,
              fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.6 : 1,
            }}
          >
            Save draft
          </button>
          <button
            onClick={() => save({ send: true })}
            disabled={saving}
            style={{
              background: saving ? t.surfaceHigh : t.accent,
              color: saving ? t.textSub : "#fff",
              border: "none", borderRadius: 8, padding: "7px 16px",
              fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            Save & Send
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Section 1: Proposal Details */}
        <Card>
          <SectionHead title="Proposal Details" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Proposal name *</label>
              <input style={inp} value={form.name} onChange={e => sf("name", e.target.value)} placeholder="e.g. Okafor Estate Automation" />
            </div>
            <div>
              <label style={lbl}>Client email</label>
              <input style={{ ...inp }} type="email" value={form.client_email} onChange={e => sf("client_email", e.target.value)} placeholder="client@example.com" />
            </div>
          </div>
        </Card>

        {/* Section 2: Client Context */}
        <Card>
          <SectionHead title="Client Context" subtitle="This context is passed to Claude when running workflow demos." />

          <div style={{ marginBottom: 20 }}>
            <label style={{ ...lbl, marginBottom: 10 }}>Pain Points</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.pain_points.map((pp, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    value={pp}
                    onChange={e => setPP(i, e.target.value)}
                    placeholder={`Pain point ${i + 1}`}
                  />
                  {form.pain_points.length > 1 && (
                    <IconBtn onClick={() => delPP(i)} danger title="Remove">×</IconBtn>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addPP} style={{
              marginTop: 8, background: "transparent", border: `1px dashed ${t.border}`,
              borderRadius: 7, padding: "6px 14px", fontSize: 12, color: t.textSub,
              cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}>
              + Add pain point
            </button>
          </div>

          <div>
            <label style={{ ...lbl, marginBottom: 10 }}>Objectives</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.objectives.map((obj, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    value={obj}
                    onChange={e => setObj(i, e.target.value)}
                    placeholder={`Objective ${i + 1}`}
                  />
                  {form.objectives.length > 1 && (
                    <IconBtn onClick={() => delObj(i)} danger title="Remove">×</IconBtn>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addObj} style={{
              marginTop: 8, background: "transparent", border: `1px dashed ${t.border}`,
              borderRadius: 7, padding: "6px 14px", fontSize: 12, color: t.textSub,
              cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}>
              + Add objective
            </button>
          </div>
        </Card>

        {/* Section 3: Workflows */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.01em" }}>
                Workflows
              </div>
              <div style={{ color: t.textSub, fontSize: 12, marginTop: 3 }}>
                Clients complete workflows in order. Each workflow has stages and optional document requirements.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {form.workflows.map((wf, wi) => (
              <Card key={wi}>
                {/* Workflow header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      background: t.accent, color: "#fff", borderRadius: 99,
                      width: 22, height: 22, display: "inline-flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {wi + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Workflow {wi + 1}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {wi > 0 && <IconBtn onClick={() => moveWF(wi, -1)} title="Move up">↑</IconBtn>}
                    {wi < form.workflows.length - 1 && <IconBtn onClick={() => moveWF(wi, 1)} title="Move down">↓</IconBtn>}
                    {form.workflows.length > 1 && <IconBtn onClick={() => delWF(wi)} danger title="Delete workflow">Delete</IconBtn>}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>Workflow name</label>
                    <input style={inp} value={wf.name} onChange={e => setWF(wi, "name", e.target.value)} placeholder="e.g. Estate Identification & Valuation" />
                  </div>
                  <div>
                    <label style={lbl}>Emoji</label>
                    <input style={{ ...inp, textAlign: "center", fontSize: 18 }} value={wf.emoji} onChange={e => setWF(wi, "emoji", e.target.value)} maxLength={2} />
                  </div>
                </div>

                {/* Stages */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 10 }}>
                    Stages
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {wf.stages.map((s, si) => (
                      <div key={si} style={{
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: 8, padding: "12px 14px",
                        display: "grid", gridTemplateColumns: "32px 1fr 32px",
                        gap: 10, alignItems: "start",
                      }}>
                        <input
                          style={{ ...inp, textAlign: "center", fontSize: 16, padding: "7px 4px" }}
                          value={s.emoji}
                          onChange={e => setStage(wi, si, "emoji", e.target.value)}
                          maxLength={2}
                          title="Stage emoji"
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            style={{ ...inp, background: "#fff" }}
                            value={s.title}
                            onChange={e => setStage(wi, si, "title", e.target.value)}
                            placeholder={`Stage ${si + 1} title`}
                          />
                          <textarea
                            style={{ ...inp, background: "#fff", resize: "vertical", minHeight: 56 }}
                            value={s.description}
                            onChange={e => setStage(wi, si, "description", e.target.value)}
                            placeholder="What happens in this stage? (Claude uses this to generate output)"
                            rows={2}
                          />
                        </div>
                        {wf.stages.length > 1 ? (
                          <IconBtn onClick={() => delStage(wi, si)} danger title="Remove stage">×</IconBtn>
                        ) : <div />}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addStage(wi)} style={{
                    marginTop: 8, background: "transparent", border: `1px dashed ${t.border}`,
                    borderRadius: 7, padding: "6px 0", fontSize: 12, color: t.textSub,
                    cursor: "pointer", fontFamily: "inherit", width: "100%",
                  }}>
                    + Add stage
                  </button>
                </div>

                {/* Document requirements */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 10 }}>
                    Document Requirements
                  </div>
                  {wf.doc_requirements.length === 0 ? (
                    <div style={{ color: t.textSub, fontSize: 12, marginBottom: 8 }}>
                      No document requirements — add one if the client needs to submit files or text.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {wf.doc_requirements.map((d, di) => (
                        <div key={di} style={{
                          background: t.surface, border: `1px solid ${t.border}`,
                          borderRadius: 8, padding: "10px 12px",
                          display: "grid", gridTemplateColumns: "1fr 90px auto auto",
                          gap: 8, alignItems: "center",
                        }}>
                          <input
                            style={{ ...inp, background: "#fff" }}
                            value={d.label}
                            onChange={e => setDoc(wi, di, "label", e.target.value)}
                            placeholder="e.g. Estate inventory spreadsheet"
                          />
                          <select
                            value={d.type}
                            onChange={e => setDoc(wi, di, "type", e.target.value)}
                            style={{ ...inp, background: "#fff", padding: "9px 8px" }}
                          >
                            <option value="file">File upload</option>
                            <option value="text">Text input</option>
                          </select>
                          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.textSub, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <input
                              type="checkbox"
                              checked={d.required}
                              onChange={e => setDoc(wi, di, "required", e.target.checked)}
                              style={{ accentColor: t.accent }}
                            />
                            Required
                          </label>
                          <IconBtn onClick={() => delDoc(wi, di)} danger title="Remove">×</IconBtn>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => addDoc(wi)} style={{
                    background: "transparent", border: `1px dashed ${t.border}`,
                    borderRadius: 7, padding: "6px 0", fontSize: 12, color: t.textSub,
                    cursor: "pointer", fontFamily: "inherit", width: "100%",
                  }}>
                    + Add document requirement
                  </button>
                </div>
              </Card>
            ))}

            <button onClick={addWF} style={{
              background: "#fff", border: `1.5px dashed ${t.border}`,
              borderRadius: 12, padding: "18px 0", fontSize: 13,
              color: t.textSub, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 500, width: "100%",
            }}>
              + Add workflow
            </button>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          paddingTop: 8, paddingBottom: 32,
        }}>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.ok ? t.green : t.red, fontWeight: 500, alignSelf: "center" }}>
              {saveMsg.text}
            </span>
          )}
          <button onClick={() => save({ send: false })} disabled={saving} style={{
            background: t.surface, border: `1px solid ${t.border}`, color: t.text,
            borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1,
          }}>
            Save draft
          </button>
          <button onClick={() => save({ send: true })} disabled={saving} style={{
            background: saving ? t.surfaceHigh : t.accent,
            color: saving ? t.textSub : "#fff",
            border: "none", borderRadius: 8, padding: "9px 20px",
            fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>
            Save & Send invite
          </button>
        </div>
      </div>
    </div>
  );
}
