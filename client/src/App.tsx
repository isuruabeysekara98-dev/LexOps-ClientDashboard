import { useState, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase.js";
import { useSlowHint } from "@/lib/loadUtils.js";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import ProposalPage from "@/components/ProposalPage";
import SetPasswordPage from "@/components/SetPasswordPage";
import LandingPage from "@/components/LandingPage";
import ProposalsListPage from "@/components/ProposalsListPage";
import ProposalCreatePage from "@/components/ProposalCreatePage";
import ProposalDetailPage from "@/components/ProposalDetailPage";
import ProposalPreviewPage from "@/components/ProposalPreviewPage";
import LivingProposalPage from "@/components/LivingProposalPage";
import LivingProposalsListPage from "@/components/LivingProposalsListPage";
import LivingProposalEditorPage from "@/components/LivingProposalEditorPage";

async function fetchUserProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  console.log('[Auth] profile fetch result:', profile, error);
  console.log('[Auth] user id:', userId);

  if (!profile) {
    await supabase.auth.signOut();
    return { __noProfile: true };
  }

  if (profile.role === "client") {
    const { data: memberships, error: memberErr } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);
    console.log("[Auth] project_members query for user", userId, ":", { memberships, error: memberErr });
    const allowedProjectIds = (memberships || []).map((m: any) => m.project_id);
    console.log("[Auth] allowedProjectIds:", allowedProjectIds);
    return {
      ...profile,
      allowedProjectIds,
    };
  }

  return profile;
}

function App() {
  // ── Public routes: check BEFORE any auth hooks ──
  // These must be completely outside the auth flow.
  const pathname = window.location.pathname;
  const hash = window.location.hash;

  // Invite / recovery token in URL hash — show password setup page
  if (hash && (hash.includes("type=invite") || hash.includes("type=recovery"))) {
    return <SetPasswordPage />;
  }

  // Public route: /proposal/:token
  const proposalMatch = pathname.match(/^\/proposal\/([A-Za-z0-9_-]+)$/);
  if (proposalMatch) {
    return <ProposalPage token={proposalMatch[1]} />;
  }

  // Public route: /p/:token — the living proposal (graph, needs, send-back)
  const livingMatch = pathname.match(/^\/p\/([A-Za-z0-9_-]+)$/);
  if (livingMatch) {
    return <LivingProposalPage token={livingMatch[1]} />;
  }

  // ── Auth flow (only runs for non-public routes) ──
  return <AuthenticatedApp />;
}

const ADMIN_ROLES = ["lexops_admin", "lexops_member"];

function initAdminPage(pathname: string) {
  // Living-proposal admin — a wholly separate path space from /admin/proposals
  // below on purpose. Both operate on the same `proposals` table, but the two
  // products (this graph-based one and the older v2/workflow one) are shaped
  // too differently to share a detail page — see LivingProposalsListPage.jsx's
  // header comment for why the v2 list can't just grow a few columns instead.
  if (pathname.startsWith("/admin/living-proposals/new")) return { name: "living-proposal-new", id: null as string | null };
  const lpEditMatch = pathname.match(/^\/admin\/living-proposals\/([^/]+)(?:\/edit)?$/);
  if (lpEditMatch) return { name: "living-proposal-edit", id: lpEditMatch[1] };
  if (pathname.startsWith("/admin/living-proposals")) return { name: "living-proposals", id: null as string | null };

  if (pathname.startsWith("/admin/proposals/new")) return { name: "proposal-new", id: null as string | null };
  const editMatch = pathname.match(/^\/admin\/proposals\/([^/]+)\/edit$/);
  if (editMatch) return { name: "proposal-edit", id: editMatch[1] };
  const previewMatch = pathname.match(/^\/admin\/proposals\/([^/]+)\/preview$/);
  if (previewMatch) return { name: "proposal-preview", id: previewMatch[1] };
  const detailMatch = pathname.match(/^\/admin\/proposals\/([^/]+)$/);
  if (detailMatch) return { name: "proposal-detail", id: detailMatch[1] };
  if (pathname.startsWith("/admin/proposals")) return { name: "proposals", id: null as string | null };
  if (pathname === "/active-projects") return { name: "dashboard", id: null as string | null };
  return { name: "landing", id: null as string | null };
}

