import { Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, Navigation } from "lucide-react";
import { useEffect } from "react";
import type { HazardInfo } from "@/lib/hazard";
import { playHazardBeep } from "@/lib/hazard";
import { Button } from "@/components/ui/button";

const TONE: Record<HazardInfo["level"], string> = {
  low: "border-amber/40 bg-amber/10",
  medium: "border-amber/60 bg-amber/15",
  high: "border-coral/60 bg-coral/15",
  critical: "border-destructive/60 bg-destructive/15",
};

export function HazardAlert({ hazard, beep = true }: { hazard: HazardInfo; beep?: boolean }) {
  useEffect(() => {
    if (beep) playHazardBeep();
  }, [hazard.category, beep]);

  const Icon = hazard.level === "critical" ? ShieldAlert : AlertTriangle;
  return (
    <div
      className={`rounded-2xl border-2 p-5 ${TONE[hazard.level]} soft-shadow`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-6 w-6 mt-0.5 text-destructive animate-pulse" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold uppercase tracking-wider text-sm">
              Hazard detected · {hazard.category}
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
              {hazard.level}
            </span>
          </div>

          {hazard.ppe.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Recommended PPE: {hazard.ppe.join(" · ")}
            </p>
          )}

          <ol className="mt-3 space-y-1.5 text-sm list-decimal list-inside">
            {hazard.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>

          <div className="mt-4">
            <Button asChild size="sm" variant="outline">
              <Link to="/disposal" search={{ q: hazard.facilityKeyword }}>
                <Navigation className="h-4 w-4 mr-1.5" />
                Find {hazard.category} disposal nearby
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
