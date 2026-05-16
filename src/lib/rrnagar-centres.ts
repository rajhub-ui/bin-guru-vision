import type { WasteClass } from "./disposal";

export interface RRCentre {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  address: string;
  accepts: WasteClass[];
}

// 5 hardcoded waste centres within ~5 km of RNSIT College, RR Nagar, Bangalore.
// Coordinates are approximate; verified to fall inside the RR Nagar / Kengeri /
// Channasandra / BEML Layout / Ullal cluster.
export const RNSIT_POS: [number, number] = [12.9166, 77.4974];

export const RR_CENTRES: RRCentre[] = [
  {
    id: "bbmp-rrnagar",
    name: "BBMP Dry Waste Collection Centre — RR Nagar",
    lat: 12.9241,
    lon: 77.5161,
    type: "Recycling",
    address: "Ward 160, Rajarajeshwari Nagar, Bengaluru",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "eparisaraa-kengeri",
    name: "E-Parisaraa E-Waste Collection Point — Kengeri",
    lat: 12.91,
    lon: 77.483,
    type: "E-waste",
    address: "Kengeri Satellite Town, Bengaluru",
    accepts: ["ewaste"],
  },
  {
    id: "saahas-channasandra",
    name: "Saahas Zero Waste Hub — Channasandra",
    lat: 12.932,
    lon: 77.488,
    type: "Recycling / Hazardous",
    address: "Channasandra Main Rd, Bengaluru",
    accepts: ["plastic", "paper", "glass", "ewaste", "cloth"],
  },
  {
    id: "beml-scrap",
    name: "BEML Layout Scrap & Metal Recycler",
    lat: 12.905,
    lon: 77.492,
    type: "Metal / Scrap",
    address: "BEML Layout, 5th Stage, RR Nagar, Bengaluru",
    accepts: ["metal", "ewaste"],
  },
  {
    id: "ullal-compost",
    name: "Ullal Organic & Compost Hub",
    lat: 12.927,
    lon: 77.473,
    type: "Compost",
    address: "Ullal Main Rd, Bengaluru",
    accepts: ["organic", "paper"],
  },
];

export function centresForClass(cls: WasteClass): RRCentre[] {
  return RR_CENTRES.filter((c) => c.accepts.includes(cls));
}

// Bonus eco points for higher-impact waste types.
export function ecoPointsForClass(cls: WasteClass): number {
  if (cls === "ewaste") return 40;
  if (cls === "glass" || cls === "metal") return 30;
  return 25;
}
