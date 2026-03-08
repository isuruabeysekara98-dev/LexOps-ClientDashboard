import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase.js";

const themes = {
  dark: {
    bg:"#0f1318", surface:"#161c24", surfaceHigh:"#1c2330",
    border:"rgba(255,255,255,0.07)", text:"#edf0f5", textSub:"#8b96a4", textDim:"#3d4650",
    accent:"#4a7fa5", accentLight:"#6a9fc0", accentSoft:"rgba(74,127,165,0.1)",
    green:"#4ade80", greenSoft:"rgba(74,222,128,0.08)",
    amber:"#f59e0b", amberSoft:"rgba(245,158,11,0.08)",
    red:"#f87171", redSoft:"rgba(248,113,113,0.08)",
    shadow:"0 1px 3px rgba(0,0,0,0.4)",
  },
  light: {
    bg:"#f4f5f7", surface:"#ffffff", surfaceHigh:"#eef0f4",
    border:"rgba(0,0,0,0.07)", text:"#1a2235", textSub:"#6b7280", textDim:"#c4cad3",
    accent:"#375971", accentLight:"#4a7fa5", accentSoft:"rgba(55,89,113,0.07)",
    green:"#16a34a", greenSoft:"rgba(22,163,74,0.07)",
    amber:"#d97706", amberSoft:"rgba(217,119,6,0.07)",
    red:"#dc2626", redSoft:"rgba(220,38,38,0.07)",
    shadow:"0 1px 3px rgba(0,0,0,0.06)",
  },
};

// Simplified project list for the invite modal's member-assignment selector.
// These mirror the hardcoded projects in Dashboard.jsx by id.
const SELECTABLE_PROJECTS = [
  { id: 1, label: "Nautilus Law – Intake Process & Smokeball Automation" },
  { id: 2, label: "Meridian Legal – Legal Ops Audit & CLM Implementation" },
  { id: 3, label: "Brightside Financial – In-House Legal Workflow Redesign" },
];

const ROLES = ["lexops_admin", "lexops_member", "client"];
const ROLE_LABELS = { lexops_admin: "Admin", lexops_member: "Member", client: "Client" };
const ROLE_COLORS = {
  dark:  { lexops_admin: "#a78bfa", lexops_member: "#6a9fc0", client: "#4ade80" },
  light: { lexops_admin: "#7c3aed", lexops_member: "#4a7fa5", client: "#16a34a" },
};

function Line({ t }) {
  return <div style={{ height: 1, background: t.border }} />;
}

