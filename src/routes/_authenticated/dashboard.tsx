import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DISPOSAL, type WasteClass } from "@/lib/disposal";
import {
  Trophy,
  Leaf,
  Recycle,
  Flame,
  Trash2,
  Download,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Camera,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportDetectionsPDF } from "@/lib/report";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command Hub — Bin Guru Vision" }] }),
  component: DashboardPage,
});

interface Detection {
  id: string;
  source: string;
  predicted_class: WasteClass;
  confidence: number;
  carbon_grams: number;
  created_at: string;
}

// Reward tiers — gamified eco-points wallet.
const TIERS = [
  { label: "Sprout", threshold: 0, emoji: "🌱" },
  { label: "Sapling", threshold: 100, emoji: "🪴" },
  { label: "Grove", threshold: 250, emoji: "🌳" },
  { label: "Forest", threshold: 500, emoji: "🌲" },
  { label: "Guardian", threshold: 1000, emoji: "🛡️" },
  { label: "Legend", threshold: 2500, emoji: "🏆" },
];

function getTier(points: number) {
  let current = TIERS[0];
  let next = TIERS[1];
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].threshold) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? TIERS[i];
    }
  }
  const span = Math.max(1, next.threshold - current.threshold);
  const progress = next === current ? 1 : Math.min(1, (points - current.threshold) / span);
  return { current, next, progress };
}

// Estimated grams of waste segregated per scan (rough proxy by class).
const MASS_GRAMS: Record<WasteClass, number> = {
  plastic: 60, paper: 90, metal: 180, glass: 320, organic: 250,
  ewaste: 220, cloth: 200, battery: 45, hazardous: 120, wood: 350,
  rubber: 280, medical: 35,
};

