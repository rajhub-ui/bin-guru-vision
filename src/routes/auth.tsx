import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Leaf, Loader2, Apple } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EcoLens AI" },
      { name: "description", content: "Sign in or create an EcoLens AI account to start tracking your eco impact." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    router.navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Signing you in…");
    router.navigate({ to: "/dashboard" });
  };

  const oauth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? "Sign-in failed");
    }
    if (result.redirected) return;
    setLoading(false);
    router.navigate({ to: "/dashboard" });
  };

  const SocialButtons = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" disabled={loading} onClick={() => oauth("google")} className="w-full">
          <GoogleIcon className="h-4 w-4 mr-2" /> Google
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => oauth("apple")} className="w-full">
          <Apple className="h-4 w-4 mr-2" /> Apple
        </Button>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-primary)] text-primary-foreground eco-shadow">
            <Leaf className="h-5 w-5" />
          </span>
          EcoLens<span className="eco-gradient-text">AI</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-5xl font-bold leading-tight">Make every<br/>scan <span className="eco-gradient-text">count.</span></h2>
          <p className="mt-4 text-muted-foreground max-w-md">Join thousands learning to recycle right with AI guidance — and earn badges as you go.</p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EcoLens AI</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-primary)] text-primary-foreground">
                <Leaf className="h-5 w-5" />
              </span>
              EcoLens AI
            </Link>
          </div>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="glass rounded-2xl p-6 mt-4 space-y-4 soft-shadow">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <SocialButtons />
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-in">Password</Label>
                  <Input id="pw-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {(() => {
                  const ok = isValidEmail(email) && password.length >= 6;
                  return (
                    <Button
                      type="submit"
                      disabled={loading || !ok}
                      style={ok ? { background: "var(--gradient-primary)" } : undefined}
                      className={cn(
                        "w-full transition-all",
                        ok ? "text-primary-foreground eco-shadow hover:opacity-90" : "bg-muted text-muted-foreground border border-border cursor-not-allowed",
                      )}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                    </Button>
                  );
                })()}
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="glass rounded-2xl p-6 mt-4 space-y-4 soft-shadow">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <div className="space-y-2">
                  <Label htmlFor="name-up">Display name</Label>
                  <Input id="name-up" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eco warrior" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-up">Password</Label>
                  <Input id="pw-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {(() => {
                  const ok = isValidEmail(email) && password.length >= 6;
                  return (
                    <Button
                      type="submit"
                      disabled={loading || !ok}
                      style={ok ? { background: "var(--gradient-primary)" } : undefined}
                      className={cn(
                        "w-full transition-all",
                        ok ? "text-primary-foreground eco-shadow hover:opacity-90" : "bg-muted text-muted-foreground border border-border cursor-not-allowed",
                      )}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                    </Button>
                  );
                })()}
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
