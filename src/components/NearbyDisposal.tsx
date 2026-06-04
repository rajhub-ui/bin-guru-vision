import { useEffect, useMemo, useState, type ComponentType } from "react";
import { MapPin, Navigation, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RR_CENTRES, BENGALURU_POS, centresForClass, type RRCentre } from "@/lib/rrnagar-centres";
import type { WasteClass } from "@/lib/disposal";
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

export interface NearbyDisposalProps {
  wasteClass: WasteClass | null;
  compact?: boolean;
  detectionId?: string | null;
}

export function NearbyDisposal({ wasteClass, compact = false, detectionId }: NearbyDisposalProps) {
  const [pos, setPos] = useState<[number, number]>(RNSIT_POS);
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
    <div className="glass rounded-2xl p-4 soft-shadow mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Nearby disposal centres
          {wasteClass && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
              for {wasteClass}
            </span>
          )}
        </h3>
        <span className="text-xs text-muted-foreground">{centres.length} near RNSIT</span>
      </div>

      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "lg:grid-cols-[1fr_320px]"}`}>
        <div className={`rounded-xl overflow-hidden border ${compact ? "h-72" : "h-80"}`}>
          {MapComp ? (
            <MapComp pos={pos} places={places} />
          ) : (
            <div className="h-full grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {centres.length === 0 && (
            <li className="text-sm text-muted-foreground italic">No matching centre nearby.</li>
          )}
          {centres.map((c) => (
            <li key={c.id} className="rounded-lg border p-3 bg-card">
              <div className="text-sm font-semibold leading-tight">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.address}</div>
              <div className="text-xs text-muted-foreground">{c.distance_km.toFixed(2)} km · {c.type}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Navigation className="h-3 w-3" /> Navigate
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setActiveCentre(c);
                    setProofOpen(true);
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" /> I dumped here
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
