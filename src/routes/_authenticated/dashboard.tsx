import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DISPOSAL, type WasteClass } from "@/lib/disposal";
import { Trophy, Leaf, Recycle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EcoLens AI" }] }),
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
        supabase.from("detections").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setName(profile?.display_name ?? "");
      setEcoScore(profile?.eco_score ?? 0);
      setDetections((dets as Detection[]) ?? []);
    })();
  }, []);

  const totalCarbon = detections.reduce((s, d) => s + (d.carbon_grams ?? 0), 0);
  const counts = detections.reduce<Record<string, number>>((acc, d) => {
    acc[d.predicted_class] = (acc[d.predicted_class] ?? 0) + 1; return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: "Eco score", value: ecoScore, icon: Trophy, color: "text-amber-600" },
    { label: "Total scans", value: detections.length, icon: Recycle, color: "text-primary" },
    { label: "CO₂e saved", value: `${(totalCarbon / 1000).toFixed(2)} kg`, icon: Leaf, color: "text-emerald-600" },
    { label: "Most sorted", value: top ? DISPOSAL[top[0] as WasteClass].label : "—", icon: TrendingUp, color: "text-sky-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Hi {name || "eco warrior"} 👋</h1>
        <p className="text-muted-foreground mt-2">Here's the impact you've made.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass rounded-2xl p-5 soft-shadow">
              <Icon className={`h-5 w-5 ${s.color}`} />
              <div className="text-3xl font-bold mt-2">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-6 soft-shadow">
        <h2 className="font-display text-xl font-semibold mb-4">Recent detections</h2>
        {detections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet — head to <span className="text-primary">Scan</span> to get started.</p>
        ) : (
          <div className="divide-y">
            {detections.map((d) => {
              const info = DISPOSAL[d.predicted_class];
              return (
                <div key={d.id} className="py-3 flex items-center gap-3">
                  <div className="text-2xl">{info.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()} · {d.source}</div>
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">{Math.round(d.confidence * 100)}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
