import { useEffect, useMemo, useState, type ComponentType } from "react";
import { MapPin, Navigation, ShieldCheck, Loader2, Footprints, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RR_CENTRES, BENGALURU_POS, centresForClass, type RRCentre } from "@/lib/rrnagar-centres";
import { DISPOSAL, type WasteClass } from "@/lib/disposal";
import type { MapPlace } from "@/components/DisposalMap";
import { DisposalProofDialog } from "@/components/DisposalProofDialog";

type DisposalMapType = ComponentType<{ pos: [number, number]; places: MapPlace[] }>;

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Avg walking pace ~5 km/h.
function walkingMinutes(km: number) {
  return Math.max(1, Math.round((km / 5) * 60));
}

// Deterministic "open / closed" status from the current hour. Centres are
// roughly open 8:00–20:00; pseudo-vary by centre id.
function isOpenNow(centreId: string): { open: boolean; label: string } {
  const hour = new Date().getHours();
  // Tiny hash of id → 0..3 hours shift, so not every centre flips at once.
  const shift = centreId
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
  const opensAt = 7 + shift;
  const closesAt = 19 + shift;
  const open = hour >= opensAt && hour < closesAt;
  return {
    open,
    label: open ? `Open · closes ${closesAt}:00` : `Closed · opens ${opensAt}:00`,
  };
}

export interface NearbyDisposalProps {
  wasteClass: WasteClass | null;
  compact?: boolean;
  detectionId?: string | null;
}

export function NearbyDisposal({ wasteClass, compact = false, detectionId }: NearbyDisposalProps) {
  const [pos, setPos] = useState<[number, number]>(BENGALURU_POS);
  const [MapComp, setMapComp] = useState<DisposalMapType | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [activeCentre, setActiveCentre] = useState<RRCentre | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/components/DisposalMap").then((m) => {
      if (!cancelled) setMapComp(() => m.default);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: false, timeout: 6000 },
    );
  }, []);

  const centres = useMemo(() => {
    const list = wasteClass ? centresForClass(wasteClass) : RR_CENTRES;
    return list
      .map((c) => ({ ...c, distance_km: haversine(pos, [c.lat, c.lon]) }))
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [wasteClass, pos]);

  const places: MapPlace[] = centres.map((c) => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lon: c.lon,
    distance_km: c.distance_km,
  }));

  // Hide the whole panel while the proof dialog is open so the map doesn't
  // overlap or distract from the camera/upload flow.
  if (proofOpen) {
    return (
      <DisposalProofDialog
        open={proofOpen}
        onOpenChange={setProofOpen}
        centre={activeCentre}
        wasteClass={wasteClass}
        detectionId={detectionId ?? null}
      />
    );
  }

  return (
    <div className="glass-pane p-5 md:p-6 mt-6">
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="eyebrow flex items-center gap-2 mb-1.5">
            <MapPin className="h-3 w-3 text-primary" /> Bengaluru Network
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-bold title-gradient">
            Nearby disposal centres
          </h3>
          {wasteClass && (
            <span className="mt-2 inline-flex items-center text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-accent text-accent-foreground capitalize">
              Filtered · {wasteClass}
            </span>
          )}
        </div>
        <span className="eyebrow tabular-nums">
          {centres.length} centres
        </span>
      </div>

      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "lg:grid-cols-[1fr_360px]"}`}>
        <div className={`relative rounded-2xl overflow-hidden border neon-border ${compact ? "h-72" : "h-[420px]"}`}>
          {MapComp ? (
            <MapComp pos={pos} places={places} />
          ) : (
            <div className="h-full grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Ledger-style centre list */}
        <ul className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {centres.length === 0 && (
            <li className="text-sm text-muted-foreground italic">No matching centre nearby.</li>
          )}
          {centres.map((c) => {
            const status = isOpenNow(c.id);
            const minutes = walkingMinutes(c.distance_km);
            return (
              <li
                key={c.id}
                className="rounded-2xl border bg-card/80 backdrop-blur p-3.5 hover:border-primary/40 transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="relative mt-0.5 inline-block">
                    <span className="eco-pin" style={{ width: 14, height: 14 }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {c.address}
                    </div>
                  </div>
                </div>

                {/* Ledger row */}
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                    <dt className="uppercase tracking-wider text-muted-foreground/80">Dist.</dt>
                    <dd className="font-semibold tabular-nums">{c.distance_km.toFixed(1)} km</dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                    <dt className="uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                      <Footprints className="h-3 w-3" /> Walk
                    </dt>
                    <dd className="font-semibold tabular-nums">{minutes} min</dd>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                    <dt className="uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Status
                    </dt>
                    <dd className={`font-semibold ${status.open ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {status.open ? "Open" : "Closed"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-2 text-[10px] text-muted-foreground">{status.label} · {c.type}</div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveCentre(c);
                      setProofOpen(true);
                    }}
                    className="h-8 text-xs font-semibold flex-1 text-white"
                    style={{ background: "var(--gradient-neon)" }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verify my dumping
                  </Button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-semibold border bg-background hover:bg-accent transition"
                    aria-label={`Navigate to ${c.name}`}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
