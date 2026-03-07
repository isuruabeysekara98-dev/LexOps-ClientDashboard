import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase.js";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import ProposalPage from "@/components/ProposalPage";

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
    console.warn("[fetchUserProfile] No profile found for", userId, "— creating default profile");
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, role: "lexops_admin", full_name: "" })
      .select("*")
      .single();
    if (insertError) {
      console.error("[fetchUserProfile] insert error:", insertError.message);
      return null;
    }
    return newProfile;
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

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) setUserProfile(profile);
      }
      if (mounted) setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

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
          : <LoginPage />
        }
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
