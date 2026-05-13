import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { ShieldCheck, AlertTriangle, Activity, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAdmin, adminAnalytics, claimAdminIfFirst } from "@/lib/admin.functions";
import { DISPOSAL, type WasteClass } from "@/lib/disposal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — EcoLens AI" },
      { name: "description", content: "Smart-city operations dashboard: detection trends, waste mix, hazards, CO₂e impact." },
      { property: "og:title", content: "Admin — EcoLens AI" },
      { property: "og:description", content: "Operations analytics for the EcoLens smart-city waste platform." },
    ],
  }),
  component: AdminPage,
});

const COLORS = ["#2d8a9e", "#1b4332", "#4ade80", "#a16207", "#7c3aed", "#dc2626", "#db2777"];

function AdminPage() {
  const checkFn = useServerFn(isAdmin);
  const analyticsFn = useServerFn(adminAnalytics);
  const claimFn = useServerFn(claimAdminIfFirst);

  const role = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const analytics = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => analyticsFn(),
    enabled: !!role.data?.admin,
  });
  const claim = useMutation({
    mutationFn: () => claimFn(),
    onSuccess: (r) => {
      if (r.promoted) {
        toast.success("You're now admin.");
        role.refetch();
      } else toast.error(r.reason);
    },
  });

  const rows = analytics.data?.rows ?? [];

  const charts = useMemo(() => {
    const byDay = new Map<string, number>();
    const byClass = new Map<string, number>();
    const byHour = new Array(24).fill(0);
    let totalCarbon = 0;
    let hazards = 0;
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const day = d.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      byClass.set(r.predicted_class, (byClass.get(r.predicted_class) ?? 0) + 1);
      byHour[d.getHours()]++;
      totalCarbon += r.carbon_grams ?? 0;
      if (r.hazard_level) hazards++;
    });
    return {
      byDay: Array.from(byDay.entries())
        .sort()
        .slice(-30)
        .map(([day, count]) => ({ day: day.slice(5), count })),
      byClass: Array.from(byClass.entries()).map(([name, value]) => ({
        name: DISPOSAL[name as WasteClass]?.label ?? name,
        value,
      })),
      byHour: byHour.map((count, hour) => ({ hour: `${hour}h`, count })),
      totalCarbon,
      hazards,
    };
  }, [rows]);

  if (role.isLoading)
    return <div className="p-12 text-center text-muted-foreground">Checking permissions…</div>;

  if (!role.data?.admin) {
    return (
      <div className="max-w-md mx-auto glass rounded-2xl p-8 soft-shadow text-center">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="text-2xl font-bold">Admin only</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You don't have admin permissions yet. If no admin exists, you can claim the seat.
        </p>
        <Button className="mt-4" onClick={() => claim.mutate()} disabled={claim.isPending}>
          Claim admin (first user only)
        </Button>
      </div>
    );
  }

  const stats = [
    { label: "Total detections", value: rows.length, icon: Activity, color: "text-primary" },
    { label: "CO₂e saved", value: `${(charts.totalCarbon / 1000).toFixed(2)} kg`, icon: Leaf, color: "text-emerald-600" },
    { label: "Hazard events", value: charts.hazards, icon: AlertTriangle, color: "text-coral" },
    { label: "Active classes", value: charts.byClass.length, icon: ShieldCheck, color: "text-sky" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-4xl font-bold">Smart city operations</h1>
        <p className="text-muted-foreground mt-2">Last 1000 detections across the network.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 soft-shadow lg:col-span-2 h-80">
          <h2 className="font-display text-lg font-semibold mb-3">Detections per day</h2>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={charts.byDay}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d8a9e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#2d8a9e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#1b4332" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5 soft-shadow h-80">
          <h2 className="font-display text-lg font-semibold mb-3">Waste mix</h2>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={charts.byClass} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {charts.byClass.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5 soft-shadow lg:col-span-3 h-80">
          <h2 className="font-display text-lg font-semibold mb-3">Activity by hour</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={charts.byHour}>
              <XAxis dataKey="hour" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#2d8a9e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
