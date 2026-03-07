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

async function fetchUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
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
        {session && userProfile
          ? <Dashboard onLogout={() => supabase.auth.signOut()} userProfile={userProfile} />
          : <LoginPage authError={authError} />
        }
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
