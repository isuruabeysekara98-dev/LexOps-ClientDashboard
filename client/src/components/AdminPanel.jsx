import { useState, useEffect, useCallback } from "react";
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
// Invite User Modal
// ---------------------------------------------------------------------------
function InviteModal({ onClose, onSuccess, t, mode }) {
  const [form, setForm] = useState({ email: "", full_name: "", role: "client", project_ids: [] });
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
  client_name: "", project: "", phase: "", due_date: "",
  manager: "", budget: "", summary: "", status: "active", progress: 0,
};

function ProjectModal({ project, onClose, onSuccess, t }) {
  const [form, setForm] = useState(project
    ? { ...project, budget: String(project.budget ?? ""), progress: project.progress ?? 0 }
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
        margin: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>{isEdit ? "Edit Project" : "New Project"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.textSub, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {field("Client Name",  <Input t={t} value={form.client_name} onChange={set("client_name")} placeholder="Acme Corp" />, true)}
            {field("Project Name", <Input t={t} value={form.project}     onChange={set("project")}     placeholder="CRM Implementation" />, true)}
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
// Users Tab
// ---------------------------------------------------------------------------
function UsersTab({ t, mode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [removing, setRemoving] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

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

  return (
    <>
      {showInvite && (
        <InviteModal
          t={t} mode={mode}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); loadUsers(); }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionLabel t={t}>All Users ({users.length})</SectionLabel>
        <Btn t={t} onClick={() => setShowInvite(true)}>+ Invite User</Btn>
      </div>

      {loading ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={{ color: t.textSub, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No users found.</div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: t.shadow }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", gap: 0, borderBottom: `1px solid ${t.border}` }}>
            {["Name / Email", "ID", "Role", "Actions"].map((h, i) => (
              <div key={i} style={{ padding: "10px 18px", color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>

          {users.map((user, i) => (
            <div key={user.id}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", alignItems: "center" }}>
                {/* Name + email */}
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{user.full_name || "—"}</div>
                  <div style={{ color: t.textSub, fontSize: 11, marginTop: 2 }}>{user.email}</div>
                </div>

                {/* UUID (truncated) */}
                <div style={{ padding: "14px 18px" }}>
                  <code style={{ color: t.textDim, fontSize: 10 }}>{user.id.slice(0, 8)}…</code>
                </div>

                {/* Inline role select */}
                <div style={{ padding: "14px 18px" }}>
                  <Select
                    t={t}
                    value={user.role}
                    onChange={e => changeRole(user.id, e.target.value)}
                    options={ROLES.map(r => [r, ROLE_LABELS[r]])}
                    style={{ width: "100%", fontSize: 12 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ padding: "14px 18px" }}>
                  <Btn
                    t={t} variant="danger"
                    disabled={removing === user.id}
                    onClick={() => removeUser(user.id)}
                  >
                    {removing === user.id ? "…" : "Remove"}
                  </Btn>
                </div>
              </div>
              {i < users.length - 1 && <Line t={t} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Projects Tab
// ---------------------------------------------------------------------------
function ProjectsTab({ t }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("id");
    setProjects(data || []);
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
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: t.shadow }}>
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
                    <div style={{ color: t.text, fontSize: 13 }}>{p.project}</div>
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
  const [activeTab, setActiveTab] = useState("users");

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
          <div style={{ display: "flex", gap: 0 }}>
            {[["users", "Users"], ["projects", "Projects"]].map(([key, label]) => (
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
        {activeTab === "users"    && <UsersTab    t={t} mode={mode} />}
        {activeTab === "projects" && <ProjectsTab t={t} />}
      </div>
    </div>
  );
}
