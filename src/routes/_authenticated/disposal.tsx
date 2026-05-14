import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigation, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Leaflet uses `window` at module top — load only on the client.
const DisposalMap = lazy(() => import("@/components/DisposalMap"));

interface FacilitySearch {
  q?: string;
}

export const Route = createFileRoute("/_authenticated/disposal")({
  validateSearch: (search: Record<string, unknown>): FacilitySearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Disposal map — EcoLens AI" },
      { name: "description", content: "Find the nearest recycling, e-waste and hazardous waste centres on a live smart-city map." },
      { property: "og:title", content: "Disposal map — EcoLens AI" },
      { property: "og:description", content: "Smart-city navigation to your nearest waste disposal facility." },
    ],
  }),
  component: DisposalPage,
});

const FILTERS = [
  { id: "recycling", label: "Recycling", q: "recycling centre" },
  { id: "ewaste", label: "E-waste", q: "electronic recycling" },
  { id: "hazardous", label: "Hazardous", q: "hazardous waste facility" },
  { id: "battery", label: "Battery", q: "battery recycling" },
  { id: "medical", label: "Medical", q: "medical waste pharmacy" },
  { id: "compost", label: "Compost", q: "compost facility" },
  { id: "scrap", label: "Metal/Scrap", q: "scrap metal yard" },
] as const;

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  distance_km: number;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function Recenter({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, 13);
  }, [pos, map]);
  return null;
}

function DisposalPage() {
  const search = Route.useSearch();
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string>(search.q ?? "recycling");
  const [custom, setCustom] = useState("");

  // get geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported. Defaulting to London.");
      setPos([51.5072, -0.1276]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {
        toast.message("Location denied — showing default city.");
        setPos([51.5072, -0.1276]);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const activeFilter = useMemo(() => FILTERS.find((f) => f.id === active) ?? FILTERS[0], [active]);

  useEffect(() => {
    if (!pos) return;
    const query = custom.trim() || activeFilter.q;
    setLoading(true);
    const ctrl = new AbortController();
    (async () => {
      try {
        // Nominatim viewbox bias around user (~30km)
        const d = 0.3;
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "20");
        url.searchParams.set("viewbox", `${pos[1] - d},${pos[0] + d},${pos[1] + d},${pos[0] - d}`);
        url.searchParams.set("bounded", "1");
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("search failed");
        const data: Array<{ place_id: number; display_name: string; lat: string; lon: string; type: string }> =
          await res.json();
        const mapped: Place[] = data
          .map((p) => ({
            id: String(p.place_id),
            name: p.display_name.split(",").slice(0, 2).join(", "),
            lat: parseFloat(p.lat),
            lon: parseFloat(p.lon),
            type: p.type,
            distance_km: haversine(pos, [parseFloat(p.lat), parseFloat(p.lon)]),
          }))
          .sort((a, b) => a.distance_km - b.distance_km);
        setPlaces(mapped);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error(e);
          toast.error("Could not load nearby facilities.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [pos, activeFilter.q, custom]);

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">Smart disposal map</h1>
        <p className="text-muted-foreground mt-2">
          Live nearby recycling, e-waste, hazardous, battery and medical-waste drop-off points.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <aside className="glass rounded-2xl p-4 soft-shadow space-y-4 h-fit lg:sticky lg:top-20">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActive(f.id);
                  setCustom("");
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  active === f.id && !custom
                    ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent"
                    : "border-border hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Input
            placeholder="Custom search (e.g. textile bank)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />

          <div className="border-t pt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {loading ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Searching</span>
              ) : (
                `${places.length} facilities`
              )}
            </div>
            <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {places.map((p) => (
                <li key={p.id} className="rounded-lg border p-3 hover:bg-accent/50 transition">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.distance_km.toFixed(2)} km away</div>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Navigation className="h-3 w-3" /> Navigate
                  </a>
                </li>
              ))}
              {!loading && places.length === 0 && (
                <li className="text-sm text-muted-foreground italic">No nearby facilities found.</li>
              )}
            </ul>
          </div>
        </aside>

        <div className="rounded-2xl overflow-hidden border soft-shadow h-[70vh]">
          {pos ? (
            <MapContainer center={pos} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Recenter pos={pos} />
              <Marker position={pos}>
                <Popup>You are here</Popup>
              </Marker>
              <Circle center={pos} radius={1500} pathOptions={{ color: "#2d8a9e", fillOpacity: 0.06 }} />
              {places.map((p) => (
                <Marker key={p.id} position={[p.lat, p.lon]}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold flex items-center gap-1">
                        <Recycle className="h-3 w-3" /> {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.distance_km.toFixed(2)} km</div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs"
                      >
                        Open directions →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full grid place-items-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => navigator.geolocation?.getCurrentPosition((p) => setPos([p.coords.latitude, p.coords.longitude]))}
      >
        <Navigation className="h-4 w-4 mr-1.5" /> Recenter on me
      </Button>
    </div>
  );
}
