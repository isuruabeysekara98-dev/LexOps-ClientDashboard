const t = {
  bg: "#FAFBFC",
  card: "#FFFFFF",
  surface: "#F4F8FB",
  surfaceHigh: "#E4F1F8",
  border: "#E8E8E8",
  borderLight: "rgba(0,0,0,0.08)",
  text: "#232A34",
  textSub: "#616568",
  textMeta: "#9DB5C9",
  accent: "#375971",
  accentHover: "#232A34",
  accentLight: "rgba(55,89,113,0.07)",
  accentBorder: "rgba(55,89,113,0.18)",
  green: "#3C7A52",
  greenSoft: "#E7F3EC",
  greenBorder: "rgba(60,122,82,0.22)",
  shadow: "0 1px 4px rgba(35,42,52,0.06)",
  shadowMd: "0 8px 32px rgba(35,42,52,0.14)",
};

function Eyebrow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#9DB5C9", display: "inline-block" }} />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#616568" }}>{label}</span>
    </div>
  );
}

export function Logo() {
  return (
    <svg width={63} height={20} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#082B2B"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#1A6666"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#082B2B"/>
    </svg>
  );
}

function StatChip({ value, label }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: t.accentLight, border: `1px solid ${t.accentBorder}`,
      borderRadius: 8, padding: "10px 18px", minWidth: 80, gap: 3,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: t.accent, letterSpacing: "-0.02em", fontFamily: "'Satoshi', sans-serif" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: t.textSub, fontWeight: 500, textAlign: "center", letterSpacing: "0.01em" }}>
        {label}
      </span>
    </div>
  );
}

