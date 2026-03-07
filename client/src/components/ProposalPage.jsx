import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";

const t = {
  bg: "#0f1318", surface: "#161c24", surfaceHigh: "#1c2330",
  border: "rgba(255,255,255,0.07)", text: "#edf0f5", textSub: "#8b96a4",
  accent: "#4a7fa5", accentLight: "#6a9fc0", green: "#4ade80",
  red: "#f87171", redSoft: "rgba(248,113,113,0.08)",
  shadow: "0 1px 3px rgba(0,0,0,0.4)",
};

function Logo() {
  return (
    <svg width={63} height={20} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="white"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#9DB5C9"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="white"/>
    </svg>
  );
}

export default function ProposalPage({ token }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [acctConfirm, setAcctConfirm] = useState("");
  const [acctLoading, setAcctLoading] = useState(false);
  const [acctError, setAcctError] = useState("");
  const [acctDone, setAcctDone] = useState(false);

  useEffect(() => { document.title = "LexOps | Review Your Proposal"; }, []);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from("proposals")
        .select("*")
        .eq("token", token)
        .single();

      if (err || !data) {
        setError("Proposal not found or link has expired.");
        setLoading(false);
        return;
      }

      setProposal(data);

      if (data.status === "accepted") {
        setAccepted(true);
      } else if (data.status === "sent") {
        await supabase
          .from("proposals")
          .update({ status: "viewed" })
          .eq("id", data.id);
        data.status = "viewed";
      }

      if (data.project_id) {
        const { data: proj } = await supabase
          .from("projects")
          .select("name, client_name")
          .eq("id", data.project_id)
          .single();
        if (proj) setProjectName(proj.name || proj.client_name || "");
      }

      setLoading(false);
    }
    load();
  }, [token]);

  async function handleAccept(e) {
    e.preventDefault();
    if (!signerName.trim() || !agreed) return;
    setSubmitting(true);

    await supabase.from("proposal_signatures").insert({
      proposal_id: proposal.id,
      signer_name: signerName.trim(),
      signer_email: proposal.client_email,
    });

    await supabase
      .from("proposals")
      .update({ status: "accepted" })
      .eq("id", proposal.id);

    // Trigger the invite email via the server endpoint (no auth needed for this call — server uses service role)
    try {
      await fetch("/api/proposal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          signer_name: signerName.trim(),
        }),
      });
    } catch (_) {
      // Non-critical — invite can be sent manually
    }

    setAccepted(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'DM Sans','Helvetica Neue',sans-serif", padding: 24 }}>
        <Logo />
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: t.shadow, maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.redSoft, border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: t.red }}>!</div>
          <h2 style={{ color: t.text, fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>Link Invalid or Expired</h2>
          <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            This proposal link is no longer valid. Please contact your LexOps representative for a new link.
          </p>
        </div>
        <div style={{ color: t.textSub, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</div>
      </div>
    );
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setAcctError("");
    if (acctPassword.length < 8) { setAcctError("Password must be at least 8 characters."); return; }
    if (acctPassword !== acctConfirm) { setAcctError("Passwords do not match."); return; }
    setAcctLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email: proposal.client_email,
      password: acctPassword,
      options: { data: { full_name: proposal.client_name, role: "client" } },
    });
    if (signUpErr) {
      // If user already exists (invited), try sign in instead
      if (signUpErr.message?.includes("already been registered") || signUpErr.message?.includes("already registered")) {
        setAcctError("An account already exists for this email. Please check your email for the invite link, or sign in directly.");
      } else {
        setAcctError(signUpErr.message);
      }
      setAcctLoading(false);
      return;
    }
    setAcctDone(true);
    setAcctLoading(false);
  }

  if (accepted) {
    const inputStyle = {
      width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`,
      borderRadius: 7, padding: "10px 14px", fontSize: 14, color: t.text,
      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
    };
    const labelStyle = {
      color: t.textSub, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6,
    };

    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", padding: 24 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "44px 36px", maxWidth: 480, width: "100%", boxShadow: t.shadow, overflowY: "auto", maxHeight: "90vh" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>✓</div>
            <h2 style={{ color: t.text, fontSize: 20, fontWeight: 500, margin: "0 0 8px" }}>Proposal Accepted</h2>
            <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Create your account to access your client portal.
            </p>
          </div>

          {acctDone ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ color: t.green, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Account created!</div>
              <p style={{ color: t.textSub, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Check your email to verify your account, then sign in to access your portal.
              </p>
              <button
                onClick={() => window.location.replace("/")}
                style={{ marginTop: 20, background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={proposal.client_email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" autoComplete="new-password" required value={acctPassword} onChange={e => setAcctPassword(e.target.value)} placeholder="At least 8 characters" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" autoComplete="new-password" required value={acctConfirm} onChange={e => setAcctConfirm(e.target.value)} placeholder="Re-enter your password" style={inputStyle} />
              </div>
              {acctError && (
                <div style={{ background: t.redSoft, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", color: t.red, fontSize: 12 }}>
                  {acctError}
                </div>
              )}
              <button type="submit" disabled={acctLoading} style={{
                marginTop: 4, background: acctLoading ? t.surfaceHigh : t.accent,
                color: acctLoading ? t.textSub : "#fff", border: "none", borderRadius: 8,
                padding: "11px 0", fontSize: 13, fontWeight: 600,
                cursor: acctLoading ? "not-allowed" : "pointer",
                transition: "background 0.15s", fontFamily: "inherit",
              }}>
                {acctLoading ? "Creating account…" : "Create Account"}
              </button>
              <div style={{ textAlign: "center", color: t.textSub, fontSize: 12 }}>
                Already have an account?{" "}
                <a href="/" style={{ color: t.accent, textDecoration: "none" }}>Sign in</a>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: t.text }}>
      {/* Header */}
      <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: t.shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo />
          <div style={{ width: 1, height: 16, background: t.border }} />
          <span style={{ color: t.textSub, fontSize: 12, letterSpacing: "0.02em" }}>Proposal</span>
        </div>
        <span style={{ color: t.textSub, fontSize: 12 }}>For {proposal.client_name}</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", paddingBottom: 80 }}>
        {/* Info */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: t.textSub, fontSize: 12, marginBottom: 6 }}>Proposal for</div>
          <h1 style={{ color: t.text, fontSize: 22, fontWeight: 400, margin: "0 0 6px", letterSpacing: "-0.03em" }}>
            {proposal.client_name}
          </h1>
          {projectName && <div style={{ color: t.accentLight, fontSize: 14 }}>{projectName}</div>}
        </div>

        {/* PDF Viewer */}
        {proposal.pdf_url && (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 32, boxShadow: t.shadow }}>
            <iframe
              src={proposal.pdf_url}
              width="100%"
              style={{ display: "block", border: "none", height: "min(700px, 70vh)" }}
              title="Proposal PDF"
            />
          </div>
        )}

        {/* Acceptance form */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "32px 28px", boxShadow: t.shadow, paddingBottom: 40 }}>
          <h3 style={{ color: t.text, fontSize: 16, fontWeight: 500, margin: "0 0 20px" }}>Accept this Proposal</h3>
          <form onSubmit={handleAccept} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Full Name</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Your full name"
                required
                style={{ width: "100%", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 7, padding: "10px 14px", fontSize: 14, color: t.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", color: t.textSub, fontSize: 13, lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ accentColor: t.accent, width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: "pointer" }}
              />
              I have read and agree to the terms and conditions outlined in this proposal.
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
              <button
                type="submit"
                disabled={submitting || !signerName.trim() || !agreed}
                style={{
                  background: t.accent, color: "#fff", border: "none", borderRadius: 8,
                  padding: "10px 28px", fontSize: 14, fontWeight: 600, cursor: submitting || !signerName.trim() || !agreed ? "not-allowed" : "pointer",
                  opacity: submitting || !signerName.trim() || !agreed ? 0.5 : 1,
                  fontFamily: "inherit", transition: "opacity 0.15s",
                }}
              >
                {submitting ? "Submitting…" : "Accept Proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, padding: "16px 28px", textAlign: "center" }}>
        <span style={{ color: t.textSub, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</span>
      </div>
    </div>
  );
}