function SectionLabel({ children, t }) {
  return (
    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "default", disabled = false, t, style = {} }) {
  const styles = {
    default: { background: t.accent, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: t.textSub, border: `1px solid ${t.border}` },
    danger:  { background: t.redSoft, color: t.red, border: `1px solid ${t.red}25` },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s, borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap", fontFamily: "inherit", transition: "opacity 0.15s", ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", t, style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`,
        borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text,
        outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...style,
      }}
    />
  );
}

function Select({ value, onChange, options, t, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
        padding: "7px 10px", fontSize: 12, color: t.text, cursor: "pointer",
        fontFamily: "inherit", outline: "none", ...style,
      }}
    >
      {options.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}

function RolePill({ role, mode }) {
  const color = ROLE_COLORS[mode]?.[role] || "#8b96a4";
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}30`,
      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status Pill (reused across tabs)
// ---------------------------------------------------------------------------
const STATUS_PILL_COLORS = {
  draft:    { bg: "transparent", color: "#8b96a4", b: "rgba(255,255,255,0.07)" },
  sent:     { bg: "rgba(74,127,165,0.1)", color: "#6a9fc0", b: "#4a7fa530" },
  viewed:   { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", b: "#f59e0b25" },
  accepted: { bg: "rgba(74,222,128,0.08)", color: "#4ade80", b: "#4ade8025" },
};

function StatusPill({ status }) {
  const v = STATUS_PILL_COLORS[status] || STATUS_PILL_COLORS.draft;
  return (
    <span style={{
      background: v.bg, color: v.color, border: `1px solid ${v.b}`,
      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SVG Icon components
// ---------------------------------------------------------------------------
function CopyIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function MailIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function XIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Invite User Modal
// ---------------------------------------------------------------------------
function InviteModal({ onClose, onSuccess, t, mode, defaultRole }) {
  const [form, setForm] = useState({ email: "", full_name: "", role: defaultRole || "client", project_ids: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleProject(id) {
    setForm(f => ({
      ...f,
      project_ids: f.project_ids.includes(id)
        ? f.project_ids.filter(p => p !== id)
        : [...f.project_ids, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Failed to invite user"); setSaving(false); return; }
      onSuccess();
    } catch (err) {
      setError("Network error");
    }
    setSaving(false);
  }

  const field = (label, child) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {child}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "28px 28px", width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        overflowY: "auto", maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>Invite User</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {field("Email", <Input t={t} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />)}
          {field("Full Name", <Input t={t} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" />)}
          {field("Role",
            <Select t={t} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, project_ids: [] }))}
              options={ROLES.map(r => [r, ROLE_LABELS[r]])} style={{ width: "100%" }} />
          )}

          {form.role === "client" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Assign Projects
              </label>
              <div style={{ background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                {SELECTABLE_PROJECTS.map((p, i) => (
                  <div key={p.id}>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      cursor: "pointer", color: t.text, fontSize: 13,
                    }}>
                      <input
                        type="checkbox"
                        checked={form.project_ids.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        style={{ accentColor: t.accent, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
                      />
                      {p.label}
                    </label>
                    {i < SELECTABLE_PROJECTS.length - 1 && <Line t={t} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn t={t} variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn t={t} disabled={saving} style={{ minWidth: 100 }}>
              {saving ? "Inviting…" : "Send Invite"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Modal (create + edit)
// ---------------------------------------------------------------------------
const EMPTY_PROJECT_FORM = {
  client_name: "", name: "", phase: "", due_date: "",
  manager: "", budget: "", summary: "", status: "active", progress: 0,
};

function ProjectModal({ project, onClose, onSuccess, t }) {
  const [form, setForm] = useState(project
    ? { ...project, name: project.name || project.project || "", budget: String(project.budget ?? ""), progress: project.progress ?? 0 }
    : { ...EMPTY_PROJECT_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!project;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, budget: Number(form.budget) || 0, progress: Number(form.progress) || 0 };
    const { error: err } = isEdit
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSuccess();
  }

  const field = (label, child, half = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: half ? "1 1 45%" : "1 1 100%" }}>
      <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {child}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto",
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "28px 28px", width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        margin: "auto", overflowY: "auto", maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>{isEdit ? "Edit Project" : "New Project"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {field("Client Name",  <Input t={t} value={form.client_name} onChange={set("client_name")} placeholder="Acme Corp" />, true)}
            {field("Project Name", <Input t={t} value={form.name}         onChange={set("name")}         placeholder="CRM Implementation" />, true)}
            {field("Phase",        <Input t={t} value={form.phase}       onChange={set("phase")}       placeholder="Implementation" />, true)}
            {field("Due Date",     <Input t={t} type="date" value={form.due_date} onChange={set("due_date")} />, true)}
            {field("Manager",      <Input t={t} value={form.manager}     onChange={set("manager")}     placeholder="Jane Smith" />, true)}
            {field("Budget ($)",   <Input t={t} type="number" value={form.budget} onChange={set("budget")} placeholder="5000" />, true)}
            {field("Progress (%)", <Input t={t} type="number" value={form.progress} onChange={set("progress")} placeholder="0" />, true)}
            {field("Status",
              <Select t={t} value={form.status} onChange={set("status")}
                options={[["active","Active"],["complete","Complete"],["on-hold","On Hold"]]}
                style={{ width: "100%" }} />,
              true
            )}
            {field("Summary",
              <textarea value={form.summary} onChange={set("summary")} placeholder="Brief project description…"
                style={{
                  width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                  padding: "8px 12px", fontSize: 13, color: t.text, outline: "none",
                  resize: "vertical", minHeight: 72, fontFamily: "inherit", boxSizing: "border-box",
                }} />
            )}
          </div>

          {error && (
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12, marginTop: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16 }}>
            <Btn t={t} variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn t={t} disabled={saving} style={{ minWidth: 100 }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: Clients Tab (Active Clients + Proposals)
// ---------------------------------------------------------------------------
function ClientsTab({ t, mode }) {
  // --- Active Clients state ---
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingClient, setRemovingClient] = useState(null);
  const [showInviteClient, setShowInviteClient] = useState(false);

  // --- Proposals state ---
  const [proposals, setProposals] = useState([]);
  const [proposalProjects, setProposalProjects] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({ project_name: "", client_name: "", client_contact_name: "", client_emails: [""] });
  const [proposalFile, setProposalFile] = useState(null);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [copyLink, setCopyLink] = useState("");
  const [deletingProposal, setDeletingProposal] = useState(null);
  const [emailSending, setEmailSending] = useState(null);
  const [emailSent, setEmailSent] = useState(null);

  // --- Load active clients ---
  const loadClients = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: projs }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "client").order("created_at"),
      supabase.from("projects").select("id, name, client_name").order("id"),
      supabase.from("project_members").select("*").order("id"),
    ]);
    setClients(profiles || []);
    setProjects(projs || []);
    setMemberships(members || []);
    setLoading(false);
  }, []);

  // --- Load proposals ---
  const loadProposals = useCallback(async () => {
    setProposalsLoading(true);
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from("proposals").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("id, name, client_name").order("id"),
    ]);
    setProposals(p || []);
    setProposalProjects(pr || []);
    setProposalsLoading(false);
  }, []);

  useEffect(() => { loadClients(); loadProposals(); }, [loadClients, loadProposals]);

  function getClientProjects(userId) {
    const pids = memberships.filter(m => m.user_id === userId).map(m => m.project_id);
    return projects.filter(p => pids.includes(p.id));
  }

  async function assignProject(userId) {
    if (!selectedProjectId) return;
    setAssigning(true);
    await supabase.from("project_members").upsert(
      { project_id: selectedProjectId, user_id: userId, role: "member" },
      { onConflict: "project_id,user_id" }
    );
    setAssignModal(null);
    setSelectedProjectId("");
    setAssigning(false);
    await loadClients();
  }

  async function removeClient(userId) {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    setRemovingClient(userId);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/admin/remove-user/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setClients(c => c.filter(x => x.id !== userId));
    setRemovingClient(null);
  }

  // --- Proposal actions ---
  async function sendProposalEmail(pr) {
    setEmailSending(pr.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/proposal/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ token: pr.token }),
      });
      setEmailSent(pr.id);
      setTimeout(() => setEmailSent(null), 3000);
    } catch { /* ignore */ }
    setEmailSending(null);
  }

  async function handleProposalSubmit(e) {
    e.preventDefault();
    const emails = proposalForm.client_emails.map(em => em.trim()).filter(Boolean);
    if (!proposalForm.client_name.trim() || emails.length === 0) return;
    setProposalError("");
    setProposalSaving(true);

    // Create project if project_name is provided
    let projectId = null;
    if (proposalForm.project_name.trim()) {
      const { data: newProj, error: projErr } = await supabase
        .from("projects")
        .insert({ name: proposalForm.project_name.trim(), client_name: proposalForm.client_name.trim(), status: "active", progress: 0 })
        .select("id")
        .single();
      if (projErr) { setProposalError("Failed to create project: " + projErr.message); setProposalSaving(false); return; }
      projectId = newProj.id;
    }

    // Upload PDF once if provided, then reuse the URL for each proposal
    let pdfUrl = null;
    let storagePath = null;

    const createdLinks = [];
    for (const email of emails) {
      const { data: row, error: insErr } = await supabase
        .from("proposals")
        .insert({
          project_id: projectId,
          client_name: proposalForm.client_name,
          client_contact_name: proposalForm.client_contact_name || null,
          client_email: email,
          status: "draft",
        })
        .select("*")
        .single();

      if (insErr) { setProposalError(insErr.message); setProposalSaving(false); return; }

      if (proposalFile && !pdfUrl) {
        storagePath = `proposals/${row.id}/${proposalFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("project-documents")
          .upload(storagePath, proposalFile, { upsert: true });

        if (upErr) { setProposalError("PDF upload failed: " + upErr.message); setProposalSaving(false); return; }

        const { data: { publicUrl } } = supabase.storage
          .from("project-documents")
          .getPublicUrl(storagePath);
        pdfUrl = publicUrl;
      }

      if (pdfUrl) {
        await supabase.from("proposals")
          .update({ pdf_url: pdfUrl, storage_path: storagePath, status: "sent" })
          .eq("id", row.id);
      } else {
        await supabase.from("proposals").update({ status: "sent" }).eq("id", row.id);
      }

      createdLinks.push(`${window.location.origin}/proposal/${row.token}`);
    }

    setCopyLink(createdLinks.length === 1 ? createdLinks[0] : createdLinks.join("\n"));
    setProposalForm({ project_name: "", client_name: "", client_contact_name: "", client_emails: [""] });
    setProposalFile(null);
    setProposalSaving(false);
    await loadProposals();
  }

  async function deleteProposal(id) {
    if (!window.confirm("Delete this proposal?")) return;
    setDeletingProposal(id);
    await supabase.from("proposals").delete().eq("id", id);
    setProposals(p => p.filter(x => x.id !== id));
    setDeletingProposal(null);
  }

  async function markAccepted(pr) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/proposal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ token: pr.token, signer_name: pr.client_name }),
    });
    await loadProposals();
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const field = (label, child) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {child}
    </div>
  );

  const iconBtnStyle = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6,
    width: 28, height: 28, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };

  return (
    <>
      {/* Assign to Project Modal */}
      {assignModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 28px", width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflowY: "auto", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>Invite to Project</span>
              <button onClick={() => setAssignModal(null)} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ color: t.textSub, fontSize: 12, marginBottom: 16 }}>
              Assigning <strong style={{ color: t.text }}>{assignModal.full_name || assignModal.email}</strong> to a project:
            </div>
            <Select t={t} value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              options={[["", "— Select project —"], ...projects.map(p => [p.id, p.client_name ? `${p.client_name} – ${p.name}` : p.name])]}
              style={{ width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn t={t} variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Btn>
              <Btn t={t} disabled={assigning || !selectedProjectId} onClick={() => assignProject(assignModal.id)}>
                {assigning ? "Assigning…" : "Assign"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Invite Client Modal */}
      {showInviteClient && (
        <InviteModal
          t={t} mode={mode}
          defaultRole="client"
          onClose={() => setShowInviteClient(false)}
          onSuccess={() => { setShowInviteClient(false); loadClients(); }}
        />
      )}

      {/* New Proposal Modal */}
      {showProposalModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 28px", width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflowY: "auto", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>New Proposal</span>
              <button onClick={() => { setShowProposalModal(false); setCopyLink(""); }} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {copyLink ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ color: t.green, fontSize: 13, fontWeight: 600 }}>Proposal created & sent</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Shareable Link</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input readOnly value={copyLink} style={{ flex: 1, background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit" }} onClick={e => e.target.select()} />
                    <Btn t={t} onClick={() => copyToClipboard(copyLink)}>Copy</Btn>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                  <Btn t={t} variant="ghost" onClick={() => { setShowProposalModal(false); setCopyLink(""); }}>Done</Btn>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProposalSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {field("Project Name", <Input t={t} value={proposalForm.project_name} onChange={e => setProposalForm(f => ({ ...f, project_name: e.target.value }))} placeholder="CRM Implementation" />)}
                {field("Client Company Name", <Input t={t} value={proposalForm.client_name} onChange={e => setProposalForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Acme Corp" />)}
                {field("Client Contact Name", <Input t={t} value={proposalForm.client_contact_name} onChange={e => setProposalForm(f => ({ ...f, client_contact_name: e.target.value }))} placeholder="Jane Smith" />)}
                {field("Recipient Emails",
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {proposalForm.client_emails.map((email, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Input t={t} type="email" value={email}
                          onChange={e => {
                            const updated = [...proposalForm.client_emails];
                            updated[idx] = e.target.value;
                            setProposalForm(f => ({ ...f, client_emails: updated }));
                          }}
                          placeholder="jane@example.com"
                          style={{ flex: 1 }}
                        />
                        {proposalForm.client_emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setProposalForm(f => ({ ...f, client_emails: f.client_emails.filter((_, i) => i !== idx) }))}
                            style={{ ...iconBtnStyle, color: t.red, fontSize: 16, flexShrink: 0 }}
                          ><XIcon color={t.red} /></button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setProposalForm(f => ({ ...f, client_emails: [...f.client_emails, ""] }))}
                      style={{ background: "none", border: "none", color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: "2px 0", fontFamily: "inherit" }}
                    >+ Add another email</button>
                  </div>
                )}
                {field("Proposal PDF",
                  <input type="file" accept=".pdf" onChange={e => setProposalFile(e.target.files?.[0] || null)}
                    style={{ fontSize: 12, color: t.textSub, fontFamily: "inherit" }}
                  />
                )}
                {proposalError && (
                  <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
                    {proposalError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                  <Btn t={t} variant="ghost" onClick={() => setShowProposalModal(false)}>Cancel</Btn>
                  <Btn t={t} disabled={proposalSaving || !proposalForm.client_name.trim() || !proposalForm.client_emails.some(em => em.trim())} style={{ minWidth: 120 }}>
                    {proposalSaving ? "Creating…" : "Create & Send"}
                  </Btn>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ====================== SECTION A: Active Clients ====================== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionLabel t={t}>Active Clients ({clients.length})</SectionLabel>
        <Btn t={t} onClick={() => setShowInviteClient(true)}>+ Add Client</Btn>
      </div>

      {loading ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : clients.length === 0 ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No client users found.</div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 160px", borderBottom: `1px solid ${t.border}` }}>
            {["Name / Email", "Assigned Projects", "", "Actions"].map((h, i) => (
              <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>
          {clients.map((cl, i) => {
            const cProjects = getClientProjects(cl.id);
            return (
              <div key={cl.id}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 160px", alignItems: "center" }}>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{cl.full_name || "—"}</div>
                    <div style={{ color: t.textSub, fontSize: 11, marginTop: 2 }}>{cl.email}</div>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    {cProjects.length === 0
                      ? <span style={{ color: t.textSub, fontSize: 12 }}>None</span>
                      : cProjects.map((p, j) => (
                          <div key={j} style={{ color: t.text, fontSize: 12, marginBottom: 2 }}>{p.name}</div>
                        ))
                    }
                  </div>
                  <div style={{ padding: "14px 18px" }} />
                  <div style={{ padding: "14px 18px", display: "flex", gap: 6 }}>
                    <Btn t={t} variant="ghost" onClick={() => { setAssignModal(cl); setSelectedProjectId(""); }} style={{ padding: "4px 8px", fontSize: 11 }}>
                      Add to Project
                    </Btn>
                    <Btn t={t} variant="danger" disabled={removingClient === cl.id} onClick={() => removeClient(cl.id)} style={{ padding: "4px 8px", fontSize: 11 }}>
                      {removingClient === cl.id ? "…" : "Remove"}
                    </Btn>
                  </div>
                </div>
                {i < clients.length - 1 && <Line t={t} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ====================== SECTION B: Proposals ====================== */}
      <div style={{ marginTop: 40 }}>
        <SectionLabel t={t}>Proposals</SectionLabel>
        <Line t={t} />
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ color: t.textSub, fontSize: 12, fontWeight: 600 }}>{proposals.length} proposal{proposals.length !== 1 ? "s" : ""}</span>
          <Btn t={t} onClick={() => { setShowProposalModal(true); setCopyLink(""); setProposalError(""); }}>+ New Proposal</Btn>
        </div>

        {proposalsLoading ? (
          <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
        ) : proposals.length === 0 ? (
          <div style={{ background: t.surfaceHigh, border: `1px dashed ${t.border}`, borderRadius: 12, padding: "48px 0", textAlign: "center" }}>
            <div style={{ color: t.textSub, fontSize: 13, marginBottom: 16 }}>No proposals yet.</div>
            <Btn t={t} onClick={() => { setShowProposalModal(true); setCopyLink(""); }}>+ Create First Proposal</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {proposals.map((pr) => {
              const proj = proposalProjects.find(p => p.id === pr.project_id);
              const isAccepted = pr.status === "accepted";
              const isPending = pr.status === "sent" || pr.status === "viewed";
              return (
                <div key={pr.id} style={{
                  background: t.surfaceHigh,
                  border: `1px solid ${t.border}`,
                  borderLeft: isPending ? `3px solid ${t.amber}` : `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  opacity: isAccepted ? 0.5 : 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 100px 110px auto",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <div>
                    <div style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{pr.client_name}</div>
                    {pr.client_contact_name && <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>{pr.client_contact_name}</div>}
                  </div>
                  <div style={{ color: t.textSub, fontSize: 12 }}>{pr.client_email}</div>
                  <div style={{ color: t.textSub, fontSize: 12 }}>{proj?.name || "—"}</div>
                  <div><StatusPill status={pr.status} /></div>
                  <div style={{ color: t.textSub, fontSize: 11 }}>{new Date(pr.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/proposal/${pr.token}`)} title="Copy link" style={{ ...iconBtnStyle, color: t.textSub }}>
                      <CopyIcon color={t.textSub} />
                    </button>
                    <button onClick={() => sendProposalEmail(pr)} disabled={emailSending === pr.id} title={emailSent === pr.id ? "Sent!" : "Send via email"} style={{ ...iconBtnStyle, color: emailSent === pr.id ? t.green : t.textSub, opacity: emailSending === pr.id ? 0.5 : 1, cursor: emailSending === pr.id ? "not-allowed" : "pointer" }}>
                      {emailSent === pr.id ? <span style={{ color: t.green, fontSize: 13, fontWeight: 700 }}>✓</span> : <MailIcon color={emailSent === pr.id ? t.green : t.textSub} />}
                    </button>
                    {pr.status !== "accepted" && (
                      <button onClick={() => markAccepted(pr)} title="Mark as accepted" style={{ ...iconBtnStyle, color: t.green }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>✓</span>
                      </button>
                    )}
                    <button onClick={() => deleteProposal(pr.id)} disabled={deletingProposal === pr.id} title="Delete" style={{ ...iconBtnStyle, color: t.red, opacity: deletingProposal === pr.id ? 0.4 : 1 }}>
                      <XIcon color={t.red} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// TAB 2: Team Tab (Admins + Members)
// ---------------------------------------------------------------------------
function TeamTab({ t, mode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteDefaultRole, setInviteDefaultRole] = useState("lexops_admin");
  const [removing, setRemoving] = useState(null);
  const fetchingRef = useRef(false);

  // Invite history state
  const [inviteLogs, setInviteLogs] = useState([]);
  const [adminInviteLogOpen, setAdminInviteLogOpen] = useState(false);
  const [memberInviteLogOpen, setMemberInviteLogOpen] = useState(false);
  const [inviteLogLoading, setInviteLogLoading] = useState(false);

  const [resending, setResending] = useState(null);
  const [resent, setResent] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const loadUsers = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    let profiles = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (resp.ok) {
        profiles = await resp.json();
      }
    } catch (err) {
    }

    let pendingInvites = [];
    try {
      const { data: logs } = await supabase
        .from("invite_log")
        .select("*")
        .order("invited_at", { ascending: false });
      const profileEmails = new Set(profiles.map(p => p.email));
      pendingInvites = (logs || [])
        .filter(l => !profileEmails.has(l.email))
        .reduce((acc, l) => {
          if (!acc.find(x => x.email === l.email)) acc.push(l);
          return acc;
        }, [])
        .map(l => ({ id: `invite-${l.id}`, email: l.email, full_name: l.full_name, role: l.role, _pending: true }));
    } catch (_) {
      // invite_log table may not exist yet
    }

    const allUsers = [...profiles, ...pendingInvites];
    setUsers(allUsers);
    setLoading(false);
    fetchingRef.current = false;
  }, []);

  const loadInviteLogs = useCallback(async () => {
    setInviteLogLoading(true);
    const { data: logs } = await supabase
      .from("invite_log")
      .select("*")
      .order("invited_at", { ascending: false });
    if (logs) {
      const { data: profiles } = await supabase.from("profiles").select("email");
      const profileEmails = new Set((profiles || []).map(p => p.email));
      setInviteLogs(logs.map(l => ({ ...l, accepted: profileEmails.has(l.email) })));
    }
    setInviteLogLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function resendInvite(log) {
    setResending(log.id);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: log.email, full_name: log.full_name, role: log.role }),
    });
    setResending(null);
    if (resp.ok) {
      setResent(log.id);
      setTimeout(() => setResent(null), 2000);
    }
  }

  async function cancelInvite(log) {
    if (!window.confirm(`Cancel invite for ${log.email}? This will remove their pending account.`)) return;
    setCancelling(log.id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/admin/cancel-invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: log.email }),
    });
    setCancelling(null);
    loadUsers();
    loadInviteLogs();
  }

  async function changeRole(userId, newRole) {
    setUsers(u => u.map(x => x.id === userId ? { ...x, role: newRole } : x));
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  }

  async function removeUser(userId) {
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    setRemoving(userId);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/admin/remove-user/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setUsers(u => u.filter(x => x.id !== userId));
    setRemoving(null);
  }

  const admins = users.filter(u => u.role === "lexops_admin");
  const members = users.filter(u => u.role === "lexops_member");
  const adminInviteLogs = inviteLogs.filter(l => l.role === "lexops_admin");
  const memberInviteLogs = inviteLogs.filter(l => l.role === "lexops_member");

  function renderInviteHistory(logs, isOpen, setIsOpen, roleFilter) {
    return (
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => { setIsOpen(o => !o); if (!isOpen && inviteLogs.length === 0) loadInviteLogs(); }}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", gap: 8, color: t.textSub, fontSize: 12, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "inherit",
          }}
        >
          <span style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
          Invite History
        </button>

        {isOpen && (
          <div style={{ marginTop: 12 }}>
            {inviteLogLoading ? (
              <div style={{ color: t.textSub, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Loading…</div>
            ) : logs.length === 0 ? (
              <div style={{ color: t.textSub, fontSize: 13, padding: "16px 0", textAlign: "center" }}>No invites sent yet.</div>
            ) : (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 90px 120px", borderBottom: `1px solid ${t.border}` }}>
                  {["Name", "Email", "Invited", "Status", "Actions"].map((h, i) => (
                    <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                  ))}
                </div>
                {logs.map((log, i) => (
                  <div key={log.id || i}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 90px 120px", alignItems: "center" }}>
                      <div style={{ padding: "12px 18px", color: t.text, fontSize: 13, fontWeight: 500 }}>{log.full_name || log.email}</div>
                      <div style={{ padding: "12px 18px", color: t.textSub, fontSize: 12 }}>{log.email}</div>
                      <div style={{ padding: "12px 18px", color: t.textSub, fontSize: 11 }}>
                        {log.invited_at ? new Date(log.invited_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}
                      </div>
                      <div style={{ padding: "12px 18px" }}>
                        {log.accepted ? (
                          <span style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid #4ade8025", borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />Accepted
                          </span>
                        ) : (
                          <span style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid #f59e0b25", borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />Pending
                          </span>
                        )}
                      </div>
                      <div style={{ padding: "12px 18px", display: "flex", gap: 6 }}>
                        {!log.accepted && (
                          <>
                            <Btn t={t} disabled={resending === log.id} onClick={() => resendInvite(log)} style={{ fontSize: 11, padding: "3px 10px" }}>
                              {resent === log.id ? "Sent!" : resending === log.id ? "…" : "Resend"}
                            </Btn>
                            <Btn t={t} variant="danger" disabled={cancelling === log.id} onClick={() => cancelInvite(log)} style={{ fontSize: 11, padding: "3px 10px" }}>
                              {cancelling === log.id ? "…" : "Cancel"}
                            </Btn>
                          </>
                        )}
                      </div>
                    </div>
                    {i < logs.length - 1 && <Line t={t} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderUserRow(user, i, list) {
    return (
      <div key={user.id}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", alignItems: "center" }}>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ color: t.text, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              {user.full_name || user.email}
              {user._pending && (
                <span style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid #f59e0b25", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>Pending setup</span>
              )}
            </div>
            {user.full_name && <div style={{ color: t.textSub, fontSize: 11, marginTop: 2 }}>{user.email}</div>}
          </div>
          <div style={{ padding: "14px 18px" }}>
            <RolePill role={user.role} mode={mode} />
          </div>
          <div style={{ padding: "14px 18px" }}>
            {!user._pending && (
              <Select
                t={t}
                value={user.role}
                onChange={e => changeRole(user.id, e.target.value)}
                options={ROLES.map(r => [r, ROLE_LABELS[r]])}
                style={{ width: "100%", fontSize: 12 }}
              />
            )}
          </div>
          <div style={{ padding: "14px 18px" }}>
            {!user._pending && (
              <Btn
                t={t} variant="danger"
                disabled={removing === user.id}
                onClick={() => removeUser(user.id)}
              >
                {removing === user.id ? "…" : "Remove"}
              </Btn>
            )}
          </div>
        </div>
        {i < list.length - 1 && <Line t={t} />}
      </div>
    );
  }

  return (
    <>
      {showInvite && (
        <InviteModal
          t={t} mode={mode}
          defaultRole={inviteDefaultRole}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); loadUsers(); }}
        />
      )}

      {/* ====================== SECTION A: Admins ====================== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionLabel t={t}>Admins ({admins.length})</SectionLabel>
        <Btn t={t} onClick={() => { setInviteDefaultRole("lexops_admin"); setShowInvite(true); }}>+ Add Admin</Btn>
      </div>

      {loading ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : admins.length === 0 ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No admins found.</div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", gap: 0, borderBottom: `1px solid ${t.border}` }}>
            {["Name / Email", "Role", "Change Role", "Actions"].map((h, i) => (
              <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>
          {admins.map((user, i) => renderUserRow(user, i, admins))}
        </div>
      )}

      {renderInviteHistory(adminInviteLogs, adminInviteLogOpen, setAdminInviteLogOpen, "lexops_admin")}

      {/* ====================== SECTION B: Members ====================== */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <SectionLabel t={t}>Members ({members.length})</SectionLabel>
          <Btn t={t} onClick={() => { setInviteDefaultRole("lexops_member"); setShowInvite(true); }}>+ Add Member</Btn>
        </div>

        {loading ? (
          <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No members found.</div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", gap: 0, borderBottom: `1px solid ${t.border}` }}>
              {["Name / Email", "Role", "Change Role", "Actions"].map((h, i) => (
                <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {members.map((user, i) => renderUserRow(user, i, members))}
          </div>
        )}

        {renderInviteHistory(memberInviteLogs, memberInviteLogOpen, setMemberInviteLogOpen, "lexops_member")}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// TAB 3: Projects Tab (unchanged)
// ---------------------------------------------------------------------------
function ProjectsTab({ t }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [flagCounts, setFlagCounts] = useState({});
  const [flagsProject, setFlagsProject] = useState(null);
  const [flags, setFlags] = useState([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [savingFlag, setSavingFlag] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: fc }] = await Promise.all([
      supabase.from("projects").select("*").order("id"),
      supabase.from("project_setup_flags").select("project_id, resolved"),
    ]);
    setProjects(data || []);
    // Count unresolved flags per project
    const counts = {};
    (fc || []).forEach(f => {
      if (!f.resolved) counts[f.project_id] = (counts[f.project_id] || 0) + 1;
    });
    setFlagCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function deleteProject(id) {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("projects").delete().eq("id", id);
    setProjects(p => p.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function openFlags(project) {
    setFlagsProject(project);
    setFlagsLoading(true);
    const { data } = await supabase.from("project_setup_flags").select("*").eq("project_id", project.id).order("id");
    setFlags(data || []);
    setFlagsLoading(false);
  }

  async function resolveFlag(flag) {
    setSavingFlag(flag.id);
    await supabase.from("project_setup_flags").update({ answer: flag.answer, resolved: true }).eq("id", flag.id);
    setFlags(fs => fs.map(f => f.id === flag.id ? { ...f, resolved: true } : f));
    setFlagCounts(fc => ({ ...fc, [flagsProject.id]: Math.max(0, (fc[flagsProject.id] || 1) - 1) }));
    setSavingFlag(null);
  }

  const statusColors = {
    active: { bg: "rgba(74,222,128,0.08)", color: "#4ade80", border: "#4ade8025" },
    complete: { bg: "rgba(74,127,165,0.1)", color: "#6a9fc0", border: "#4a7fa530" },
    "on-hold": { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "#f59e0b25" },
  };

  return (
    <>
      {(showModal || editingProject) && (
        <ProjectModal
          project={editingProject}
          t={t}
          onClose={() => { setShowModal(false); setEditingProject(null); }}
          onSuccess={() => { setShowModal(false); setEditingProject(null); loadProjects(); }}
        />
      )}

      {flagsProject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 28px", width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflowY: "auto", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>Setup Required — {flagsProject.name}</span>
              <button onClick={() => setFlagsProject(null)} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ color: t.textSub, fontSize: 12, marginBottom: 18 }}>
              The AI project structure generator flagged the following items for review. Provide answers and mark each as resolved.
            </div>

            {flagsLoading ? (
              <div style={{ color: t.textSub, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Loading…</div>
            ) : flags.length === 0 ? (
              <div style={{ color: t.textSub, fontSize: 13, textAlign: "center", padding: "24px 0" }}>No setup flags for this project.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {flags.map(f => (
                  <div key={f.id} style={{
                    background: f.resolved ? t.greenSoft : t.amberSoft,
                    border: `1px solid ${f.resolved ? t.green + "25" : t.amber + "25"}`,
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ color: t.text, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                      {f.resolved && <span style={{ color: t.green, marginRight: 6 }}>✓</span>}
                      {f.question}
                    </div>
                    {!f.resolved && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Your answer (optional)"
                          value={f.answer || ""}
                          onChange={e => setFlags(fs => fs.map(x => x.id === f.id ? { ...x, answer: e.target.value } : x))}
                          style={{
                            flex: 1, background: t.surfaceHigh, border: `1px solid ${t.border}`,
                            borderRadius: 6, padding: "6px 10px", fontSize: 12, color: t.text,
                            outline: "none", fontFamily: "inherit",
                          }}
                        />
                        <Btn t={t} disabled={savingFlag === f.id} onClick={() => resolveFlag(f)} style={{ padding: "4px 12px", fontSize: 11 }}>
                          {savingFlag === f.id ? "…" : "Resolve"}
                        </Btn>
                      </div>
                    )}
                    {f.resolved && f.answer && (
                      <div style={{ color: t.textSub, fontSize: 12, marginTop: 4 }}>Answer: {f.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionLabel t={t}>All Projects ({projects.length})</SectionLabel>
        <Btn t={t} onClick={() => setShowModal(true)}>+ New Project</Btn>
      </div>

      {loading ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : projects.length === 0 ? (
        <div style={{
          background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 12,
          padding: "48px 0", textAlign: "center",
        }}>
          <div style={{ color: t.textSub, fontSize: 13, marginBottom: 16 }}>No projects in the database yet.</div>
          <Btn t={t} onClick={() => setShowModal(true)}>+ Create First Project</Btn>
        </div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 130px", borderBottom: `1px solid ${t.border}` }}>
            {["Client", "Project", "Status", "Progress", "Actions"].map((h, i) => (
              <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>

          {projects.map((p, i) => {
            const sc = statusColors[p.status] || statusColors["on-hold"];
            return (
              <div key={p.id}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 130px", alignItems: "center" }}>
                  <div style={{ padding: "14px 18px", color: t.text, fontSize: 13, fontWeight: 500 }}>{p.client_name}</div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ color: t.text, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      {p.name}
                      {flagCounts[p.id] > 0 && (
                        <span style={{
                          background: t.amberSoft, color: t.amber, border: `1px solid ${t.amber}25`,
                          borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 700,
                          cursor: "pointer", whiteSpace: "nowrap",
                        }} onClick={() => openFlags(p)} title="Setup flags require attention">
                          {flagCounts[p.id]} flag{flagCounts[p.id] > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>{p.phase}</div>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <span style={{
                      background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                    }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p.progress}%`, background: p.progress === 100 ? "#4ade80" : "#4a7fa5", borderRadius: 99 }} />
                      </div>
                      <span style={{ color: t.textSub, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{p.progress}%</span>
                    </div>
                  </div>
                  <div style={{ padding: "14px 18px", display: "flex", gap: 6 }}>
                    <Btn t={t} variant="ghost" onClick={() => setEditingProject(p)} style={{ padding: "4px 10px" }}>Edit</Btn>
                    <Btn t={t} variant="danger" disabled={deleting === p.id} onClick={() => deleteProject(p.id)} style={{ padding: "4px 10px" }}>
                      {deleting === p.id ? "…" : "Delete"}
                    </Btn>
                  </div>
                </div>
                {i < projects.length - 1 && <Line t={t} />}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminPanel (main export)
// ---------------------------------------------------------------------------
export default function AdminPanel({ onClose, mode = "dark" }) {
  const t = themes[mode] || themes.dark;
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: t.bg, fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      color: t.text, display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: t.surface, borderBottom: `1px solid ${t.border}`,
        padding: "0 32px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0, boxShadow: t.shadow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: t.textSub, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin Panel</span>
          <div style={{ width: 1, height: 16, background: t.border }} />
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto", flexWrap: "nowrap" }}>
            {[["clients", "Clients"], ["team", "Team"], ["projects", "Projects"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  background: "transparent", border: "none",
                  borderBottom: activeTab === key ? `1.5px solid ${t.accent}` : "1.5px solid transparent",
                  color: activeTab === key ? t.text : t.textSub,
                  padding: "0 18px", height: 56, fontSize: 13,
                  fontWeight: activeTab === key ? 600 : 400,
                  cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
                  fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 8,
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16, color: t.textSub, fontFamily: "inherit",
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        {activeTab === "clients"  && <ClientsTab  t={t} mode={mode} />}
        {activeTab === "team"     && <TeamTab     t={t} mode={mode} />}
        {activeTab === "projects" && <ProjectsTab t={t} />}
      </div>
    </div>
  );
}
