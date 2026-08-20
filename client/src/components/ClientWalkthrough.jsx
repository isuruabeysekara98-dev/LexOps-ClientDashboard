import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Calendar, Check, ClipboardList, Folder, HelpCircle, MessageSquare, X,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "actions", label: "Your Actions" },
  { id: "resources", label: "Resources" },
  { id: "invoices", label: "Invoices" },
  { id: "support", label: "Support" },
];

function Logo({ h = 22 }) {
  return (
    <svg width={h * (307 / 97)} height={h} viewBox="0 0 307 97" fill="none" aria-hidden>
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#232A34"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#375971"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#232A34"/>
    </svg>
  );
}

function stepsFor(firstName, projectName) {
  return [
    {
      id: "overview",
      tab: "overview",
      eyebrow: "Your home",
      title: `Welcome${firstName ? `, ${firstName}` : ""}.`,
      body: "This is your project home. In one glance you can see where the work is, and what still needs you.",
      hint: "Start on Overview — the blue bar shows the current milestone.",
      project: projectName || "",
    },
    {
      id: "actions",
      tab: "actions",
      eyebrow: "Your part",
      title: "If we need you, it is here.",
      body: "Your Actions is your to-do list. Items marked Client are yours. Items marked LexOps are ours.",
      hint: "Try the circle on the right — that is how you mark something done.",
      project: "",
    },
    {
      id: "resources",
      tab: "resources",
      eyebrow: "Your files",
      title: "Files and tools, in one place.",
      body: "Download reports and templates, or open the systems we set up for you. No more hunting through email.",
      hint: "Come back to Resources whenever you need a document.",
      project: "",
    },
    {
      id: "support",
      tab: "support",
      eyebrow: "Your team",
      title: "Need us? One click.",
      body: "Book a call with your manager, or send a message. Support is always the last tab.",
      hint: "Use it for questions, blockers, or a quick check-in.",
      project: "",
    },
  ];
}

function PhaseDot({ n, done, active }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
      <div
        className={active ? "lx-walk-pulse" : undefined}
        style={{
          width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, marginBottom: 6,
          background: done ? "#375971" : active ? "#fff" : "#F4F8FB",
          color: done ? "#fff" : active ? "#375971" : "#9DB5C9",
          border: `2px solid ${done || active ? "#375971" : "#E8E8E8"}`,
        }}
      >
        {done ? <Check size={16} strokeWidth={3} /> : n}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: done || active ? "#375971" : "#9DB5C9", textAlign: "center", lineHeight: 1.25 }}>
        {n === 1 ? "Intake" : n === 2 ? "Setup" : n === 3 ? "Build" : "Live"}
      </div>
    </div>
  );
}