function InputItem({ emoji, label, detail }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${t.borderLight}` }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{emoji || "📄"}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>{detail}</div>}
      </div>
    </div>
  );
}

function OutputItem({ label, detail }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${t.borderLight}` }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        background: t.greenSoft, border: `1px solid rgba(5,150,105,0.25)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5.5L4 7.5L8 3" stroke={t.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>{detail}</div>}
      </div>
    </div>
  );
}

function StageCard({ stage, index, globalIndex }) {
  const hasStats = stage.stats?.length > 0;
  const hasInputs = stage.inputs?.length > 0;
  const hasOutputs = stage.outputs?.length > 0;
  const hasSections = hasInputs || hasOutputs;

  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: t.shadow,
    }}>
      {/* Stage header */}
      <div style={{ padding: "22px 28px 18px", borderBottom: hasSections || hasStats ? `1px solid ${t.borderLight}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: stage.description ? 12 : 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0, letterSpacing: "-0.01em",
          }}>
            {String(globalIndex + 1).padStart(2, "0")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {stage.emoji && <span style={{ fontSize: 20 }}>{stage.emoji}</span>}
            <h3 style={{
              margin: 0, fontSize: 17, fontWeight: 600, color: t.text,
              letterSpacing: "-0.02em", fontFamily: "'Satoshi', sans-serif",
            }}>
              {stage.title || "Stage"}
            </h3>
          </div>
        </div>
        {stage.description && (
          <p style={{ margin: 0, color: t.textSub, fontSize: 13, lineHeight: 1.65, paddingLeft: 50 }}>
            {stage.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      {hasStats && (
        <div style={{
          padding: "16px 28px",
          borderBottom: hasSections ? `1px solid ${t.borderLight}` : "none",
          display: "flex", flexWrap: "wrap", gap: 10,
        }}>
          {stage.stats.map((s, i) => (
            <StatChip key={i} value={s.value} label={s.label} />
          ))}
        </div>
      )}

      {/* Inputs / Outputs */}
      {hasSections && (
        <div style={{
          display: "grid",
          gridTemplateColumns: hasInputs && hasOutputs ? "1fr 1fr" : "1fr",
          gap: 0,
        }}>
          {hasInputs && (
            <div style={{
              padding: "18px 28px",
              borderRight: hasOutputs ? `1px solid ${t.borderLight}` : "none",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: t.textMeta, marginBottom: 4,
              }}>
                What you provide
              </div>
              {stage.inputs.map((inp, i) => (
                <InputItem key={i} emoji={inp.emoji} label={inp.label} detail={inp.detail} />
              ))}
            </div>
          )}
          {hasOutputs && (
            <div style={{ padding: "18px 28px" }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: t.textMeta, marginBottom: 4,
              }}>
                What we deliver
              </div>
              {stage.outputs.map((out, i) => (
                <OutputItem key={i} label={out.label} detail={out.detail} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkflowSection({ workflow, stageOffset }) {
  if (!workflow.stages?.length) return null;
  return (
    <div style={{ marginBottom: 40 }}>
      {workflow.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>{workflow.emoji || "⚙️"}</span>
          <h2 style={{
            margin: 0, fontSize: 20, fontWeight: 600, color: t.text,
            letterSpacing: "-0.02em", fontFamily: "'Satoshi', sans-serif",
          }}>
            {workflow.name}
          </h2>
          <div style={{ flex: 1, height: 1, background: t.border, marginLeft: 8 }} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {workflow.stages.map((stage, si) => (
          <StageCard key={si} stage={stage} index={si} globalIndex={stageOffset + si} />
        ))}
      </div>
    </div>
  );
}

export default function ProposalViewer({ proposal, footer }) {
  const allStages = (proposal.workflows || []).flatMap(wf => wf.stages || []);
  const multiWorkflow = (proposal.workflows || []).length > 1;

  let stageOffset = 0;
  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'Inter', sans-serif", color: t.text }}>

      {/* Nav header */}
      <div style={{
        background: t.card, borderBottom: `1px solid ${t.border}`,
        padding: "0 32px", height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <Logo />
        <span style={{ fontSize: 12, color: t.textMeta, fontWeight: 500 }}>
          Prepared for {proposal.client_contact_name || proposal.client_name || "Client"}
        </span>
      </div>

      {/* Hero */}
      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "56px 32px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", background: t.accentLight, border: `1px solid ${t.accentBorder}`,
            borderRadius: 99, padding: "4px 14px", fontSize: 11, fontWeight: 600,
            color: t.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 18,
          }}>
            {proposal.client_name}
          </div>
          <h1 style={{
            margin: "0 0 16px", fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em",
            fontFamily: "'Satoshi', sans-serif", lineHeight: 1.15, color: t.text,
          }}>
            {proposal.name || "Proposal"}
          </h1>
          {proposal.description && (
            <p style={{ margin: "0 auto", color: t.textSub, fontSize: 15, lineHeight: 1.75, maxWidth: 520 }}>
              {proposal.description}
            </p>
          )}

          {/* Stage count summary strip */}
          {allStages.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 32, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: t.accent, fontFamily: "'Satoshi', sans-serif", letterSpacing: "-0.02em" }}>
                  {allStages.length}
                </div>
                <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {allStages.length === 1 ? "Stage" : "Stages"}
                </div>
              </div>
              {allStages.some(s => s.outputs?.length > 0) && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: t.accent, fontFamily: "'Satoshi', sans-serif", letterSpacing: "-0.02em" }}>
                    {allStages.reduce((sum, s) => sum + (s.outputs?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Deliverables
                  </div>
                </div>
              )}
              {(proposal.workflows || []).length > 1 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: t.accent, fontFamily: "'Satoshi', sans-serif", letterSpacing: "-0.02em" }}>
                    {(proposal.workflows || []).length}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMeta, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Workflows
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stages */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", paddingBottom: footer ? 0 : 80 }}>
        {allStages.length === 0 ? (
          <div style={{
            background: t.card, border: `1.5px dashed ${t.border}`, borderRadius: 14,
            padding: "60px 40px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>No stages yet</div>
            <div style={{ color: t.textMeta, fontSize: 13 }}>Add stages in the proposal editor to populate this view.</div>
          </div>
        ) : multiWorkflow ? (
          (proposal.workflows || []).map((wf, wi) => {
            const section = <WorkflowSection key={wi} workflow={wf} stageOffset={stageOffset} />;
            stageOffset += wf.stages?.length || 0;
            return section;
          })
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(proposal.workflows?.[0]?.stages || []).map((stage, si) => (
              <StageCard key={si} stage={stage} index={si} globalIndex={si} />
            ))}
          </div>
        )}

        {footer && (
          <div style={{ marginTop: 40, paddingBottom: 80 }}>
            {footer}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${t.border}`, padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: t.card,
      }}>
        <Logo />
        <span style={{ color: t.textMeta, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</span>
      </div>

    </div>
  );
}
