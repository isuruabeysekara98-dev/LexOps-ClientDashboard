import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase.js";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import ProposalPage from "@/components/ProposalPage";
import SetPasswordPage from "@/components/SetPasswordPage";

async function fetchUserProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[fetchUserProfile] error:", error.code, error.message);
  }

  if (!profile) {
    console.warn("[fetchUserProfile] No profile found for", userId, "— signing out");
    await supabase.auth.signOut();
    return { __noProfile: true };
  }

  if (profile.role === "client") {
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);
    return {
      ...profile,
      allowedProjectIds: (memberships || []).map((m: any) => m.project_id),
    };
  }

  return profile;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    // Safety net: force authLoading to false after 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && authLoading) setAuthLoading(false);
    }, 5000);

    (async () => {
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession() as any;
        console.log("[Auth] getSession result:", { hasSession: !!session, userId: session?.user?.id, error: sessErr });
        if (!mounted) return;
        setSession(session);
        if (!session?.user) {
          console.log("[Auth] No session — showing login");
          return;
        }

        let profile = await fetchUserProfile(session.user.id);
        console.log("[Auth] profile fetch result:", profile);

        // No profile found — user was signed out by fetchUserProfile
        if (profile?.__noProfile) {
          if (mounted) setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          return;
        }

        // If profile is null, the session token may be stale — try refreshing
        if (!profile && mounted) {
          console.log("[Auth] Profile null — attempting session refresh");
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          console.log("[Auth] refreshSession result:", { hasSession: !!refreshData?.session, error: refreshErr });
          if (refreshData?.session?.user && !refreshErr) {
            setSession(refreshData.session);
            profile = await fetchUserProfile(refreshData.session.user.id);
            console.log("[Auth] profile after refresh:", profile);
            if (profile?.__noProfile) {
              if (mounted) setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
              return;
            }
          }
        }

        if (mounted) {
          console.log("[Auth] Setting userProfile:", profile);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error("[Auth] getSession error:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile?.__noProfile) {
          if (mounted) setAuthError("Account not set up correctly. Please contact hello@teamsquared.io");
          return;
        }
        if (mounted) setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  // Invite / recovery token in URL hash — show password setup page
  const hash = window.location.hash;
  if (hash && (hash.includes("type=invite") || hash.includes("type=recovery"))) {
    return <SetPasswordPage />;
  }

  // Public route: /proposal/:token
  const proposalMatch = window.location.pathname.match(/^\/proposal\/([a-f0-9-]+)$/i);
  if (proposalMatch) {
    return <ProposalPage token={proposalMatch[1]} />;
  }

  if (authLoading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1318"}}>
      <div style={{width:32,height:32,border:"2px solid rgba(255,255,255,0.07)",borderTop:"2px solid #4a7fa5",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {session
          ? <Dashboard onLogout={() => supabase.auth.signOut()} userProfile={userProfile} />
          : <LoginPage authError={authError} />
        }
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
