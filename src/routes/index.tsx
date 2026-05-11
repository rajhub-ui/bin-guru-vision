import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Video, FileText, Mic, Trophy, Leaf, ArrowRight, Recycle, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { DISPOSAL, WASTE_CLASSES } from "@/lib/disposal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoLens AI — Sort waste with AI in seconds" },
      { name: "description", content: "Snap a photo, point your camera, or ask out loud. EcoLens AI tells you exactly how to dispose of waste — and tracks the carbon you save." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Camera, title: "Image scan", desc: "Drop in a photo, get an instant classification with confidence score." },
  { icon: Video, title: "Live camera", desc: "Hold an item up to your webcam and EcoLens identifies it in real time." },
  { icon: Video, title: "Video upload", desc: "Process recorded clips frame-by-frame with an aggregate verdict." },
  { icon: FileText, title: "PDF analysis", desc: "Extract pages from reports or guides and classify the waste shown." },
  { icon: Mic, title: "Voice assistant", desc: "Ask 'is this recyclable?' and hear an answer back — hands-free." },
  { icon: Trophy, title: "Eco gamification", desc: "Earn points and badges for every item you sort correctly." },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="container mx-auto px-4 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Powered by on-device + cloud AI
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05]">
              Sort waste <span className="eco-gradient-text">smarter,</span><br/>
              waste <span className="eco-gradient-text">less.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              EcoLens AI identifies plastic, paper, metal, glass, organic and e-waste from a photo, your live camera, an uploaded video, a PDF, or just your voice — and tells you exactly what to do with it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90 eco-shadow">
                <Link to="/auth">Start scanning <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/scan">Try the scanner</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { v: "6", l: "waste classes" },
                { v: "5", l: "input modes" },
                { v: "100%", l: "private" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-3xl font-bold eco-gradient-text">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Class showcase */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {WASTE_CLASSES.map((c, i) => {
                const d = DISPOSAL[c];
                return (
                  <div
                    key={c}
                    className="glass rounded-2xl p-5 soft-shadow hover:eco-shadow hover:-translate-y-1 transition-all"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="text-4xl mb-2">{d.emoji}</div>
                    <div className="font-display font-semibold">{d.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.bin}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">One app, every input mode.</h2>
          <p className="mt-3 text-muted-foreground">Whatever way you encounter waste, EcoLens has a way to classify it.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="glass rounded-2xl p-6 soft-shadow group hover:eco-shadow transition-all">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--gradient-primary)] text-primary-foreground mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="glass rounded-3xl p-10 md:p-16 text-center eco-shadow relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-30" style={{ background: "var(--gradient-hero)" }} />
          <Recycle className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold">Every correct sort matters.</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Track your eco score, unlock badges, and watch your carbon savings add up — one scan at a time.
          </p>
          <Button asChild size="lg" className="mt-6 bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90">
            <Link to="/auth">Create your account <Leaf className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
