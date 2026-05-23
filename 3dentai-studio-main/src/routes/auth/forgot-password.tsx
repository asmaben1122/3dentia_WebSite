import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/forgot-password")({
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/signin",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="bg-card border border-border rounded-3xl p-8 soft-shadow">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="text-muted-foreground mt-2">We sent a password reset link to <span className="font-medium text-foreground">{email}</span></p>
              <Link to="/auth/signin" className="mt-6 inline-flex items-center gap-2 text-sm text-accent hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
                <p className="text-muted-foreground mt-2 text-sm">We'll email you a secure link to set a new password.</p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" placeholder="you@clinic.com" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-navy-cyan text-white ai-glow">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
              </Button>
              <Link to="/auth/signin" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
