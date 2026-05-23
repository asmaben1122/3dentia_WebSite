import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import authHero from "@/assets/auth-hero.jpg";

export const Route = createFileRoute("/auth/signup")({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", clinic: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (!terms) return toast.error("Please accept the terms");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/app/dashboard",
        data: { full_name: form.name, clinic: form.clinic },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to verify.");
    navigate({ to: "/auth/signin" });
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error("Google sign-in failed: " + error.message);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 gradient-navy-cyan opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10"><Link to="/"><Logo size="lg" variant="on-blue" /></Link></div>
        <motion.img
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
          src={authHero} alt="" className="relative z-10 max-w-md mx-auto w-full rounded-3xl shadow-2xl ai-glow" width={1024} height={1024}
        />
        <div className="relative z-10 space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">Join the next generation of dental AI</h2>
          <p className="text-white/70 max-w-md">Onboard your clinic in minutes. Reconstruct, review, and export medical-grade 3D jaw models from any panoramic scan.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          {/* Mobile logo — links back to home */}
          <div className="lg:hidden mb-8"><Link to="/"><Logo /></Link></div>
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2"><Label>Full name</Label><Input required value={form.name} onChange={set("name")} className="h-13 rounded-2xl text-base px-5 w-full" placeholder="Dr. " /></div>
            <div className="space-y-2"><Label>Email</Label><Input required type="email" value={form.email} onChange={set("email")} className="h-13 rounded-2xl text-base px-5 w-full" placeholder="you@clinic.com" /></div>
            <div className="space-y-2"><Label>Clinic / Organization</Label><Input required value={form.clinic} onChange={set("clinic")} className="h-13 rounded-2xl text-base px-5 w-full" placeholder="Smile Medical Center" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Password</Label><Input required type="password" value={form.password} onChange={set("password")} className="h-13 rounded-2xl text-base px-5 w-full" /></div>
              <div className="space-y-2"><Label>Confirm</Label><Input required type="password" value={form.confirm} onChange={set("confirm")} className="h-13 rounded-2xl text-base px-5 w-full" /></div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-base gradient-navy-cyan text-white font-medium ai-glow">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">OR</span></div>
            </div>

            <Button type="button" onClick={google} variant="outline" className="w-full h-14 rounded-2xl text-base gap-3">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground pt-1">
              Already have an account? <Link to="/auth/signin" className="text-accent font-medium hover:underline">Sign in</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
