import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Recycle } from "lucide-react";

// Custom pulsing eco-pin (rendered via divIcon so we can apply our CSS).
const ecoPinIcon = L.divIcon({
  className: "eco-pin-wrap",
  html: `<span class="eco-pin"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userPinIcon = L.divIcon({
  className: "eco-pin-wrap",
  html: `<span class="eco-pin eco-pin-user"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
    map.setView(pos, 11);
  }, [pos, map]);
  return null;
}

export default function DisposalMap({ pos, places }: { pos: [number, number]; places: MapPlace[] }) {
  return (
    <MapContainer center={pos} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <Recenter pos={pos} />
      <Marker position={pos} icon={userPinIcon}>
        <Popup>You are here</Popup>
      </Marker>
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lon]} icon={ecoPinIcon}>
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
