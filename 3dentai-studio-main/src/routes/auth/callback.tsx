import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Landing page after Google (or any OAuth) redirect.
 * Supabase automatically detects the auth code in the URL (detectSessionInUrl=true)
 * and exchanges it for a session. We just listen and forward to the dashboard.
 */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the SIGNED_IN event Supabase fires after processing the OAuth code
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          toast.success("Signed in successfully");
          navigate({ to: "/app/dashboard" });
        }
        if (event === "SIGNED_OUT") {
          navigate({ to: "/auth/signin" });
        }
      }
    );

    // Handle the case where the session was already processed synchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/app/dashboard" });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <Logo />

      <div className="flex flex-col items-center gap-3">
        <div className="h-11 w-11 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
