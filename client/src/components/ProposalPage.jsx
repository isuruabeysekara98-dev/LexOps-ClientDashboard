import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ProposalViewer, { Logo } from "./ProposalViewer.jsx";

const t = {
  bg: "#F9F8F5", card: "#FFFFFF",
  border: "#E5E3DC", surface: "#F0F4F4", surfaceHigh: "#E5EDED",
  text: "#1A1A18", textSub: "#6B6B5F", textMeta: "#9B9B8F",
  accent: "#0B4F4F", accentLight: "rgba(11,79,79,0.07)", accentBorder: "rgba(11,79,79,0.18)",
  green: "#059669", greenSoft: "rgba(5,150,105,0.08)",
  red: "#DC2626", redSoft: "rgba(220,38,38,0.08)",
  shadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const inp = {
  width: "100%", background: t.card, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: "11px 14px", fontSize: 14, color: t.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

function AcceptanceForm({ proposal, token }) {
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acctPassword, setAcctPassword] = useState("");
  const [acctConfirm, setAcctConfirm] = useState("");
  const [acctLoading, setAcctLoading] = useState(false);
  const [acctError, setAcctError] = useState("");
  const [acctDone, setAcctDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const labelStyle = {
    color: t.textSub, fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    display: "block", marginBottom: 6,
  };

  async function handleAccept(e) {
    e.preventDefault();
    if (!signerName.trim() || !agreed) return;
    setSubmitting(true);
    try {
      await fetch("/api/proposal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signer_name: signerName.trim() }),
      });
    } catch {}
    setAccepted(true);
    setSubmitting(false);
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
      options: { data: { full_name: proposal.client_contact_name ?? proposal.client_name, role: "client" } },
    });
    if (signUpErr) {
      setAcctError(
        signUpErr.message?.includes("already") 
          ? "An account already exists for this email. Please check your inbox for the invite, or sign in directly."
          : signUpErr.message
      );
      setAcctLoading(false);
      return;
    }
    setAcctDone(true);
    setAcctLoading(false);
  }

  async function handleResend() {
    setResending(true);
    await supabase.auth.resend({ type: "signup", email: proposal.client_email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  if (accepted) {
    return (
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 36px", boxShadow: t.shadow }}>
        {!acctDone ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: t.greenSoft, border: "1px solid rgba(5,150,105,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 22,
              }}>✓</div>
              <h2 style={{ color: t.text, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>
                Proposal Accepted
              </h2>
              <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Create your account below to access your project dashboard and track progress.
              </p>
            </div>
            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={proposal.client_email} disabled style={{ ...inp, opacity: 0.55, cursor: "not-allowed" }} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" autoComplete="new-password" required value={acctPassword} onChange={e => setAcctPassword(e.target.value)} placeholder="At least 8 characters" style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" autoComplete="new-password" required value={acctConfirm} onChange={e => setAcctConfirm(e.target.value)} placeholder="Re-enter your password" style={inp} />
              </div>
              {acctError && (
                <div style={{ background: t.redSoft, border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "10px 14px", color: t.red, fontSize: 12 }}>
                  {acctError}
                </div>
              )}
              <button type="submit" disabled={acctLoading} style={{
                background: acctLoading ? "#E5E3DC" : t.accent, color: acctLoading ? t.textSub : "#fff",
                border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600,
                cursor: acctLoading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s",
              }}>
                {acctLoading ? "Creating account…" : "Create Account & Get Started"}
              </button>
              <div style={{ textAlign: "center", color: t.textSub, fontSize: 12 }}>
                Already have an account?{" "}
                <a href="/" style={{ color: t.accent, textDecoration: "none", fontWeight: 600 }}>Sign in</a>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: t.greenSoft, border: "1px solid rgba(5,150,105,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ color: t.text, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px", fontFamily: "'Playfair Display', Georgia, serif" }}>
              You're almost in.
            </h2>
            <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: "0 0 24px" }}>
              We've sent a confirmation link to{" "}
              <strong style={{ color: t.text }}>{proposal.client_email}</strong>.{" "}
              Click the link to activate your account.
            </p>
            <button onClick={handleResend} disabled={resending} style={{
              background: "transparent", color: t.accent, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600,
              cursor: resending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: resending ? 0.6 : 1,
            }}>
              {resent ? "Confirmation email resent ✓" : resending ? "Resending…" : "Resend confirmation email"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "36px 32px", boxShadow: t.shadow }}>
      <h3 style={{
        margin: "0 0 6px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
        fontFamily: "'Playfair Display', Georgia, serif", color: t.text,
      }}>
        Accept this Proposal
      </h3>
      <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>
        By accepting you agree to move forward with the proposed scope. We'll set up your project dashboard right away.
      </p>
      <form onSubmit={handleAccept} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Your full name</label>
          <input
            type="text" required
            value={signerName} onChange={e => setSignerName(e.target.value)}
            placeholder="e.g. Jane Smith"
            style={inp}
          />
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", color: t.textSub, fontSize: 13, lineHeight: 1.5 }}>
          <input
            type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ accentColor: t.accent, width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: "pointer" }}
          />
          I have read and agree to the terms and conditions outlined in this proposal.
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
          <button
            type="submit"
            disabled={submitting || !signerName.trim() || !agreed}
            style={{
              background: t.accent, color: "#fff", border: "none", borderRadius: 8,
              padding: "11px 32px", fontSize: 14, fontWeight: 600,
              cursor: submitting || !signerName.trim() || !agreed ? "not-allowed" : "pointer",
              opacity: submitting || !signerName.trim() || !agreed ? 0.45 : 1,
              fontFamily: "inherit", transition: "opacity 0.15s",
            }}
          >
            {submitting ? "Submitting…" : "Accept Proposal →"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProposalPage({ token }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "LexOps | Review Your Proposal";
    load();
  }, [token]);

  async function load() {
    try {
      const res = await fetch(`/api/proposals/v2/by-token/${encodeURIComponent(token)}`);
      if (!res.ok) {
        // Fall back to legacy Supabase direct fetch for old-format tokens
        const { data, error: err } = await supabase
          .from("proposals").select("*").eq("token", token).single();
        if (err || !data) { setError("Proposal not found or link has expired."); return; }
        setProposal({ ...data, workflows: [] });
        return;
      }
      const data = await res.json();
      setProposal(data);
    } catch {
      setError("Unable to load this proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: "'Inter', sans-serif", padding: 24 }}>
        <Logo />
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: t.shadow }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: t.redSoft,
            border: "1px solid rgba(220,38,38,0.2)", display: "flex",
            alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            fontSize: 20, color: t.red,
          }}>!</div>
          <h2 style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>
            Link Invalid or Expired
          </h2>
          <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            This proposal link is no longer valid. Please contact your LexOps representative for a new link.
          </p>
        </div>
        <div style={{ color: t.textMeta, fontSize: 11 }}>© 2026 LexOps · A Teams Squared Company</div>
      </div>
    );
  }

  return (
    <ProposalViewer
      proposal={proposal}
      footer={
        proposal.status !== "accepted"
          ? <AcceptanceForm proposal={proposal} token={token} />
          : (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "36px 32px", textAlign: "center", boxShadow: t.shadow }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: t.greenSoft,
                border: "1px solid rgba(5,150,105,0.25)", display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22,
              }}>✓</div>
              <h3 style={{ color: t.text, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: "'Playfair Display', Georgia, serif" }}>
                Proposal already accepted
              </h3>
              <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                You've already accepted this proposal. Please{" "}
                <a href="/" style={{ color: t.accent, textDecoration: "none", fontWeight: 600 }}>sign in to your dashboard</a>{" "}
                to track your project progress.
              </p>
            </div>
          )
      }
    />
  );
}
