import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase.js";
import { Check } from "lucide-react";

const t = {
  bg: "#FFFFFF",
  surface: "#F4F8FB",
  surfaceHigh: "#E4F1F8",
  border: "#E8E8E8",
  text: "#232A34",
  textSub: "#616568",
  accent: "#375971",
  accentLight: "#232A34",
  red: "#C9542E",
  green: "#3C7A52",
  shadow: "0 1px 4px rgba(35,42,52,0.08)",
};

function LogoLight({ h = 24 }) {
  return (
    <svg width={h * (307 / 97)} height={h} viewBox="0 0 307 97" fill="none">
      <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#232A34"/>
      <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#375971"/>
      <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#232A34"/>
    </svg>
  );
}

export default function LoginPage({ authError: externalError } = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => { document.title = "LexOps | Sign In"; }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // After successful login, honour ?next= redirect (proposal links land here)
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) {
      try {
        const url = new URL(next, window.location.origin);
        if (url.origin === window.location.origin) {
          window.location.href = url.pathname + url.search + url.hash;
          return;
        }
      } catch {}
    }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    try {
      const resp = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setResetError(data.message || "Something went wrong");
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError("Network error. Please try again.");
    }
    setResetLoading(false);
  }

  const inputStyle = {
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    color: t.text,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      background: t.bg,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Satoshi', sans-serif",
      color: t.text,
      padding: 24,
    }}>
      <style>{`
        .lx-login input:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px rgba(55,89,113,0.10); }
      `}</style>
      <div className="lx-login" style={{
        width: "100%",
        maxWidth: 380,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <LogoLight h={24} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>
              {forgotMode ? "Reset your password" : "Sign in to Client Portal"}
            </div>
            <div style={{ color: t.textSub, fontSize: 13 }}>
              {forgotMode ? "Enter your email and we'll send you a reset link" : "Enter your credentials to continue"}
            </div>
          </div>
        </div>

        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: "28px 28px",
          boxShadow: t.shadow,
        }}>
          {forgotMode ? (
            resetSent ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: t.green }}>
                  <Check size={22} strokeWidth={2.5} />
                </div>
                <div style={{ color: t.text, fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Check your email</div>
                <div style={{ color: t.textSub, fontSize: 13, marginBottom: 20 }}>We've sent a password reset link to <strong style={{ color: t.text }}>{resetEmail}</strong></div>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); setResetError(""); }}
                  style={{
                    background: "transparent", color: t.accentLight, border: "none",
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={inputStyle}
                  />
                </div>

                {resetError && (
                  <div style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: t.red,
                    fontSize: 12,
                  }}>
                    {resetError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  onMouseEnter={e => { if (!resetLoading) e.currentTarget.style.background = "#232A34"; }}
                  onMouseLeave={e => { if (!resetLoading) e.currentTarget.style.background = t.accent; }}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    background: resetLoading ? t.surfaceHigh : t.accent,
                    color: resetLoading ? t.textSub : "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: resetLoading ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  {resetLoading ? "Sending…" : "Send reset link"}
                </button>

                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setResetError(""); }}
                  style={{
                    background: "transparent", color: t.accentLight, border: "none",
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                    padding: 0, textAlign: "center",
                  }}
                >
                  ← Back to sign in
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ color: t.textSub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setResetEmail(email); }}
                    style={{
                      background: "transparent", border: "none", color: t.accentLight,
                      fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {(error || externalError) && (
                <div style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: t.red,
                  fontSize: 12,
                }}>
                  {error || externalError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#232A34"; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = t.accent; }}
                style={{
                  marginTop: 4,
                  width: "100%",
                  background: loading ? t.surfaceHigh : t.accent,
                  color: loading ? t.textSub : "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: "center", color: t.textSub, fontSize: 11 }}>
          © 2026 LexOps · A Teams Squared Company
        </div>
      </div>
    </div>
  );
}
