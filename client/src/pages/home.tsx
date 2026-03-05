import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const brand = {
  navy: "#1a2235",
  navyMid: "#1e2a3d",
  navyLight: "#243048",
  steel: "#4a7fa5",
  steelLight: "#6a9fc0",
  steelSoft: "rgba(74,127,165,0.12)",
  text: "#e8edf5",
  textMuted: "#8a96a8",
  textDim: "#4a5568",
  border: "rgba(255,255,255,0.08)",
  green: "#4ade80",
  greenSoft: "rgba(74,222,128,0.1)",
  amber: "#fbbf24",
  amberSoft: "rgba(251,191,36,0.1)",
  red: "#f87171",
};

const projects = [
  {
    id: 1,
    client: "Nautilus Law",
    project: "Intake Process & Smokeball Automation",
    phase: "Implementation",
    progress: 65,
    status: "active",
    budget: 4500,
    spent: 2925,
    dueDate: "2026-03-28",
    manager: "Amresh S.",
    phases: [
      { name: "Audit & Discovery", status: "complete", progress: 100 },
      { name: "Process Design", status: "complete", progress: 100 },
      { name: "Smokeball Configuration", status: "active", progress: 60 },
      { name: "Automation & Testing", status: "pending", progress: 0 },
      { name: "Handover & Training", status: "pending", progress: 0 },
    ],
    tasks: [
      { id: 1, title: "Map current intake channels", assignee: "Priya K.", status: "done", due: "Mar 5" },
      { id: 2, title: "Design unified intake form", assignee: "Priya K.", status: "done", due: "Mar 8" },
      { id: 3, title: "Configure Smokeball matter categories", assignee: "Rohan M.", status: "in-progress", due: "Mar 14" },
      { id: 4, title: "Set up automated advice letter templates", assignee: "Rohan M.", status: "in-progress", due: "Mar 18" },
      { id: 5, title: "UAT with Nautilus team", assignee: "Amresh S.", status: "todo", due: "Mar 22" },
      { id: 6, title: "Training session delivery", assignee: "Amresh S.", status: "todo", due: "Mar 27" },
    ],
    documents: [
      { name: "Intake Process Audit Report", type: "PDF", uploaded: "Mar 6", size: "1.2 MB" },
      { name: "Smokeball Configuration Guide", type: "DOCX", uploaded: "Mar 10", size: "840 KB" },
      { name: "Advice Letter Template v1", type: "DOCX", uploaded: "Mar 11", size: "210 KB" },
      { name: "Signed Proposal", type: "PDF", uploaded: "Mar 1", size: "520 KB" },
    ],
    invoices: [
      { id: "INV-001", description: "Phase 1 – Audit & Design (50%)", amount: 2250, status: "paid", date: "Mar 2" },
      { id: "INV-002", description: "Phase 2 – Implementation (35%)", amount: 1575, status: "pending", date: "Mar 20" },
      { id: "INV-003", description: "Phase 3 – Handover (15%)", amount: 675, status: "upcoming", date: "Mar 30" },
    ],
  },
  {
    id: 2,
    client: "Meridian Legal",
    project: "Legal Ops Audit & CLM Implementation",
    phase: "Audit",
    progress: 25,
    status: "active",
    budget: 12000,
    spent: 3000,
    dueDate: "2026-05-15",
    manager: "Abdurahman H.",
    phases: [
      { name: "Legal Ops Audit", status: "active", progress: 50 },
      { name: "Workflow Design", status: "pending", progress: 0 },
      { name: "CLM Implementation", status: "pending", progress: 0 },
      { name: "Testing & Go-Live", status: "pending", progress: 0 },
    ],
    tasks: [
      { id: 1, title: "Stakeholder interviews", assignee: "Abdurahman H.", status: "done", due: "Mar 7" },
      { id: 2, title: "Contract workflow mapping", assignee: "Priya K.", status: "in-progress", due: "Mar 15" },
      { id: 3, title: "Tech stack assessment", assignee: "Rohan M.", status: "in-progress", due: "Mar 17" },
      { id: 4, title: "Audit report draft", assignee: "Abdurahman H.", status: "todo", due: "Mar 25" },
    ],
    documents: [
      { name: "Signed Proposal", type: "PDF", uploaded: "Feb 28", size: "480 KB" },
      { name: "Stakeholder Interview Notes", type: "DOCX", uploaded: "Mar 7", size: "320 KB" },
    ],
    invoices: [
      { id: "INV-001", description: "Audit Phase (25%)", amount: 3000, status: "paid", date: "Mar 1" },
      { id: "INV-002", description: "Workflow Design (35%)", amount: 4200, status: "upcoming", date: "Apr 1" },
    ],
  },
  {
    id: 3,
    client: "Brightside Financial",
    project: "In-House Legal Workflow Redesign",
    phase: "Complete",
    progress: 100,
    status: "complete",
    budget: 8500,
    spent: 8500,
    dueDate: "2026-02-28",
    manager: "Amresh S.",
    phases: [
      { name: "Audit", status: "complete", progress: 100 },
      { name: "Process Design", status: "complete", progress: 100 },
      { name: "Implementation", status: "complete", progress: 100 },
      { name: "Handover", status: "complete", progress: 100 },
    ],
    tasks: [],
    documents: [
      { name: "Final Audit Report", type: "PDF", uploaded: "Jan 20", size: "2.1 MB" },
      { name: "Legal Playbook v2", type: "DOCX", uploaded: "Feb 10", size: "1.8 MB" },
      { name: "Process Maps", type: "PDF", uploaded: "Feb 14", size: "3.2 MB" },
      { name: "Completion Sign-off", type: "PDF", uploaded: "Feb 28", size: "180 KB" },
    ],
    invoices: [
      { id: "INV-001", description: "Audit Phase", amount: 2125, status: "paid", date: "Jan 15" },
      { id: "INV-002", description: "Design & Implementation", amount: 4250, status: "paid", date: "Feb 1" },
      { id: "INV-003", description: "Handover & Completion", amount: 2125, status: "paid", date: "Feb 28" },
    ],
  },
];

function LexOpsLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {/* Bracket icon matching the actual logo */}
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <rect x="0" y="0" width="4" height="24" rx="1" fill="#e8edf5"/>
        <rect x="0" y="0" width="14" height="4" rx="1" fill="#8fafc4"/>
        <rect x="0" y="20" width="10" height="4" rx="1" fill="#e8edf5"/>
      </svg>
      <span style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 600, color: brand.text, letterSpacing: "-0.02em" }}>LexOps</span>
    </div>
  );
}

function StatusPill({ status, label }: any) {
  const map: any = {
    active:   { bg: brand.greenSoft,  color: brand.green,      border: "rgba(74,222,128,0.2)" },
    complete: { bg: brand.steelSoft,  color: brand.steelLight, border: "rgba(74,127,165,0.25)" },
    pending:  { bg: brand.amberSoft,  color: brand.amber,      border: "rgba(251,191,36,0.2)" },
    paid:     { bg: brand.greenSoft,  color: brand.green,      border: "rgba(74,222,128,0.2)" },
    upcoming: { bg: "rgba(255,255,255,0.04)", color: brand.textMuted, border: brand.border },
  };
  const v = map[status] || map.pending;
  return (
    <span style={{
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: v.color, flexShrink: 0, display: "inline-block" }} />
      {label}
    </span>
  );
}

