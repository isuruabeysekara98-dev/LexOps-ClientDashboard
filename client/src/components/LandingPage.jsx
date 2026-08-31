import { useState } from "react";
import { ClipboardList, Zap, Radar } from "lucide-react";

const t = {
  bg: "#FAFBFC", surface: "#F4F8FB", surfaceHigh: "#E4F1F8",
  border: "#E8E8E8", text: "#232A34", textSub: "#616568",
  accent: "#375971", accentHover: "#232A34",
  shadow: "0 1px 4px rgba(35,42,52,0.06)",
  shadowMd: "0 8px 32px rgba(35,42,52,0.14)",
};

function Logo() {
  return (
    <svg width={80} height={25} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#232A34"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#375971"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#232A34"/>
    </svg>
  );
}

// The living proposal is now simply *the* proposal, so it takes the name and
// the tile. The older workflow-based builder is archived: its routes still
// resolve and its data is untouched — see ProposalsListPage.jsx's banner — but
// nothing links to it any more, so it can't be reached by accident.
const TILES = [
  {
    key: "proposals",
    Icon: ClipboardList,
    title: "Proposals",
    desc: "Build the interactive map, then send the one link that tracks a client's progress.",
    path: "/admin/living-proposals",
  },
  {
    key: "mission-control",
    Icon: Radar,
    title: "Mission Control",
    desc: "See how work actually flows — workflows, handoffs, and who decides what.",
    path: "/mission-control",
  },
  {
    key: "projects",
    Icon: Zap,
    title: "Active Projects",
    desc: "Manage ongoing client engagements, milestones, and deliverables.",
    path: "/active-projects",
  },
];

export default function LandingPage({ navigate, userProfile, onLogout }) {
  const [hovered, setHovered] = useState(null);
  const raw = (userProfile?.full_name || userProfile?.email || "").split(/[\s@]/)[0];
  const firstName = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Satoshi', sans-serif", color: t.text,
      padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 56 }}>
          <Logo />
          <button
            onClick={onLogout}
            onMouseEnter={e => { e.currentTarget.style.background = "#F0EDE6"; e.currentTarget.style.color = t.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.textSub; }}
            style={{
              background: "transparent", border: "none", color: t.textSub,
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              padding: "6px 10px", borderRadius: 6, transition: "all 0.15s",
            }}
          >
            Sign out
          </button>
        </div>

        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
            color: t.text, marginBottom: 6,
          }}>
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </div>
          <div style={{ color: t.textSub, fontSize: 14 }}>
            What would you like to work on today?
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {TILES.map(tile => {
            const isHov = hovered === tile.key;
            return (
              <button
                key={tile.key}
                onClick={() => navigate(tile.path)}
                onMouseEnter={() => setHovered(tile.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHov ? t.surface : "#FFFFFF",
                  border: `1.5px solid ${isHov ? t.accent : t.border}`,
                  borderRadius: 14,
                  padding: "28px 24px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isHov ? t.shadowMd : t.shadow,
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex" }}><tile.Icon size={28} color={t.accent} strokeWidth={1.75} /></div>
                <div>
                  <div style={{
                    fontSize: 17, fontWeight: 600, color: t.text,
                    letterSpacing: "-0.01em",
                    marginBottom: 5,
                  }}>
                    {tile.title}
                  </div>
                  <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>
                    {tile.desc}
                  </div>
                </div>
                <div style={{
                  fontSize: 18, color: isHov ? t.accent : t.border,
                  transition: "color 0.15s", marginTop: 4,
                }}>
                  →
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 24, color: t.textSub, fontSize: 11 }}>
        © 2026 LexOps · A Teams Squared Company
      </div>
    </div>
  );
}