function PortalPreview({ step, t, onJump, actionDone, onToggleAction }) {
  const bodyStyle = { padding: 20, background: "#fff", flex: 1, minHeight: 0, overflow: "hidden", boxSizing: "border-box" };
  const row = { background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" };
  return (
    <div className="lx-walk-preview">
      <div style={{
        background: "#232A34",
        borderRadius: "14px 14px 0 0",
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 14,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9542E", opacity: 0.85 }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97706", opacity: 0.85 }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3C7A52", opacity: 0.85 }} />
        </div>
        <div style={{
          flex: 1, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.55)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
          letterSpacing: "0.01em",
        }}>
          client.lex-ops.io
        </div>
      </div>
      <div style={{
        background: "#fff",
        border: `1px solid ${t.border}`,
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        overflow: "hidden",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}>
      <div style={{
        height: 48, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${t.border}`, background: "#FAFBFC", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo h={18} />
          <span style={{ width: 1, height: 14, background: t.border }} />
          <span style={{ fontSize: 13, color: t.textSub }}>Client Portal</span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          You
        </div>
      </div>

      <div style={{ padding: "0 20px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 2, overflowX: "auto", flexShrink: 0 }}>
        {TABS.map((tab) => {
          const on = tab.id === step.tab;
          const linked = ["overview", "actions", "resources", "support"].includes(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => linked && onJump(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: on ? `2.5px solid ${t.accent}` : "2.5px solid transparent",
                color: on ? t.text : t.textSub,
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                cursor: linked ? "pointer" : "default",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                opacity: linked || on ? 1 : 0.45,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={bodyStyle}>
        {step.tab === "overview" && (
          <div className="lx-walk-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{
              background: "linear-gradient(135deg, #375971 0%, #232A34 100%)",
              borderRadius: 12, padding: "16px 20px", color: "#fff", marginBottom: 12,
              boxShadow: "0 8px 28px rgba(55,89,113,0.28)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
              <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.65, fontWeight: 600, marginBottom: 4 }}>Currently active</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Satoshi', sans-serif", letterSpacing: "-0.02em" }}>Milestone 4 — Document generation</div>
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                {[{ v: "55%", l: "Progress" }, { v: "2", l: "Need you" }].map((m) => (
                  <div key={m.l}>
                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{m.v}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textSub, marginBottom: 12 }}>Where you are</div>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <PhaseDot n={1} done />
                <div style={{ height: 2, flex: 0.4, background: "#375971", marginTop: 19 }} />
                <PhaseDot n={2} done />
                <div style={{ height: 2, flex: 0.4, background: "#375971", marginTop: 19 }} />
                <PhaseDot n={3} done />
                <div style={{ height: 2, flex: 0.4, background: "#E8E8E8", marginTop: 19 }} />
                <PhaseDot n={4} active />
              </div>
            </div>
            <div style={{
              marginTop: 10, background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12,
              padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>2 items need you in this milestone</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: t.accent, borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap" }}>Your Actions →</span>
            </div>
          </div>
        )}

        {step.tab === "actions" && (
          <div className="lx-walk-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 10 }}>Needs you</div>
            <button
              type="button"
              onClick={onToggleAction}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                background: actionDone ? "#E7F3EC" : "#fff",
                border: `1px solid ${actionDone ? "rgba(60,122,82,0.28)" : t.border}`,
                borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start",
                boxShadow: actionDone ? "none" : "0 0 0 4px rgba(55,89,113,0.14)",
                transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                border: `2px solid ${actionDone ? "#3C7A52" : t.accent}`,
                background: actionDone ? "#3C7A52" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {actionDone && <Check size={12} color="#fff" strokeWidth={3} />}
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: t.text, textDecoration: actionDone ? "line-through" : "none" }}>
                  Share advice letter templates
                </span>
                <span style={{ display: "block", fontSize: 12, color: t.textSub, marginTop: 2 }}>
                  {actionDone ? "Marked done — LexOps will verify" : "Click the circle to mark this complete"}
                </span>
              </span>
            </button>
            <div style={{ ...row, marginTop: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${t.accent}`, flexShrink: 0, marginTop: 1 }} />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: t.text }}>Conduct UAT testing</span>
                <span style={{ display: "block", fontSize: 12, color: "#D97706", marginTop: 2 }}>Due in 3 days · Client</span>
              </span>
            </div>
            <div style={{ ...row, marginTop: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${t.accent}`, flexShrink: 0, marginTop: 1 }} />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: t.text }}>Upload signed engagement letter</span>
                <span style={{ display: "block", fontSize: 12, color: t.textSub, marginTop: 2 }}>Waiting on your file</span>
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: "12px 0 8px" }}>LexOps is doing</div>
            <div style={{ ...row, opacity: 0.78 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${t.border}`, flexShrink: 0, marginTop: 1 }} />
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: t.text }}>Configure intake mapping</span>
                <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#E7F3EC", color: "#3C7A52" }}>LexOps</span>
              </span>
            </div>
            <div style={{ ...row, marginTop: 8, opacity: 0.55 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", background: "#3C7A52", flexShrink: 0, marginTop: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: t.text, textDecoration: "line-through" }}>Review generated letters</span>
                <span style={{ display: "block", fontSize: 12, color: t.textSub, marginTop: 2 }}>Done</span>
              </span>
            </div>
          </div>
        )}

        {step.tab === "resources" && (
          <div className="lx-walk-panel" style={{ height: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: "100%" }}>
              <div style={{ background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                  <Folder size={14} /> Documents
                </div>
                {[
                  { ext: "PDF", name: "Testing report v4", bg: "#fde8e8", fg: "#C9542E" },
                  { ext: "DOC", name: "Advice templates", bg: "#E4F1F8", fg: t.accent },
                  { ext: "PDF", name: "Scope of work", bg: "#fde8e8", fg: "#C9542E" },
                  { ext: "HTML", name: "Process flowchart", bg: "#E7F3EC", fg: "#3C7A52" },
                  { ext: "XLS", name: "Fee schedule", bg: "#EEF4F8", fg: t.accent },
                ].map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, background: d.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: d.fg, flexShrink: 0 }}>{d.ext}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                  <ClipboardList size={14} /> Tools
                </div>
                {["Smokeball", "SharePoint", "Calendly", "Power BI"].map((name) => (
                  <div key={name} style={{ background: "#fff", borderRadius: 10, padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, border: `1px solid ${t.border}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: t.accent, color: "#fff", borderRadius: 7, padding: "5px 10px" }}>Launch</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step.tab === "support" && (
          <div className="lx-walk-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{
              background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.accent, color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>M</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Book a call with Mark</div>
                  <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>30 min · Video · Typical reply in 2 hours</div>
                </div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.accent, color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                <Calendar size={14} strokeWidth={2} /> Book
              </span>
            </div>
            <div style={{
              marginTop: 10, background: "#FAFBFC", border: `1px dashed ${t.border}`, borderRadius: 12, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 10, color: t.textSub, fontSize: 13,
            }}>
              <MessageSquare size={16} color={t.accent} strokeWidth={1.75} />
              Or send a message — we pick it up in Support
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSub, letterSpacing: "0.08em", textTransform: "uppercase", margin: "14px 0 8px" }}>Recent messages</div>
            <div style={{ background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Question on UAT access</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#E4F1F8", color: t.accent }}>Open</span>
              </div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>Sent yesterday</div>
            </div>
            <div style={{ background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Need help with SharePoint folders</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#EEF4F8", color: t.accent }}>Waiting</span>
              </div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>Updated 4 hours ago</div>
            </div>
            <div style={{ background: "#FAFBFC", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Invoice copy requested</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#E7F3EC", color: "#3C7A52" }}>Resolved</span>
              </div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>Closed last week</div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default function ClientWalkthrough({ userProfile, project, t, replay, onDismiss }) {
  const firstName = (userProfile?.full_name || "").split(" ")[0] || "";
  const projectName = project?.project || project?.name || "";
  const steps = stepsFor(firstName, projectName);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [actionDone, setActionDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const step = steps[index];
  const last = index === steps.length - 1;
  const indexRef = useRef(index);
  const lastRef = useRef(last);
  const leavingRef = useRef(false);
  indexRef.current = index;
  lastRef.current = last;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function go(next) {
    if (next < 0 || next >= steps.length) return;
    setDir(next > indexRef.current ? 1 : -1);
    setIndex(next);
  }

  function jumpTab(tabId) {
    const i = steps.findIndex((s) => s.tab === tabId);
    if (i >= 0) go(i);
  }

  function finish() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onDismiss(), 220);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (lastRef.current) finish();
        else go(indexRef.current + 1);
      }
      if (e.key === "ArrowLeft") go(indexRef.current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lx-walk-title"
      className={leaving ? "lx-walk-root lx-walk-leave" : "lx-walk-root"}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "#F4F8FB",
        fontFamily: "'Satoshi', sans-serif",
        color: t.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        .lx-walk-root { animation: lxWalkFade 0.35s ease; }
        .lx-walk-leave { animation: lxWalkOut 0.22s ease forwards; }
        .lx-walk-copy { animation: lxWalkIn 0.42s cubic-bezier(.2,.7,.2,1); }
        .lx-walk-panel { animation: lxWalkIn 0.45s cubic-bezier(.2,.7,.2,1); }
        .lx-walk-pulse { animation: lxWalkPulse 2.2s ease-in-out infinite; }
        .lx-walk-bar { transition: width 0.45s cubic-bezier(.2,.7,.2,1); }
        .lx-walk-next { transition: background 0.15s ease; }
        .lx-walk-next:hover { background: #232A34 !important; }
        .lx-walk-back { transition: background 0.15s ease; }
        .lx-walk-back:hover { background: #F4F8FB !important; }
        .lx-walk-skip { transition: color 0.15s ease, background 0.15s ease; }
        .lx-walk-skip:hover { color: #232A34 !important; background: #F4F8FB; }
        .lx-walk-orb { position: absolute; border-radius: 50%; pointer-events: none; }
        @keyframes lxWalkFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lxWalkOut { to { opacity: 0; } }
        @keyframes lxWalkIn { from { opacity: 0; transform: translateX(var(--lx-dir, 18px)); } to { opacity: 1; transform: none; } }
        @keyframes lxWalkPulse {
          0%,100% { box-shadow: 0 0 0 6px rgba(55,89,113,0.16); }
          50% { box-shadow: 0 0 0 14px rgba(55,89,113,0.05); }
        }
        .lx-walk-preview {
          transform: none;
          width: 100%;
          max-width: 760px;
          height: 484px;
          min-height: 484px;
          max-height: 484px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: visible;
          border-radius: 16px;
          box-shadow: 0 10px 28px rgba(35, 42, 52, 0.12), 0 2px 8px rgba(35, 42, 52, 0.06);
        }
        @media (prefers-reduced-motion: reduce) {
          .lx-walk-root, .lx-walk-copy, .lx-walk-panel, .lx-walk-pulse, .lx-walk-bar { animation: none; transition: none; }
          .lx-walk-preview { transform: none; }
        }
        @media (max-width: 980px) {
          .lx-walk-grid { grid-template-columns: 1fr !important; overflow: auto !important; }
          .lx-walk-preview-wrap { min-height: 0; padding: 8px 18px 28px !important; }
          .lx-walk-copy { max-width: none !important; padding: 28px 22px 8px !important; }
          .lx-walk-preview { transform: none; max-width: none !important; height: 484px !important; min-height: 484px !important; max-height: 484px !important; }
        }
      `}</style>

      <div className="lx-walk-orb" style={{ width: 520, height: 520, background: "rgba(55,89,113,0.07)", left: -180, top: -160 }} />
      <div className="lx-walk-orb" style={{ width: 380, height: 380, background: "rgba(157,181,201,0.22)", right: -80, bottom: -120 }} />

      <div style={{
        height: 68, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${t.border}`, background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", position: "relative", zIndex: 2, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo h={22} />
          <span style={{ width: 1, height: 16, background: t.border }} />
          <span style={{ fontSize: 13, color: t.textSub }}>A quick look around</span>
        </div>
        <button
          type="button"
          onClick={finish}
          className="lx-walk-skip"
          style={{
            background: "transparent", border: "none", color: t.textSub, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 10px", borderRadius: 8,
          }}
        >
          Skip <X size={15} strokeWidth={2} />
        </button>
      </div>

      <div
        className="lx-walk-grid"
        style={{
          flex: 1, minHeight: 0, width: "100%",
          display: "grid", gridTemplateColumns: "minmax(340px, 0.86fr) minmax(0, 1.14fr)",
          alignItems: "center", position: "relative", zIndex: 1,
        }}
      >
        <div key={`${index}-${dir}`} className="lx-walk-copy" style={{
          ["--lx-dir"]: dir > 0 ? "28px" : "-28px",
          padding: "40px 16px 40px 48px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          maxWidth: 500, width: "100%", justifySelf: "end", overflow: "auto",
          marginRight: 72,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: t.accent, marginBottom: 14 }}>
            {step.eyebrow} · {index + 1} of {steps.length}
          </div>
          <h1 id="lx-walk-title" style={{
            fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 0 14px",
          }}>
            {step.title}
          </h1>
          {step.project ? (
            <div style={{
              display: "inline-flex", alignSelf: "flex-start", margin: "0 0 14px",
              background: "#fff", border: `1px solid ${t.border}`, borderRadius: 99,
              padding: "6px 12px", fontSize: 13, fontWeight: 600, color: t.text, maxWidth: "100%",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.project}</span>
            </div>
          ) : null}
          <p style={{ margin: "0 0 16px", fontSize: 16, lineHeight: 1.65, color: t.textSub }}>
            {step.body}
          </p>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px",
            fontSize: 13.5, color: t.text, lineHeight: 1.5, marginBottom: 22,
            boxShadow: "0 1px 4px rgba(35,42,52,0.05)",
          }}>
            <HelpCircle size={17} color={t.accent} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            {step.hint}
          </div>

          <div style={{ height: 4, background: "#D5E2EC", borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
            <div className="lx-walk-bar" style={{
              height: "100%", width: `${((index + 1) / steps.length) * 100}%`, background: t.accent, borderRadius: 99,
            }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to ${s.eyebrow}`}
                onClick={() => go(i)}
                style={{
                  width: i === index ? 28 : 10, height: 10, borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
                  background: i <= index ? t.accent : "#D5E2EC",
                  transition: "width 0.25s ease, background 0.25s ease",
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: 12, color: t.textMeta || t.textSub, marginBottom: 18 }}>
            Press <strong style={{ color: t.text }}>→</strong> to continue · Esc to skip
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {index > 0 && (
              <button
                type="button"
                className="lx-walk-back"
                onClick={() => go(index - 1)}
                style={{
                  background: "#fff", color: t.text, border: `1px solid ${t.border}`, borderRadius: 12,
                  padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="lx-walk-next"
              onClick={() => last ? finish() : go(index + 1)}
              style={{
                background: t.accent, color: "#fff", border: "none", borderRadius: 12,
                padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 10,
                boxShadow: "0 10px 28px rgba(55,89,113,0.32)",
              }}
            >
              {last ? (replay ? "Close" : "Enter your portal") : "Next"}
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="lx-walk-preview-wrap" style={{
          padding: "32px 40px 32px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: 0,
          alignSelf: "stretch",
        }}>
          <PortalPreview
            step={step}
            t={t}
            onJump={jumpTab}
            actionDone={actionDone}
            onToggleAction={() => setActionDone((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}