function ThinProgress({ value }: any) {
  const color = value === 100 ? brand.green : brand.steel;
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function SidebarProject({ p, selected, onClick }: any) {
  const active = selected?.id === p.id;
  return (
    <div onClick={onClick} style={{
      background: active ? brand.navyLight : "transparent",
      border: `1px solid ${active ? brand.steel + "55" : brand.border}`,
      borderRadius: 9, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ color: brand.text, fontWeight: 600, fontSize: 12.5, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.client}</div>
          <div style={{ color: brand.textMuted, fontSize: 11, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.project}</div>
        </div>
        <StatusPill status={p.status} label={p.status === "complete" ? "Done" : p.phase} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}><ThinProgress value={p.progress} /></div>
        <span style={{ color: brand.textMuted, fontSize: 11, fontWeight: 600 }}>{p.progress}%</span>
      </div>
    </div>
  );
}

function OverviewTab({ project, isInternal }: any) {
  const daysLeft = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / 86400000);
  const doneTasks = project.tasks.filter((t: any) => t.status === "done").length;
  const stats = [
    { label: "Progress", value: `${project.progress}%`, sub: project.phase, hi: true },
    { label: "Due Date", value: project.dueDate.slice(5).replace("-", "/"), sub: daysLeft > 0 ? `${daysLeft} days left` : "Past due" },
    ...(isInternal ? [{ label: "Budget", value: `$${project.budget.toLocaleString()}`, sub: `$${project.spent.toLocaleString()} spent` }] : []),
    { label: "Tasks", value: `${doneTasks}/${project.tasks.length}`, sub: "completed" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length},1fr)`, gap: 12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ color: brand.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
            <div style={{ color: s.hi ? brand.steelLight : brand.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 3 }}>{s.value}</div>
            <div style={{ color: brand.textDim, fontSize: 11 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 10, padding: "20px 24px" }}>
        <div style={{ color: brand.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Project Phases</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {project.phases.map((ph: any, i: number) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: ph.status === "complete" ? brand.green : ph.status === "active" ? brand.steel : "transparent",
                    border: `2px solid ${ph.status === "complete" ? brand.green : ph.status === "active" ? brand.steel : brand.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
                  }}>
                    {ph.status === "complete" && <span style={{ color: brand.navy, fontWeight: 800, fontSize: 11 }}>✓</span>}
                    {ph.status === "active" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
                  </div>
                  <span style={{ color: ph.status === "pending" ? brand.textMuted : brand.text, fontSize: 13, fontWeight: 500 }}>{ph.name}</span>
                </div>
                <StatusPill
                  status={ph.status === "complete" ? "complete" : ph.status === "active" ? "active" : "pending"}
                  label={ph.status === "complete" ? "Done" : ph.status === "active" ? "Active" : "Pending"}
                />
              </div>
              <div style={{ paddingLeft: 30 }}><ThinProgress value={ph.progress} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksTab({ tasks, isInternal }: any) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? tasks : tasks.filter((t: any) => t.status === filter);
  const tc: any = {
    done: { dot: brand.green, label: "Done", lc: brand.green },
    "in-progress": { dot: brand.steel, label: "Active", lc: brand.steelLight },
    todo: { dot: brand.textDim, label: "To Do", lc: brand.textMuted },
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["all","in-progress","todo","done"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? brand.steel : "transparent",
            color: filter === f ? "#fff" : brand.textMuted,
            border: `1px solid ${filter === f ? brand.steel : brand.border}`,
            borderRadius: 7, padding: "4px 13px", fontSize: 12, cursor: "pointer", fontWeight: 500, transition: "all 0.15s"
          }}>
            {f === "all" ? "All" : f === "in-progress" ? "Active" : f === "todo" ? "To Do" : "Done"}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ color: brand.textMuted, textAlign: "center", padding: "40px 0", fontSize: 13 }}>No tasks to display</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((task: any) => {
              const t = tc[task.status];
              return (
                <div key={task.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 9, padding: "12px 16px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: task.status === "done" ? brand.textMuted : brand.text, fontSize: 13, fontWeight: 500, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</div>
                      {isInternal && <div style={{ color: brand.textDim, fontSize: 11, marginTop: 1 }}>{task.assignee}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: brand.textMuted, fontSize: 11 }}>Due {task.due}</span>
                    <span style={{ color: t.lc, fontSize: 11, fontWeight: 600 }}>{t.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

function DocumentsTab({ documents }: any) {
  const typeColor: any = { PDF: brand.red, DOCX: brand.steel, XLSX: brand.green };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {documents.map((doc: any, i: number) => {
        const c = typeColor[doc.type] || brand.steel;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 9, padding: "12px 16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 7, flexShrink: 0,
                background: c + "18", border: `1px solid ${c}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: c, letterSpacing: "0.02em"
              }}>{doc.type}</div>
              <div>
                <div style={{ color: brand.text, fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                <div style={{ color: brand.textDim, fontSize: 11, marginTop: 1 }}>{doc.size} · Uploaded {doc.uploaded}</div>
              </div>
            </div>
            <button style={{
              background: "transparent", color: brand.steelLight,
              border: `1px solid ${brand.steel}44`, borderRadius: 7,
              padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500
            }}>↓ Download</button>
          </div>
        );
      })}
    </div>
  );
}

function InvoicesTab({ invoices, isInternal }: any) {
  const total = invoices.reduce((s: number, i: any) => s + i.amount, 0);
  const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.amount, 0);
  return (
    <div>
      {isInternal && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Total Value", value: `$${total.toLocaleString()}`, color: brand.text },
            { label: "Collected", value: `$${paid.toLocaleString()}`, color: brand.green },
            { label: "Outstanding", value: `$${(total-paid).toLocaleString()}`, color: brand.amber },
          ].map((s, i) => (
            <div key={i} style={{ background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: brand.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {invoices.map((inv: any, i: number) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 9, padding: "14px 16px"
          }}>
            <div>
              <div style={{ color: brand.text, fontSize: 13, fontWeight: 500 }}>{inv.description}</div>
              <div style={{ color: brand.textDim, fontSize: 11, marginTop: 2 }}>{inv.id} · Due {inv.date}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: brand.text, fontWeight: 700, fontSize: 16 }}>${inv.amount.toLocaleString()}</span>
              <StatusPill status={inv.status} label={inv.status === "paid" ? "Paid" : inv.status === "pending" ? "Due" : "Upcoming"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LexOpsDashboard() {
  const [view, setView] = useState("internal");
  const [selected, setSelected] = useState(projects[0]);
  const [tab, setTab] = useState("overview");

  return (
    <div style={{ background: brand.navy, minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: brand.text, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{
        background: brand.navyMid, borderBottom: `1px solid ${brand.border}`,
        padding: "0 28px", height: 54,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LexOpsLogo />
          <div style={{ width: 1, height: 18, background: brand.border }} />
          <span style={{ color: brand.textMuted, fontSize: 12 }}>Client Portal</span>
        </div>
        <div style={{ display: "flex", background: brand.navy, borderRadius: 8, border: `1px solid ${brand.border}`, padding: 3, gap: 2 }}>
          {[["internal","⚙ Internal"],["client","👤 Client View"]].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              background: view === k ? brand.steel : "transparent",
              color: view === k ? "#fff" : brand.textMuted,
              border: "none", borderRadius: 6, padding: "5px 16px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 54px)" }}>
        {/* Sidebar */}
        {view === "internal" && (
          <div style={{ width: 282, borderRight: `1px solid ${brand.border}`, background: brand.navyMid, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 14px 10px" }}>
              <div style={{ color: brand.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>All Projects</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Active", val: projects.filter(p=>p.status==="active").length, color: brand.green },
                  { label: "Complete", val: projects.filter(p=>p.status==="complete").length, color: brand.steelLight },
                ].map((s,i) => (
                  <div key={i} style={{ background: brand.navyLight, border: `1px solid ${brand.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ color: brand.textMuted, fontSize: 11 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {projects.map(p => (
                  <SidebarProject key={p.id} p={p} selected={selected} onClick={() => { setSelected(p); setTab("overview"); }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {selected && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{ color: brand.textMuted, fontSize: 12, marginBottom: 3 }}>{selected.client}</div>
                  <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: brand.text }}>{selected.project}</h1>
                  {view === "internal" && (
                    <div style={{ color: brand.textMuted, fontSize: 12, marginTop: 5 }}>Manager: <span style={{ color: brand.steelLight }}>{selected.manager}</span></div>
                  )}
                </div>
                <StatusPill status={selected.status} label={selected.status === "complete" ? "Complete" : selected.phase} />
              </div>

              {/* Tab bar */}
              <div style={{ borderBottom: `1px solid ${brand.border}`, marginBottom: 20, display: "flex" }}>
                {["overview","tasks","documents","invoices"].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    background: "transparent", border: "none",
                    borderBottom: tab === t ? `2px solid ${brand.steel}` : "2px solid transparent",
                    color: tab === t ? brand.text : brand.textMuted,
                    padding: "8px 18px", fontSize: 13,
                    fontWeight: tab === t ? 600 : 400,
                    cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s", marginBottom: -1
                  }}>{t}</button>
                ))}
              </div>

              {tab === "overview" && <OverviewTab project={selected} isInternal={view === "internal"} />}
              {tab === "tasks" && <TasksTab tasks={selected.tasks} isInternal={view === "internal"} />}
              {tab === "documents" && <DocumentsTab documents={selected.documents} />}
              {tab === "invoices" && <InvoicesTab invoices={selected.invoices} isInternal={view === "internal"} />}
            </>
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${brand.border}`, padding: "10px 28px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: brand.textDim, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</span>
        <span style={{ color: brand.textDim, fontSize: 11 }}>hello@teamsquared.io</span>
      </div>
    </div>
  );
}