function computeStreak(timestamps: string[]): number {
  if (!timestamps.length) return 0;
  const days = new Set(
    timestamps.map((t) => new Date(t).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else if (i === 0) continue; // allow today gap
    else break;
  }
  return streak;
}

function DashboardPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [ecoScore, setEcoScore] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: dets }] = await Promise.all([
        supabase.from("profiles").select("display_name, eco_score").eq("id", user.id).maybeSingle(),
        supabase.from("detections").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setName(profile?.display_name ?? "");
      setEcoScore(profile?.eco_score ?? 0);
      setDetections((dets as Detection[]) ?? []);
    })();
  }, []);

  const totalCarbon = detections.reduce((s, d) => s + (d.carbon_grams ?? 0), 0);
  const totalMass = detections.reduce((s, d) => s + (MASS_GRAMS[d.predicted_class] ?? 80), 0);
  const streak = useMemo(() => computeStreak(detections.map((d) => d.created_at)), [detections]);
  const counts = detections.reduce<Record<string, number>>((acc, d) => {
    acc[d.predicted_class] = (acc[d.predicted_class] ?? 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const tier = getTier(ecoScore);

  // Progress ring geometry
  const SIZE = 132;
  const STROKE = 10;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const dash = C * tier.progress;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2 mb-2">
            <Sparkles className="h-3 w-3 text-primary" /> Environmental Command Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Hi {name || "eco warrior"}, <span className="title-gradient">let's make impact.</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Your gamified sustainability mission control — points, mass segregated, streaks and rewards.
          </p>
        </div>
        <Button
          size="lg"
          onClick={async () => {
            try {
              await exportDetectionsPDF();
              toast.success("Report downloaded.");
            } catch {
              toast.error("Could not export report.");
            }
          }}
          style={{ background: "var(--gradient-neon)" }}
          className="text-white neon-shadow hover:opacity-95 font-semibold"
        >
          <Download className="h-4 w-4 mr-2" /> Export PDF report
        </Button>
      </header>

      {/* Top: Wallet hero + progress ring */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        {/* Eco Points Wallet */}
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 neon-shadow"
             style={{ background: "linear-gradient(135deg, #0a0f0d, #102018 60%, #0a0f0d)" }}>
          <div className="absolute inset-0 opacity-60 pointer-events-none"
               style={{
                 background:
                   "radial-gradient(60% 80% at 100% 0%, rgba(0,230,118,0.28), transparent), radial-gradient(60% 80% at 0% 100%, rgba(0,229,255,0.22), transparent)",
               }} />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-300/90 text-xs font-semibold uppercase tracking-[0.18em]">
                <Wallet className="h-3.5 w-3.5" /> Eco Points Wallet
              </div>
              <div className="mt-3 flex items-baseline gap-2 text-white">
                <span className="hero-number text-6xl md:text-7xl">
                  {ecoScore.toLocaleString()}
                </span>
                <span className="text-emerald-300/80 text-sm font-semibold">pts</span>
              </div>
              <div className="mt-2 text-sm text-white/70">
                Tier <span className="font-semibold text-white">{tier.current.emoji} {tier.current.label}</span>
                {tier.current.label !== tier.next.label && (
                  <> · <span className="text-emerald-300">{Math.max(0, tier.next.threshold - ecoScore)} pts to {tier.next.emoji} {tier.next.label}</span></>
                )}
              </div>
            </div>
            <span className="hidden sm:grid h-14 w-14 place-items-center rounded-2xl bg-white/10 border border-white/15">
              <Leaf className="h-6 w-6 text-emerald-300" />
            </span>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <Link
              to="/scan"
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold bg-white text-emerald-900 hover:opacity-90 transition"
            >
              <Camera className="h-3.5 w-3.5" /> Earn more — Scan now
            </Link>
            <Link
              to="/disposal"
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold bg-white/10 text-white border border-white/15 hover:bg-white/15 transition"
            >
              <MapPin className="h-3.5 w-3.5" /> Find disposal centre
            </Link>
          </div>
        </div>

        {/* Animated progress ring */}
        <div className="glass-strong rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next reward tier
          </div>
          <div className="relative my-4">
            <svg width={SIZE} height={SIZE} className="-rotate-90">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00E676" />
                  <stop offset="60%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#0084ff" />
                </linearGradient>
              </defs>
              <circle
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                stroke="currentColor"
                className="text-muted/40"
                strokeWidth={STROKE} fill="none"
              />
              <circle
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                stroke="url(#ringGrad)"
                strokeWidth={STROKE} fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C - dash}`}
                style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2,0.8,0.2,1)" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center rotate-0">
              <div className="text-center">
                <div className="text-3xl">{tier.next.emoji}</div>
                <div className="text-xl font-bold tabular-nums">{Math.round(tier.progress * 100)}%</div>
              </div>
            </div>
          </div>
          <div className="text-sm font-semibold">
            {tier.current.label} → <span className="eco-gradient-text">{tier.next.label}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Keep scanning &amp; verifying drops to level up.
          </div>
        </div>
      </section>

      {/* Premium metric widgets */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Trophy}
          label="Eco score"
          value={ecoScore.toLocaleString()}
          accent="from-emerald-400 to-cyan-400"
          sublabel={`${tier.current.emoji} ${tier.current.label}`}
        />
        <MetricCard
          icon={Recycle}
          label="Total mass segregated"
          value={`${(totalMass / 1000).toFixed(2)} kg`}
          accent="from-cyan-400 to-blue-400"
          sublabel={`${detections.length} scans`}
        />
        <MetricCard
          icon={Leaf}
          label="CO₂e saved"
          value={`${(totalCarbon / 1000).toFixed(2)} kg`}
          accent="from-lime-400 to-emerald-500"
          sublabel="estimated"
        />
        <StreakCard streak={streak} top={top ? DISPOSAL[top[0] as WasteClass].label : "—"} />
      </section>

      {/* Recent detections */}
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Recent detections</h2>
          {detections.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from("detections").delete().eq("user_id", user.id);
                setDetections([]);
                toast.success("All sorted waste cleared.");
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Clear all
            </Button>
          )}
        </div>
        {detections.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed">
            <div className="text-4xl mb-2">🌿</div>
            <p className="text-sm text-muted-foreground">
              No scans yet — head to <Link to="/scan" className="text-primary font-semibold">Scan</Link> to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {detections.slice(0, 20).map((d) => {
              const info = DISPOSAL[d.predicted_class];
              return (
                <div key={d.id} className="py-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-xl">
                    {info.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()} · {d.source}
                    </div>
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground font-mono">
                    {Math.round(d.confidence * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, accent, sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; accent: string; sublabel?: string;
}) {
  return (
    <div className="glass-strong rounded-2xl p-5 relative overflow-hidden group">
      <div
        className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl group-hover:opacity-30 transition`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-background/60 border">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
        </div>
        <div className="mt-3 text-3xl font-bold font-display tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {sublabel && <div className="mt-1 text-xs text-muted-foreground/80">{sublabel}</div>}
      </div>
    </div>
  );
}

function StreakCard({ streak, top }: { streak: number; top: string }) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden text-white neon-shadow"
         style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" }}>
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 border border-white/20">
            <Flame className="h-5 w-5" />
          </span>
          <span className="text-xs uppercase tracking-widest opacity-80">streak</span>
        </div>
        <div className="mt-3 text-3xl font-bold font-display tabular-nums">
          {streak} <span className="text-base font-medium opacity-80">days</span>
        </div>
        <div className="text-sm opacity-90">Daily eco-action</div>
        <div className="mt-1 text-xs opacity-80">Top sorted: {top}</div>
      </div>
    </div>
  );
}
