import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Recycle } from "lucide-react";

// Fix default marker icon paths (Leaflet quirk under bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance_km: number;
}

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, 13);
  }, [pos, map]);
  return null;
}

export default function DisposalMap({ pos, places }: { pos: [number, number]; places: MapPlace[] }) {
  return (
    <MapContainer center={pos} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
  );
}
