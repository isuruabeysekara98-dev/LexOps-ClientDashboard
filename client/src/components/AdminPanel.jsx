import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase.js";
import { adminFetch, dbWrite } from "@/lib/adminFetch.js";

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
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{width:5,height:5,borderRadius:"50%",background:"#9DB5C9",display:"inline-block"}}/>
      <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#616568"}}>{children}</span>
    </div>
  );
}

function Btn({ children, onClick, variant = "default", disabled = false, t, style = {} }) {
  const styles = {
    default: { background: "#375971", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#232A34", border: "1px solid rgba(0,0,0,0.2)" },
    danger:  { background: t.redSoft, color: t.red, border: `1px solid ${t.red}25` },
  };
  const s = styles[variant] || styles.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s, borderRadius: 8, padding: "10px 24px", fontSize: 16, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap", fontFamily: "'Satoshi', sans-serif", transition: "all 0.2s", ...style,
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
        width: "100%", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#232A34",
        outline: "none", boxSizing: "border-box", fontFamily: "'Satoshi', sans-serif", ...style,
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
  feedback_received: { bg: "rgba(74,222,128,0.08)", color: "#4ade80", b: "#4ade8025" },
  won:       { bg: "rgba(74,222,128,0.12)", color: "#22c55e", b: "#22c55e30" },
  lost:      { bg: "rgba(248,113,113,0.08)", color: "#f87171", b: "#f8717125" },
  converted: { bg: "rgba(139,92,246,0.08)", color: "#a78bfa", b: "#a78bfa25" },
  active:    { bg: "rgba(74,127,165,0.1)", color: "#6a9fc0", b: "#4a7fa530" },
  complete:  { bg: "rgba(74,222,128,0.08)", color: "#4ade80", b: "#4ade8025" },
  "on-hold": { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", b: "#f59e0b25" },
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
  const [availableProjects, setAvailableProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      setProjectsLoading(true);
      try {
        const result = await adminFetch("/db-read?table=projects&order_by=id");
        setAvailableProjects((result.data || []).map(p => ({ id: p.id, label: p.client_name ? `${p.client_name} – ${p.name}` : p.name })));
      } catch { setAvailableProjects([]); }
      setProjectsLoading(false);
    }
    loadProjects();
  }, []);

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
        background: "#F4F8FB", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
        padding: "28px 28px", width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(35,42,52,0.14)",
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
              options={ROLES.map(r => [r, ROLE_LABELS[r]])} style={{ width: "100%", borderRadius: 8, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", padding: "10px 14px", fontSize: 14 }} />
          )}

          {form.role === "client" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Assign Projects
              </label>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, overflow: "hidden" }}>
                {projectsLoading ? (
                  <div style={{ padding: "12px 14px", color: t.textSub, fontSize: 12 }}>Loading projects…</div>
                ) : availableProjects.length === 0 ? (
                  <div style={{ padding: "12px 14px", color: t.textSub, fontSize: 12 }}>No projects available</div>
                ) : availableProjects.map((p, i) => (
                  <div key={p.id}>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      cursor: "pointer", color: t.text, fontSize: 13,
                    }}>
                      <input
                        type="checkbox"
                        checked={form.project_ids.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        style={{ accentColor: "#375971", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
                      />
                      {p.label}
                    </label>
                    {i < availableProjects.length - 1 && <Line t={t} />}
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
  manager: "", manager_email: "", budget: "", summary: "", status: "active", progress: 0,
};

function ProjectModal({ project, onClose, onSuccess, t }) {
  const [form, setForm] = useState(project
    ? { ...project, name: project.name || project.project || "", budget: String(project.budget ?? ""), progress: project.progress ?? 0 }
    : { ...EMPTY_PROJECT_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const isEdit = !!project;

  useEffect(() => {
    adminFetch("/db-read?table=profiles&order_by=full_name")
      .then(r => setTeamMembers((r.data || []).filter(p => p.role === "lexops_admin" || p.role === "lexops_member")))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, budget: Number(form.budget) || 0, progress: Number(form.progress) || 0 };
    try {
      if (isEdit) await dbWrite("projects","update",payload,{id: project.id});
      else await dbWrite("projects","insert",payload);
    } catch(err) { setError(err.message); setSaving(false); return; }
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
        background: "#F4F8FB", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
        padding: "28px 28px", width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(35,42,52,0.14)",
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
            {field("Milestone",    <Input t={t} value={form.phase}       onChange={set("phase")}       placeholder="Implementation" />, true)}
            {field("Due Date",     <Input t={t} type="date" value={form.due_date} onChange={set("due_date")} />, true)}
            {field("Manager",
              <select
                value={form.manager_email || ""}
                onChange={e => {
                  const m = teamMembers.find(p => p.email === e.target.value);
                  setForm(f => ({ ...f, manager: m ? (m.full_name || m.email) : "", manager_email: e.target.value }));
                }}
                style={{ width: "100%", borderRadius: 8, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", padding: "10px 14px", fontSize: 14, color: "#232A34", outline: "none", fontFamily: "'Satoshi', sans-serif", boxSizing: "border-box" }}
              >
                <option value="">— Select manager —</option>
                {teamMembers.map(m => <option key={m.id} value={m.email}>{m.full_name || m.email}</option>)}
              </select>,
              true
            )}
            {field("Budget ($)",   <Input t={t} type="number" value={form.budget} onChange={set("budget")} placeholder="5000" />, true)}
            {field("Progress (%)", <Input t={t} type="number" value={form.progress} onChange={set("progress")} placeholder="0" />, true)}
            {field("Status",
              <Select t={t} value={form.status} onChange={set("status")}
                options={[["active","Active"],["complete","Complete"],["on-hold","On Hold"]]}
                style={{ width: "100%", borderRadius: 8, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", padding: "10px 14px", fontSize: 14 }} />,
              true
            )}
            {field("Summary",
              <textarea value={form.summary} onChange={set("summary")} placeholder="Brief project description…"
                style={{
                  width: "100%", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8,
                  padding: "10px 14px", fontSize: 14, color: "#232A34", outline: "none",
                  resize: "vertical", minHeight: 72, fontFamily: "'Satoshi', sans-serif", boxSizing: "border-box",
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

  // --- Client pending invites state ---
  const [clientInviteLogs, setClientInviteLogs] = useState([]);
  const [clientInviteLogOpen, setClientInviteLogOpen] = useState(false);
  const [clientInviteLogLoading, setClientInviteLogLoading] = useState(false);
  const [clientResending, setClientResending] = useState(null);
  const [clientResent, setClientResent] = useState(null);
  const [clientCancelling, setClientCancelling] = useState(null);

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

  const loadClientInviteLogs = useCallback(async () => {
    setClientInviteLogLoading(true);
    const { data: logs } = await supabase
      .from("invite_log")
      .select("*")
      .eq("role", "client")
      .order("invited_at", { ascending: false });
    if (logs) {
      const { data: profiles } = await supabase.from("profiles").select("email");
      const profileEmails = new Set((profiles || []).map(p => p.email));
      setClientInviteLogs(logs.map(l => ({ ...l, accepted: profileEmails.has(l.email) })));
    }
    setClientInviteLogLoading(false);
  }, []);

  async function resendClientInvite(log) {
    setClientResending(log.id);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: log.email, full_name: log.full_name, role: log.role }),
    });
    setClientResending(null);
    if (resp.ok) {
      setClientResent(log.id);
      setTimeout(() => setClientResent(null), 3000);
    }
  }

  async function cancelClientInvite(log) {
    if (!window.confirm(`Cancel invite for ${log.email}? This will remove their pending account.`)) return;
    setClientCancelling(log.id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/admin/cancel-invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: log.email }),
    });
    setClientCancelling(null);
    loadClients();
    loadClientInviteLogs();
  }

  useEffect(() => { loadClients(); loadProposals(); }, [loadClients, loadProposals]);

  function getClientProjects(userId) {
    const pids = memberships.filter(m => m.user_id === userId).map(m => m.project_id);
    return projects.filter(p => pids.includes(p.id));
  }

  async function assignProject(userId) {
    if (!selectedProjectId) return;
    setAssigning(true);
    await dbWrite("project_members","upsert",
      { project_id: selectedProjectId, user_id: userId, role: "member" },
      { project_id: selectedProjectId, user_id: userId }
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
      try {
        const r = await dbWrite("projects","insert",{ name: proposalForm.project_name.trim(), client_name: proposalForm.client_name.trim(), status: "active", progress: 0 });
        projectId = r.data.id;
      } catch(projErr) { setProposalError("Failed to create project: " + projErr.message); setProposalSaving(false); return; }
    }

    // Upload PDF once if provided, then reuse the URL for each proposal
    let pdfUrl = null;
    let storagePath = null;

    const createdLinks = [];
    for (const email of emails) {
      let row;
      try {
        const r = await dbWrite("proposals","insert",{
          project_id: projectId,
          client_name: proposalForm.client_name,
          client_contact_name: proposalForm.client_contact_name || null,
          client_email: email,
          status: "draft",
        });
        row = r.data;
      } catch(insErr) { setProposalError(insErr.message); setProposalSaving(false); return; }

      if (proposalFile && !pdfUrl) {
        storagePath = `proposals/${row.id}/${proposalFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("proposal-assets")
          .upload(storagePath, proposalFile, { upsert: true });

        if (upErr) { setProposalError("PDF upload failed: " + upErr.message); setProposalSaving(false); return; }

        const { data: { publicUrl } } = supabase.storage
          .from("proposal-assets")
          .getPublicUrl(storagePath);
        pdfUrl = publicUrl;
      }

      if (pdfUrl) {
        await dbWrite("proposals","update",{ pdf_url: pdfUrl, storage_path: storagePath, status: "sent" },{id: row.id});
      } else {
        await dbWrite("proposals","update",{ status: "sent" },{id: row.id});
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
    await dbWrite("proposals","delete",null,{id});
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

      {/* ====================== Pending Client Invites ====================== */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => { setClientInviteLogOpen(o => !o); if (!clientInviteLogOpen && clientInviteLogs.length === 0) loadClientInviteLogs(); }}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", gap: 8, color: t.textSub, fontSize: 12, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "inherit",
          }}
        >
          <span style={{ display: "inline-block", transform: clientInviteLogOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
          Invite History
        </button>

        {clientInviteLogOpen && (
          <div style={{ marginTop: 12 }}>
            {clientInviteLogLoading ? (
              <div style={{ color: t.textSub, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Loading...</div>
            ) : clientInviteLogs.length === 0 ? (
              <div style={{ color: t.textSub, fontSize: 13, padding: "16px 0", textAlign: "center" }}>No client invites sent yet.</div>
            ) : (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 90px 120px", borderBottom: `1px solid ${t.border}` }}>
                  {["Name", "Email", "Invited", "Status", "Actions"].map((h, i) => (
                    <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                  ))}
                </div>
                {clientInviteLogs.map((log, i) => (
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
                            <Btn t={t} disabled={clientResending === log.id} onClick={() => resendClientInvite(log)} style={{ fontSize: 11, padding: "3px 10px" }}>
                              {clientResent === log.id ? "Sent!" : clientResending === log.id ? "..." : "Resend"}
                            </Btn>
                            <Btn t={t} variant="danger" disabled={clientCancelling === log.id} onClick={() => cancelClientInvite(log)} style={{ fontSize: 11, padding: "3px 10px" }}>
                              {clientCancelling === log.id ? "..." : "Cancel"}
                            </Btn>
                          </>
                        )}
                      </div>
                    </div>
                    {i < clientInviteLogs.length - 1 && <Line t={t} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
    const resp = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: log.email, full_name: log.full_name, role: log.role }),
    });
    setResending(null);
    if (resp.ok) {
      setResent(log.id);
      setTimeout(() => setResent(null), 3000);
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
    await dbWrite("profiles","update",{ role: newRole },{id: userId});
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
// Sparkles icon SVG
function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      <path d="M20 3v4"/><path d="M22 5h-4"/>
    </svg>
  );
}

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
  const [aiProject, setAiProject] = useState(null);
  const [aiFile, setAiFile] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState(false);
  const [matchProject, setMatchProject] = useState(null);
  const [syncingMilestones, setSyncingMilestones] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  async function syncMilestoneNames() {
    setSyncingMilestones(true);
    setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/bulk-rename-phases", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      setSyncResult({ ok: true, msg: json.updated === 0 ? "Already up to date — no changes needed." : `Renamed ${json.updated} of ${json.total} milestone(s).` });
      await loadProjects();
    } catch (err) {
      setSyncResult({ ok: false, msg: err.message });
    } finally {
      setSyncingMilestones(false);
    }
  }

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
    const result = await dbWrite("projects","delete",null,{id});
    if (result?.ok !== false) setProjects(p => p.filter(x => x.id !== id));
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
    await dbWrite("project_setup_flags","update",{ answer: flag.answer, resolved: true },{id: flag.id});
    setFlags(fs => fs.map(f => f.id === flag.id ? { ...f, resolved: true } : f));
    setFlagCounts(fc => ({ ...fc, [flagsProject.id]: Math.max(0, (fc[flagsProject.id] || 1) - 1) }));
    setSavingFlag(null);
  }

  async function handleAiGenerate() {
    if (!aiFile || !aiProject) return;
    setAiError("");
    setAiGenerating(true);
    try {
      const formData = new FormData();
      formData.append("project_id", aiProject.id);
      formData.append("pdf", aiFile);

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/admin/generate-project", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const json = await resp.json();
      if (!resp.ok) {
        setAiError(json.message || "Generation failed");
        setAiGenerating(false);
        return;
      }
      setAiSuccess(true);
      setAiGenerating(false);
      // Reload projects to show new flags
      setTimeout(() => {
        setAiProject(null);
        setAiFile(null);
        setAiSuccess(false);
        loadProjects();
      }, 2000);
    } catch (err) {
      setAiError("Network error");
      setAiGenerating(false);
    }
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

      {aiProject && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 28px", width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflowY: "auto", maxHeight: "90vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ color: t.text, fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <SparklesIcon /> Generate with AI — {aiProject.name}
              </span>
              <button onClick={() => { setAiProject(null); setAiFile(null); setAiError(""); setAiSuccess(false); }} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {aiSuccess ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ color: t.green, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Project structure generated successfully</div>
                <div style={{ color: t.textSub, fontSize: 12 }}>Closing automatically…</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ color: t.textSub, fontSize: 12, lineHeight: 1.6 }}>
                  Upload a proposal or brief PDF. The AI will analyze it and generate phases, tasks, deliverables, and setup flags for this project.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Upload Proposal or Brief</label>
                  <input type="file" accept=".pdf" onChange={e => setAiFile(e.target.files?.[0] || null)}
                    style={{ fontSize: 12, color: t.textSub, fontFamily: "inherit" }}
                  />
                </div>

                {aiGenerating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                    <div style={{ width: 18, height: 18, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ color: t.textSub, fontSize: 13 }}>Analysing document…</span>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                )}

                {aiError && (
                  <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
                    {aiError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                  <Btn t={t} variant="ghost" onClick={() => { setAiProject(null); setAiFile(null); setAiError(""); }}>Cancel</Btn>
                  <Btn t={t} disabled={aiGenerating || !aiFile} onClick={handleAiGenerate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <SparklesIcon />
                    {aiGenerating ? "Generating…" : "Generate Project Structure"}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {matchProject && (
        <MatchModal
          projectSummary={matchProject.summary || ""}
          projectId={matchProject.id}
          t={t}
          onClose={() => setMatchProject(null)}
          onDeploy={() => setMatchProject(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: syncResult ? 8 : 20 }}>
        <SectionLabel t={t}>All Projects ({projects.length})</SectionLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn t={t} variant="ghost" disabled={syncingMilestones} onClick={syncMilestoneNames} style={{ fontSize: 11 }}>
            {syncingMilestones ? "Syncing…" : "Sync Milestone Names"}
          </Btn>
          <Btn t={t} onClick={() => setShowModal(true)}>+ New Project</Btn>
        </div>
      </div>
      {syncResult && (
        <div style={{
          marginBottom: 16, padding: "8px 14px", borderRadius: 8, fontSize: 12,
          background: syncResult.ok ? "#f0fdf4" : "#fef2f2",
          color: syncResult.ok ? "#16a34a" : "#dc2626",
          border: `1px solid ${syncResult.ok ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {syncResult.msg}
        </div>
      )}

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 180px", borderBottom: `1px solid ${t.border}` }}>
            {["Client", "Project", "Status", "Progress", "Actions"].map((h, i) => (
              <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>

          {projects.map((p, i) => {
            const sc = statusColors[p.status] || statusColors["on-hold"];
            return (
              <div key={p.id}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px 180px", alignItems: "center" }}>
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
                  <div style={{ padding: "14px 18px", display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button
                      onClick={() => { setAiProject(p); setAiFile(null); setAiError(""); setAiSuccess(false); }}
                      title="Generate with AI"
                      style={{
                        background: t.accentSoft, color: t.accentLight, border: `1px solid ${t.accent}30`,
                        borderRadius: 6, width: 28, height: 28, padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: 12, flexShrink: 0,
                      }}
                    >
                      <SparklesIcon />
                    </button>
                    <button
                      onClick={() => setMatchProject(p)}
                      title="Match Modules"
                      style={{
                        background: t.greenSoft, color: t.green, border: `1px solid ${t.green}30`,
                        borderRadius: 6, width: 28, height: 28, padding: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", fontSize: 12, flexShrink: 0,
                      }}
                    >
                      <PuzzleIcon color={t.green} />
                    </button>
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
// Puzzle-piece Icon (for module matching from projects)
// ---------------------------------------------------------------------------
function PuzzleIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Module Status Pill
// ---------------------------------------------------------------------------
const MODULE_STATUS_COLORS = {
  active:   { bg: "rgba(74,222,128,0.08)", color: "#4ade80", b: "#4ade8025" },
  draft:    { bg: "transparent", color: "#8b96a4", b: "rgba(255,255,255,0.07)" },
  archived: { bg: "rgba(248,113,113,0.08)", color: "#f87171", b: "#f8717125" },
};

function ModuleStatusPill({ status }) {
  const v = MODULE_STATUS_COLORS[status] || MODULE_STATUS_COLORS.draft;
  return (
    <span style={{
      background: v.bg, color: v.color, border: `1px solid ${v.b}`,
      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Deploy Status Pill
// ---------------------------------------------------------------------------
const DEPLOY_STATUS_COLORS = {
  pending:  { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", b: "#f59e0b25" },
  active:   { bg: "rgba(74,222,128,0.08)", color: "#4ade80", b: "#4ade8025" },
  complete: { bg: "rgba(74,127,165,0.1)",  color: "#6a9fc0", b: "#4a7fa530" },
  failed:   { bg: "rgba(248,113,113,0.08)", color: "#f87171", b: "#f8717125" },
};

function DeployStatusPill({ status }) {
  const v = DEPLOY_STATUS_COLORS[status] || DEPLOY_STATUS_COLORS.pending;
  return (
    <span style={{
      background: v.bg, color: v.color, border: `1px solid ${v.b}`,
      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tag Input Component
// ---------------------------------------------------------------------------
function TagInput({ tags, onChange, placeholder, t }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center",
      background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
      padding: "4px 8px", minHeight: 36, boxSizing: "border-box",
    }}>
      {tags.map((tag, i) => (
        <span key={i} style={{
          background: t.accentSoft, color: t.accentLight, border: `1px solid ${t.accent}30`,
          borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          {tag}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1, fontFamily: "inherit" }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          flex: 1, minWidth: 60, background: "transparent", border: "none",
          outline: "none", fontSize: 12, color: t.text, fontFamily: "inherit", padding: "2px 0",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module Modal (New/Edit)
// ---------------------------------------------------------------------------
const EMPTY_MODULE_FORM = {
  name: "", description: "", practice_areas: [], firm_sizes: [], tools: [],
  workflow_stage: "discovery", runtime: "n8n", avg_hours: "", status: "active",
};

const WORKFLOW_STAGES = [
  ["discovery", "Discovery"], ["planning", "Planning"], ["implementation", "Implementation"],
  ["review", "Review"], ["deployment", "Deployment"], ["maintenance", "Maintenance"],
];

const RUNTIMES = [["n8n", "n8n"], ["zapier", "Zapier"], ["make", "Make"], ["custom", "Custom"]];

const FIRM_SIZE_OPTIONS = ["Solo", "Small (2-10)", "Medium (11-50)", "Large (50+)"];

function ModuleModal({ module, onClose, onSuccess, t }) {
  const [form, setForm] = useState(module ? {
    name: module.name || "",
    description: module.description || "",
    practice_areas: module.practice_areas || [],
    firm_sizes: module.firm_sizes || [],
    tools: module.tools || [],
    workflow_stage: module.workflow_stage || "discovery",
    runtime: module.runtime || "n8n",
    avg_hours: String(module.avg_hours ?? ""),
    status: module.status || "active",
  } : { ...EMPTY_MODULE_FORM });

  const [steps, setSteps] = useState([]);
  const [workflow, setWorkflow] = useState({ workflow_json: "", variables: [], n8n_workflow_id: "" });
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(!!module);
  const isEdit = !!module;

  useEffect(() => {
    if (!module) return;
    (async () => {
      setLoadingDetails(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/modules/${module.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSteps((data.steps || []).map(s => ({ title: s.title, description: s.description || "", tool: s.tool || "", notes: s.notes || "" })));
        if (data.workflow) {
          setWorkflow({
            workflow_json: data.workflow.workflow_json || "",
            variables: data.workflow.variables || [],
            n8n_workflow_id: data.workflow.n8n_workflow_id || "",
          });
        }
      }
      setLoadingDetails(false);
    })();
  }, [module]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  function addStep() {
    setSteps(s => [...s, { title: "", description: "", tool: "", notes: "" }]);
  }

  function removeStep(i) {
    setSteps(s => s.filter((_, j) => j !== i));
  }

  function updateStep(i, key, val) {
    setSteps(s => s.map((step, j) => j === i ? { ...step, [key]: val } : step));
  }

  function moveStep(i, dir) {
    setSteps(s => {
      const arr = [...s];
      const target = i + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[i], arr[target]] = [arr[target], arr[i]];
      return arr;
    });
  }

  function addVariable() {
    setWorkflow(w => ({ ...w, variables: [...w.variables, { key: "", value: "" }] }));
  }

  function removeVariable(i) {
    setWorkflow(w => ({ ...w, variables: w.variables.filter((_, j) => j !== i) }));
  }

  function updateVariable(i, key, val) {
    setWorkflow(w => ({ ...w, variables: w.variables.map((v, j) => j === i ? { ...v, [key]: val } : v) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      avg_hours: form.avg_hours ? Number(form.avg_hours) : null,
      steps: steps.filter(s => s.title.trim()),
      workflow: (workflow.workflow_json || workflow.n8n_workflow_id || workflow.variables.length)
        ? workflow : null,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = isEdit ? `/api/modules/${module.id}` : "/api/modules";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Failed to save"); setSaving(false); return; }
      onSuccess();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  function toggleFirmSize(size) {
    setForm(f => ({
      ...f,
      firm_sizes: f.firm_sizes.includes(size) ? f.firm_sizes.filter(s => s !== size) : [...f.firm_sizes, size],
    }));
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
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto",
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "28px 28px", width: "100%", maxWidth: 720, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        margin: "auto", overflowY: "auto", maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>{isEdit ? "Edit Module" : "New Module"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {loadingDetails ? (
          <div style={{ color: t.textSub, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Loading…</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {field("Name", <Input t={t} value={form.name} onChange={set("name")} placeholder="e.g. Client Intake Automation" />)}
              {field("Description",
                <textarea value={form.description} onChange={set("description")} placeholder="What does this module do?"
                  style={{
                    width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                    padding: "8px 12px", fontSize: 13, color: t.text, outline: "none",
                    resize: "vertical", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box",
                  }} />
              )}

              <div style={{ display: "flex", gap: 14, width: "100%", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 45%" }}>
                  {field("Practice Areas", <TagInput tags={form.practice_areas} onChange={v => setForm(f => ({ ...f, practice_areas: v }))} placeholder="e.g. Corporate, IP, Litigation" t={t} />)}
                </div>
                <div style={{ flex: "1 1 45%" }}>
                  {field("Tools", <TagInput tags={form.tools} onChange={v => setForm(f => ({ ...f, tools: v }))} placeholder="e.g. Clio, NetDocuments" t={t} />)}
                </div>
              </div>

              {field("Firm Sizes",
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {FIRM_SIZE_OPTIONS.map(size => (
                    <label key={size} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.firm_sizes.includes(size)} onChange={() => toggleFirmSize(size)}
                        style={{ accentColor: t.accent, width: 14, height: 14, cursor: "pointer" }} />
                      {size}
                    </label>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 14, width: "100%", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 30%" }}>
                  {field("Workflow Stage",
                    <Select t={t} value={form.workflow_stage} onChange={set("workflow_stage")} options={WORKFLOW_STAGES} style={{ width: "100%" }} />
                  )}
                </div>
                <div style={{ flex: "1 1 30%" }}>
                  {field("Runtime",
                    <Select t={t} value={form.runtime} onChange={set("runtime")} options={RUNTIMES} style={{ width: "100%" }} />
                  )}
                </div>
                <div style={{ flex: "1 1 15%" }}>
                  {field("Avg Hours", <Input t={t} type="number" value={form.avg_hours} onChange={set("avg_hours")} placeholder="0" />)}
                </div>
                <div style={{ flex: "1 1 15%" }}>
                  {field("Status",
                    <Select t={t} value={form.status} onChange={set("status")}
                      options={[["active", "Active"], ["draft", "Draft"], ["archived", "Archived"]]}
                      style={{ width: "100%" }} />
                  )}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <SectionLabel t={t}>Steps ({steps.length})</SectionLabel>
                <Btn t={t} variant="ghost" onClick={addStep} style={{ padding: "3px 10px", fontSize: 11 }}>+ Add Step</Btn>
              </div>
              {steps.length === 0 ? (
                <div style={{ color: t.textDim, fontSize: 12, padding: "12px 0" }}>No steps added yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{
                      background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 8,
                      padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                        <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                          style={{ background: "none", border: "none", color: i === 0 ? t.textDim : t.textSub, cursor: i === 0 ? "default" : "pointer", padding: 0, fontSize: 10, lineHeight: 1, fontFamily: "inherit" }}>▲</button>
                        <span style={{ color: t.textDim, fontSize: 10, textAlign: "center" }}>{i + 1}</span>
                        <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}
                          style={{ background: "none", border: "none", color: i === steps.length - 1 ? t.textDim : t.textSub, cursor: i === steps.length - 1 ? "default" : "pointer", padding: 0, fontSize: 10, lineHeight: 1, fontFamily: "inherit" }}>▼</button>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <input value={step.title} onChange={e => updateStep(i, "title", e.target.value)} placeholder="Step title"
                          style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <input value={step.tool} onChange={e => updateStep(i, "tool", e.target.value)} placeholder="Tool (optional)"
                            style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 11, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                          <input value={step.description} onChange={e => updateStep(i, "description", e.target.value)} placeholder="Description (optional)"
                            style={{ flex: 2, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 11, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <button onClick={() => removeStep(i)}
                        style={{ background: "none", border: "none", color: t.red, cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontFamily: "inherit", flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workflow Definition (collapsible) */}
            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={() => setShowWorkflow(!showWorkflow)}
                style={{
                  background: "none", border: "none", color: t.textSub, cursor: "pointer",
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                  padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                }}>
                {showWorkflow ? "▾" : "▸"} Workflow Definition
              </button>
              {showWorkflow && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  {field("n8n Workflow ID",
                    <Input t={t} value={workflow.n8n_workflow_id} onChange={e => setWorkflow(w => ({ ...w, n8n_workflow_id: e.target.value }))} placeholder="e.g. abc123" />
                  )}
                  {field("Workflow JSON",
                    <textarea value={workflow.workflow_json} onChange={e => setWorkflow(w => ({ ...w, workflow_json: e.target.value }))} placeholder='{"nodes": [...], "connections": {...}}'
                      style={{
                        width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                        padding: "8px 12px", fontSize: 12, color: t.text, outline: "none",
                        resize: "vertical", minHeight: 80, fontFamily: "monospace", boxSizing: "border-box",
                      }} />
                  )}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Variables</label>
                      <Btn t={t} variant="ghost" onClick={addVariable} style={{ padding: "2px 8px", fontSize: 10 }}>+ Add</Btn>
                    </div>
                    {workflow.variables.map((v, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <input value={v.key} onChange={e => updateVariable(i, "key", e.target.value)} placeholder="Key"
                          style={{ flex: 1, background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 11, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        <input value={v.value} onChange={e => updateVariable(i, "value", e.target.value)} placeholder="Default value"
                          style={{ flex: 1, background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 11, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        <button onClick={() => removeVariable(i)}
                          style={{ background: "none", border: "none", color: t.red, cursor: "pointer", padding: "0 4px", fontSize: 14, lineHeight: 1, fontFamily: "inherit" }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
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
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Module"}
              </Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deploy Modal
// ---------------------------------------------------------------------------
function DeployModal({ modules, projects, onClose, onSuccess, t, preselectedModuleId, preselectedProjectId }) {
  const [moduleId, setModuleId] = useState(preselectedModuleId || "");
  const [projectId, setProjectId] = useState(preselectedProjectId || "");
  const [connectorConfig, setConnectorConfig] = useState({});
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [variables, setVariables] = useState([]);

  // Load workflow variables when module changes
  useEffect(() => {
    if (!moduleId) { setVariables([]); return; }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const vars = data.workflow?.variables || [];
        setVariables(vars);
        const cfg = {};
        vars.forEach(v => { cfg[v.key] = v.value || ""; });
        setConnectorConfig(cfg);
      }
    })();
  }, [moduleId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!moduleId || !projectId) { setError("Module and project are required"); return; }
    setError("");
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/modules/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ module_id: moduleId, project_id: projectId, connector_config: connectorConfig, status }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Deploy failed"); setSaving(false); return; }
      onSuccess();
    } catch {
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
        padding: "28px 28px", width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        overflowY: "auto", maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>Deploy Module</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {field("Module",
            <select value={moduleId} onChange={e => setModuleId(e.target.value)}
              style={{
                width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                padding: "7px 10px", fontSize: 12, color: t.text, cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}>
              <option value="">Select a module…</option>
              {modules.filter(m => m.status === "active").map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}

          {field("Project",
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              style={{
                width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                padding: "7px 10px", fontSize: 12, color: t.text, cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}>
              <option value="">Select a project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client_name ? `${p.client_name} – ${p.name}` : p.name}</option>
              ))}
            </select>
          )}

          {variables.length > 0 && (
            <div>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "block" }}>
                Connector Config
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {variables.map(v => (
                  <div key={v.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: t.textSub, fontSize: 11, fontWeight: 600, minWidth: 80 }}>{v.key}</span>
                    <Input t={t} value={connectorConfig[v.key] || ""} onChange={e => setConnectorConfig(c => ({ ...c, [v.key]: e.target.value }))} placeholder={v.value || "Value"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {field("Status",
            <Select t={t} value={status} onChange={e => setStatus(e.target.value)}
              options={[["pending", "Pending"], ["active", "Active"]]}
              style={{ width: "100%" }} />
          )}

          {error && (
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn t={t} variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn t={t} disabled={saving} style={{ minWidth: 100 }}>
              {saving ? "Deploying…" : "Deploy"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match Modal (AI-powered module matching)
// ---------------------------------------------------------------------------
function MatchModal({ projectSummary, projectId, onClose, onDeploy, t }) {
  const [brief, setBrief] = useState(projectSummary || "");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  async function findMatches() {
    if (!brief.trim()) return;
    setError("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/modules/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ brief_text: brief, project_id: projectId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Matching failed"); setLoading(false); return; }
      setMatches(json.matches || []);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto",
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: "28px 28px", width: "100%", maxWidth: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        margin: "auto", overflowY: "auto", maxHeight: "90vh",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <PuzzleIcon color={t.accentLight} /> Match Modules
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe the project needs, practice area, tools in use…"
            style={{
              width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
              padding: "10px 12px", fontSize: 13, color: t.text, outline: "none",
              resize: "vertical", minHeight: 80, fontFamily: "inherit", boxSizing: "border-box",
            }} />

          <Btn t={t} onClick={findMatches} disabled={loading || !brief.trim()} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>
            <SparklesIcon /> {loading ? "Finding Matches…" : "Find Matches"}
          </Btn>

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <div style={{ width: 18, height: 18, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: t.textSub, fontSize: 13 }}>Analysing with AI…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {error && (
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
              {error}
            </div>
          )}

          {matches !== null && matches.length === 0 && (
            <div style={{ color: t.textSub, fontSize: 13, padding: "16px 0", textAlign: "center" }}>No matching modules found.</div>
          )}

          {matches !== null && matches.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {matches.map((m, i) => (
                <div key={i} style={{
                  background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 10,
                  padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: t.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.module?.name}</div>
                      <div style={{ color: t.textSub, fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>{m.reasoning}</div>
                      {/* Score bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 120, height: 4, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${m.score}%`, background: m.score > 70 ? "#4ade80" : m.score > 40 ? "#f59e0b" : "#f87171", borderRadius: 99 }} />
                        </div>
                        <span style={{ color: t.textSub, fontSize: 10, fontWeight: 600 }}>{m.score}%</span>
                      </div>
                    </div>
                    <Btn t={t} onClick={() => onDeploy(m.module)} style={{ padding: "5px 12px", fontSize: 11, flexShrink: 0 }}>
                      Deploy
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Outcome Modal
// ---------------------------------------------------------------------------
function OutcomeModal({ module, projects, onClose, onSuccess, t }) {
  const [form, setForm] = useState({ hours_saved: "", rating: "3", notes: "", project_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/modules/outcomes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          module_id: module.id,
          project_id: form.project_id || null,
          hours_saved: form.hours_saved ? Number(form.hours_saved) : null,
          rating: Number(form.rating),
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Failed to save"); setSaving(false); return; }
      onSuccess();
    } catch {
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
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>Add Outcome — {module.name}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {field("Hours Saved", <Input t={t} type="number" value={form.hours_saved} onChange={e => setForm(f => ({ ...f, hours_saved: e.target.value }))} placeholder="e.g. 12" />)}

          {field("Rating (1-5)",
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: String(n) }))}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: Number(form.rating) >= n ? t.accent : t.surfaceHigh,
                    color: Number(form.rating) >= n ? "#fff" : t.textSub,
                    border: `1px solid ${Number(form.rating) >= n ? t.accent : t.border}`,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  }}>{n}</button>
              ))}
            </div>
          )}

          {field("Notes",
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…"
              style={{
                width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                padding: "8px 12px", fontSize: 13, color: t.text, outline: "none",
                resize: "vertical", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box",
              }} />
          )}

          {field("Project (optional)",
            <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              style={{
                width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7,
                padding: "7px 10px", fontSize: 12, color: t.text, cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}>
              <option value="">None</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client_name ? `${p.client_name} – ${p.name}` : p.name}</option>
              ))}
            </select>
          )}

          {error && (
            <div style={{ background: t.redSoft, border: `1px solid ${t.red}25`, borderRadius: 8, padding: "8px 12px", color: t.red, fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn t={t} variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn t={t} disabled={saving} style={{ minWidth: 100 }}>
              {saving ? "Saving…" : "Save Outcome"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 4: Library Tab (Modules + Deployments)
// ---------------------------------------------------------------------------
function LibraryTab({ t }) {
  const [subView, setSubView] = useState("modules");
  const [modules, setModules] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deployFilter, setDeployFilter] = useState("all");

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [matchModule, setMatchModule] = useState(null);
  const [outcomeModule, setOutcomeModule] = useState(null);
  const [deployPreselect, setDeployPreselect] = useState({});

  const loadModules = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const [modsRes, depsRes, projsRes] = await Promise.all([
      fetch("/api/modules", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      fetch("/api/modules/deployments/list", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      supabase.from("projects").select("id, name, client_name, summary").order("id"),
    ]);
    if (modsRes.ok) setModules(await modsRes.json());
    if (depsRes.ok) setDeployments(await depsRes.json());
    setProjects(projsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  function archiveModule(mod) {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/modules/${mod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: mod.status === "archived" ? "active" : "archived" }),
      });
      loadModules();
    })();
  }

  function handleDeployFromMatch(mod) {
    setMatchModule(null);
    setDeployPreselect({ moduleId: mod.id });
    setShowDeployModal(true);
  }

  const filteredModules = modules.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.name || "").toLowerCase().includes(s) ||
      (m.description || "").toLowerCase().includes(s) ||
      (m.practice_areas || []).some(a => a.toLowerCase().includes(s)) ||
      (m.tools || []).some(t => t.toLowerCase().includes(s));
  });

  const filteredDeployments = deployFilter === "all"
    ? deployments
    : deployments.filter(d => d.status === deployFilter);

  return (
    <>
      {/* Modals */}
      {(showModuleModal || editingModule) && (
        <ModuleModal
          module={editingModule}
          t={t}
          onClose={() => { setShowModuleModal(false); setEditingModule(null); }}
          onSuccess={() => { setShowModuleModal(false); setEditingModule(null); loadModules(); }}
        />
      )}

      {showDeployModal && (
        <DeployModal
          modules={modules}
          projects={projects}
          t={t}
          preselectedModuleId={deployPreselect.moduleId || ""}
          preselectedProjectId={deployPreselect.projectId || ""}
          onClose={() => { setShowDeployModal(false); setDeployPreselect({}); }}
          onSuccess={() => { setShowDeployModal(false); setDeployPreselect({}); loadModules(); }}
        />
      )}

      {matchModule && (
        <MatchModal
          projectSummary=""
          projectId={null}
          t={t}
          onClose={() => setMatchModule(null)}
          onDeploy={handleDeployFromMatch}
        />
      )}

      {outcomeModule && (
        <OutcomeModal
          module={outcomeModule}
          projects={projects}
          t={t}
          onClose={() => setOutcomeModule(null)}
          onSuccess={() => { setOutcomeModule(null); loadModules(); }}
        />
      )}

      {/* Sub-view pills */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 2, background: t.surfaceHigh, borderRadius: 8, padding: 2 }}>
          {[["modules", "Modules"], ["deployments", "Deployments"]].map(([key, label]) => (
            <button key={key} onClick={() => setSubView(key)}
              style={{
                background: subView === key ? t.surface : "transparent",
                color: subView === key ? t.text : t.textSub,
                border: subView === key ? `1px solid ${t.border}` : "1px solid transparent",
                borderRadius: 6, padding: "5px 16px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : subView === "modules" ? (
        /* ---- Modules View ---- */
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <Input t={t} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…" style={{ maxWidth: 280 }} />
            <Btn t={t} onClick={() => setShowModuleModal(true)}>+ New Module</Btn>
          </div>

          {filteredModules.length === 0 ? (
            <div style={{
              background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 12,
              padding: "48px 0", textAlign: "center",
            }}>
              <div style={{ color: t.textSub, fontSize: 13, marginBottom: 16 }}>
                {search ? "No modules match your search." : "No modules in the library yet."}
              </div>
              {!search && <Btn t={t} onClick={() => setShowModuleModal(true)}>+ Create First Module</Btn>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
              {filteredModules.map(m => (
                <div key={m.id} style={{
                  background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12,
                  padding: "18px 20px", boxShadow: t.shadow, display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: t.text, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{m.name}</div>
                      <ModuleStatusPill status={m.status} />
                    </div>
                  </div>

                  {/* Description */}
                  {m.description && (
                    <div style={{ color: t.textSub, fontSize: 12, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {m.description}
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(m.practice_areas || []).map((a, i) => (
                      <span key={`pa-${i}`} style={{
                        background: t.accentSoft, color: t.accentLight, borderRadius: 4,
                        padding: "1px 7px", fontSize: 10, fontWeight: 600,
                      }}>{a}</span>
                    ))}
                    {(m.tools || []).map((tool, i) => (
                      <span key={`t-${i}`} style={{
                        background: t.greenSoft, color: t.green, borderRadius: 4,
                        padding: "1px 7px", fontSize: 10, fontWeight: 600,
                      }}>{tool}</span>
                    ))}
                  </div>

                  {/* Footer stats */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: t.textSub, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {m.workflow_stage && <span>{m.workflow_stage}</span>}
                    {m.avg_hours && <span>{m.avg_hours}h avg</span>}
                    <span>{m.times_used || 0} uses</span>
                    {m.runtime && <span>{m.runtime}</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
                    <Btn t={t} variant="ghost" onClick={() => setEditingModule(m)} style={{ padding: "3px 10px", fontSize: 11 }}>Edit</Btn>
                    <Btn t={t} variant="ghost" onClick={() => archiveModule(m)} style={{ padding: "3px 10px", fontSize: 11 }}>
                      {m.status === "archived" ? "Restore" : "Archive"}
                    </Btn>
                    <Btn t={t} variant="ghost" onClick={() => setMatchModule(m)} style={{ padding: "3px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                      <PuzzleIcon color={t.textSub} /> Match
                    </Btn>
                    <Btn t={t} variant="ghost" onClick={() => setOutcomeModule(m)} style={{ padding: "3px 10px", fontSize: 11 }}>Outcome</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ---- Deployments View ---- */
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[["all", "All"], ["pending", "Pending"], ["active", "Active"], ["complete", "Complete"]].map(([key, label]) => (
                <button key={key} onClick={() => setDeployFilter(key)}
                  style={{
                    background: deployFilter === key ? t.accentSoft : "transparent",
                    color: deployFilter === key ? t.accentLight : t.textSub,
                    border: `1px solid ${deployFilter === key ? t.accent + "30" : t.border}`,
                    borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <Btn t={t} onClick={() => { setDeployPreselect({}); setShowDeployModal(true); }}>+ Deploy Module</Btn>
          </div>

          {filteredDeployments.length === 0 ? (
            <div style={{
              background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 12,
              padding: "48px 0", textAlign: "center",
            }}>
              <div style={{ color: t.textSub, fontSize: 13 }}>No deployments{deployFilter !== "all" ? ` with status "${deployFilter}"` : ""} yet.</div>
            </div>
          ) : (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflowX: "auto", boxShadow: t.shadow }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 140px 120px", borderBottom: `1px solid ${t.border}` }}>
                {["Module", "Project", "Status", "Deployed at", "Deployed by"].map((h, i) => (
                  <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>

              {filteredDeployments.map((d, i) => (
                <div key={d.id}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 140px 120px", alignItems: "center" }}>
                    <div style={{ padding: "12px 18px", color: t.text, fontSize: 13, fontWeight: 500 }}>{d.modules?.name || "—"}</div>
                    <div style={{ padding: "12px 18px", color: t.text, fontSize: 13 }}>{d.projects?.name || "—"}</div>
                    <div style={{ padding: "12px 18px" }}><DeployStatusPill status={d.status} /></div>
                    <div style={{ padding: "12px 18px", color: t.textSub, fontSize: 12 }}>
                      {d.deployed_at ? new Date(d.deployed_at).toLocaleDateString() : "—"}
                    </div>
                    <div style={{ padding: "12px 18px", color: t.textSub, fontSize: 12 }}>{d.deployed_by ? d.deployed_by.slice(0, 8) + "…" : "—"}</div>
                  </div>
                  {i < filteredDeployments.length - 1 && <Line t={t} />}
                </div>
              ))}
            </div>
          )}
        </>
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
      background: t.bg, fontFamily: "'Inter', sans-serif",
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
            {[["clients", "Clients"], ["team", "Team"], ["projects", "Projects"], ["library", "Library"]].map(([key, label]) => (
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
        {activeTab === "library"  && <LibraryTab  t={t} />}
      </div>
    </div>
  );
}
