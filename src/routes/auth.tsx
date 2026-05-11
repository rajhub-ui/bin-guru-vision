import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
                <div className="space-y-2">
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw-in">Password</Label>
                  <Input id="pw-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
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
                <Button type="submit" disabled={loading} className="w-full bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
