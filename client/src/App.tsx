import { useState, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase.js";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import ProposalPage from "@/components/ProposalPage";
import SetPasswordPage from "@/components/SetPasswordPage";
import LandingPage from "@/components/LandingPage";
import ProposalsListPage from "@/components/ProposalsListPage";
import ProposalCreatePage from "@/components/ProposalCreatePage";
import ProposalDetailPage from "@/components/ProposalDetailPage";
import ProposalPreviewPage from "@/components/ProposalPreviewPage";

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
  const proposalMatch = pathname.match(/^\/proposal\/([a-f0-9-]+)$/i);
  if (proposalMatch) {
    return <ProposalPage token={proposalMatch[1]} />;
  }

  // ── Auth flow (only runs for non-public routes) ──
  return <AuthenticatedApp />;
}

const ADMIN_ROLES = ["lexops_admin", "lexops_member"];

function initAdminPage(pathname: string) {
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

  if (page.name === "proposals") return <ProposalsListPage navigate={navigate} onLogout={onLogout} />;
  if (page.name === "proposal-new") return <ProposalCreatePage navigate={navigate} onLogout={onLogout} />;
  if (page.name === "proposal-edit") return <ProposalCreatePage navigate={navigate} editId={page.id} onLogout={onLogout} />;
  if (page.name === "proposal-detail") return <ProposalDetailPage id={page.id} navigate={navigate} onLogout={onLogout} />;
  if (page.name === "proposal-preview") return <ProposalPreviewPage id={page.id} navigate={navigate} />;
  if (page.name === "dashboard") return <Dashboard onLogout={onLogout} userProfile={userProfile} navigate={navigate} />;
  return <LandingPage navigate={navigate} userProfile={userProfile} onLogout={onLogout} />;
}

function AuthenticatedApp() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const initialLoadDone = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Safety net: force authLoading to false after 5 seconds
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
          setSession(null);
          return;
        }

        setSession(session);

        let profile = await fetchUserProfile(session.user.id);

        if (profile?.__noProfile) {
          if (mounted) {
            setSession(null);
            setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          }
          return;
        }

        // If profile is null, the session token may be stale — try refreshing
        if (!profile && mounted) {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user && !refreshErr) {
            setSession(refreshData.session);
            profile = await fetchUserProfile(refreshData.session.user.id);
            if (profile?.__noProfile) {
              if (mounted) {
                setSession(null);
                setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
              }
              return;
            }
          }
        }

        if (mounted) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (!mounted) return;
      if (!initialLoadDone.current) return;

      if (session?.user) {
        setAuthLoading(true);
        const profile = await fetchUserProfile(session.user.id);
        if (!mounted) return;
        if (profile?.__noProfile) {
          setSession(null);
          setUserProfile(null);
          setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          setAuthLoading(false);
          return;
        }
        setSession(session);
        setUserProfile(profile);
        setAuthLoading(false);
      } else {
        setSession(null);
        setUserProfile(null);
      }
    });

    return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  if (authLoading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FFFFFF"}}>
      <div style={{width:32,height:32,border:"2px solid #C5D4D4",borderTop:"2px solid #1A6666",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {session && userProfile
          ? ADMIN_ROLES.includes(userProfile.role)
            ? <AdminRouter userProfile={userProfile} onLogout={() => supabase.auth.signOut()} />
            : <Dashboard onLogout={() => supabase.auth.signOut()} userProfile={userProfile} />
          : <LoginPage authError={authError} />
        }
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
