import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase.js";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

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