function AdminRouter({ userProfile, onLogout }: { userProfile: any; onLogout: () => void }) {
  const [page, setPage] = useState(() => initAdminPage(window.location.pathname));

  useEffect(() => {
    function onPop() { setPage(initAdminPage(window.location.pathname)); }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setPage(initAdminPage(path));
  }

  const isDashboard = page.name === "dashboard";
  const isLanding = page.name === "landing";
  const isProposals = page.name === "proposals";
  const isLivingProposals = page.name === "living-proposals";
  const isDynamic = !isDashboard && !isLanding && !isProposals && !isLivingProposals;

  return (
    <>
      {/* These pages stay mounted so navigating between them never triggers a reload */}
      <div style={{ display: isDashboard ? "contents" : "none" }}>
        <Dashboard onLogout={onLogout} userProfile={userProfile} navigate={navigate} />
      </div>
      <div style={{ display: isLanding ? "contents" : "none" }}>
        <LandingPage navigate={navigate} userProfile={userProfile} onLogout={onLogout} />
      </div>
      <div style={{ display: isProposals ? "contents" : "none" }}>
        <ProposalsListPage navigate={navigate} onLogout={onLogout} />
      </div>
      <div style={{ display: isLivingProposals ? "contents" : "none" }}>
        <LivingProposalsListPage navigate={navigate} onLogout={onLogout} />
      </div>

      {isDynamic && (() => {
        if (page.name === "proposal-new") return <ProposalCreatePage navigate={navigate} onLogout={onLogout} />;
        if (page.name === "proposal-edit") return <ProposalCreatePage navigate={navigate} editId={page.id} onLogout={onLogout} />;
        if (page.name === "proposal-detail") return <ProposalDetailPage id={page.id} navigate={navigate} onLogout={onLogout} />;
        if (page.name === "proposal-preview") return <ProposalPreviewPage id={page.id} navigate={navigate} />;
        if (page.name === "living-proposal-new") return <LivingProposalEditorPage navigate={navigate} onLogout={onLogout} />;
        if (page.name === "living-proposal-edit") return <LivingProposalEditorPage navigate={navigate} editId={page.id} onLogout={onLogout} />;
        return null;
      })()}
    </>
  );
}

const PROFILE_CACHE_KEY = 'lx_profile_v1';

function readCachedProfile() {
  try { const s = sessionStorage.getItem(PROFILE_CACHE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
function writeCachedProfile(p: any) {
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); } catch {}
}
function clearCachedProfile() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
}

function AuthenticatedApp() {
  // If a cached profile exists the app renders immediately — no spinner on page reloads.
  const cached = readCachedProfile();

  const [userProfile, setUserProfile] = useState<any>(cached);
  // Only show the full-screen spinner on a genuine first-ever load (no cache).
  const [authLoading, setAuthLoading] = useState(!cached);
  const [authError, setAuthError] = useState("");
  const authSlow = useSlowHint(authLoading, 4000);

  const initialLoadDone = useRef(false);

  // The auth effect below runs once ([] deps), so anything it closes over is
  // frozen at first render. `userProfile` read directly in that callback is
  // therefore always the initial value — which made its "are we already signed
  // in?" check permanently false, and flashed "Signing you in…" over the whole
  // app every time the tab regained focus. A ref is read live, so the callback
  // sees the profile that actually exists now.
  const userProfileRef = useRef(userProfile);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  function doLogout() {
    clearCachedProfile();
    supabase.auth.signOut();
  }

  useEffect(() => {
    let mounted = true;

    // Safety net: never spin forever
    const timeout = setTimeout(() => {
      if (mounted && !initialLoadDone.current) {
        initialLoadDone.current = true;
        setAuthLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession() as any;
        if (!mounted) return;

        if (!session?.user) {
          // No valid session — clear any stale cache and show login
          clearCachedProfile();
          setUserProfile(null);
          return;
        }

        let profile = await fetchUserProfile(session.user.id);

        if (profile?.__noProfile) {
          if (mounted) {
            clearCachedProfile();
            setUserProfile(null);
            setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          }
          return;
        }

        // If profile is null, the session token may be stale — try refreshing
        if (!profile && mounted) {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user && !refreshErr) {
            profile = await fetchUserProfile(refreshData.session.user.id);
            if (profile?.__noProfile) {
              if (mounted) {
                clearCachedProfile();
                setUserProfile(null);
                setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
              }
              return;
            }
          }
        }

        if (mounted && profile) {
          writeCachedProfile(profile);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error("[Auth] getSession error:", err);
      } finally {
        if (mounted) {
          initialLoadDone.current = true;
          setAuthLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      if (!initialLoadDone.current) return;

      // TOKEN_REFRESHED and INITIAL_SESSION fire on every tab-return — already authenticated,
      // ignore silently so we never flash a spinner for a token renewal.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;

      // SIGNED_IN is re-emitted when a tab regains focus, not only on a real
      // sign-in. With a profile already in hand there is nothing to fetch and
      // nothing to show a spinner for.
      if (event === 'SIGNED_IN' && userProfileRef.current) return;

      if (session?.user) {
        // Genuine re-auth (e.g. sign in from another tab) — update silently if we already
        // have a profile, otherwise show spinner for the fresh fetch.
        const alreadyAuthed = !!userProfileRef.current;
        if (!alreadyAuthed) setAuthLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        if (!mounted) return;
        if (profile?.__noProfile) {
          clearCachedProfile();
          setUserProfile(null);
          setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          setAuthLoading(false);
          return;
        }
        writeCachedProfile(profile);
        setUserProfile(profile);
        if (!alreadyAuthed) setAuthLoading(false);
      } else {
        // SIGNED_OUT
        clearCachedProfile();
        setUserProfile(null);
      }
    });

    return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",gap:14,alignItems:"center",justifyContent:"center",background:"#FFFFFF",padding:24,textAlign:"center"}}>
      <div style={{width:32,height:32,border:"2px solid #C5D4D4",borderTop:"2px solid #375971",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{color:"#616568",fontSize:13}}>Signing you in…</span>
      {authSlow && <span style={{color:"#9DB5C9",fontSize:12,maxWidth:300,lineHeight:1.5}}>Still getting things ready — this is taking longer than usual.</span>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {userProfile
          ? ADMIN_ROLES.includes(userProfile.role)
            ? <AdminRouter userProfile={userProfile} onLogout={doLogout} />
            : <Dashboard onLogout={doLogout} userProfile={userProfile} />
          : <LoginPage authError={authError} />
        }
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
