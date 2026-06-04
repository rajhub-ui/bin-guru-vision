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

// Bengaluru city centre (approx. MG Road / Cubbon Park).
export const BENGALURU_POS: [number, number] = [12.9716, 77.5946];
// Backwards-compat alias.
export const RNSIT_POS = BENGALURU_POS;

// Hand-picked waste disposal centres across Bengaluru — covering all major zones
// (Central, North, South, East, West, Whitefield, Electronic City, Yelahanka, etc.).
export const RR_CENTRES: RRCentre[] = [
  // ===== West Bengaluru / RR Nagar =====
  {
    id: "bbmp-rrnagar",
    name: "BBMP Dry Waste Collection Centre — RR Nagar",
    lat: 12.9241, lon: 77.5161,
    type: "Recycling",
    address: "Ward 160, Rajarajeshwari Nagar",
    accepts: ["plastic", "paper", "metal", "glass", "cloth", "wood", "rubber"],
  },
  {
    id: "eparisaraa-kengeri",
    name: "E-Parisaraa E-Waste Collection — Kengeri",
    lat: 12.91, lon: 77.483,
    type: "E-waste / Battery",
    address: "Kengeri Satellite Town",
    accepts: ["ewaste", "battery"],
  },
  {
    id: "saahas-channasandra",
    name: "Saahas Zero Waste Hub — Channasandra",
    lat: 12.932, lon: 77.488,
    type: "Recycling / Hazardous / Medical",
    address: "Channasandra Main Rd",
    accepts: ["plastic", "paper", "glass", "ewaste", "cloth", "hazardous", "medical", "battery"],
  },
  // ===== Central Bengaluru =====
  {
    id: "bbmp-shivajinagar",
    name: "BBMP Dry Waste Centre — Shivajinagar",
    lat: 12.9852, lon: 77.6055,
    type: "Recycling",
    address: "Shivajinagar",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "hasiru-dala-cbd",
    name: "Hasiru Dala MRF — Cubbon Park area",
    lat: 12.9763, lon: 77.5929,
    type: "Recycling / Composting",
    address: "Near Cubbon Park",
    accepts: ["plastic", "paper", "metal", "glass", "organic", "cloth"],
  },
  // ===== South Bengaluru =====
  {
    id: "bbmp-jayanagar",
    name: "BBMP Dry Waste Centre — Jayanagar 4th Block",
    lat: 12.9279, lon: 77.5831,
    type: "Recycling",
    address: "Jayanagar 4th Block",
    accepts: ["plastic", "paper", "metal", "glass", "cloth", "wood"],
  },
  {
    id: "eparisaraa-btm",
    name: "E-Parisaraa E-Waste Drop-off — BTM Layout",
    lat: 12.9166, lon: 77.6101,
    type: "E-waste / Battery",
    address: "BTM Layout 2nd Stage",
    accepts: ["ewaste", "battery", "hazardous"],
  },
  {
    id: "kspcb-jpnagar",
    name: "KSPCB Hazardous Waste Drop — JP Nagar",
    lat: 12.9081, lon: 77.5851,
    type: "Hazardous / Medical",
    address: "JP Nagar 6th Phase",
    accepts: ["hazardous", "medical", "battery", "ewaste"],
  },
  // ===== North Bengaluru =====
  {
    id: "bbmp-hebbal",
    name: "BBMP Dry Waste Centre — Hebbal",
    lat: 13.0359, lon: 77.5970,
    type: "Recycling",
    address: "Hebbal",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "yelahanka-compost",
    name: "Yelahanka Compost & Organic Hub",
    lat: 13.1007, lon: 77.5963,
    type: "Compost",
    address: "Yelahanka New Town",
    accepts: ["organic", "paper", "wood"],
  },
  // ===== East Bengaluru / Whitefield =====
  {
    id: "bbmp-whitefield",
    name: "BBMP Dry Waste Centre — Whitefield",
    lat: 12.9698, lon: 77.7500,
    type: "Recycling",
    address: "Whitefield Main Rd",
    accepts: ["plastic", "paper", "metal", "glass", "cloth", "wood", "rubber"],
  },
  {
    id: "saahas-mahadevapura",
    name: "Saahas Zero Waste — Mahadevapura",
    lat: 12.9959, lon: 77.6974,
    type: "Recycling / Hazardous / Medical",
    address: "Mahadevapura",
    accepts: ["plastic", "paper", "glass", "ewaste", "cloth", "hazardous", "medical", "battery"],
  },
  {
    id: "marathahalli-ewaste",
    name: "E-Waste Collection Point — Marathahalli",
    lat: 12.9591, lon: 77.6974,
    type: "E-waste / Battery",
    address: "Marathahalli Bridge",
    accepts: ["ewaste", "battery"],
  },
  // ===== Electronic City / South-East =====
  {
    id: "ecity-ewaste",
    name: "Electronic City E-Waste Hub",
    lat: 12.8452, lon: 77.6602,
    type: "E-waste / Battery / Metal",
    address: "Electronic City Phase 1",
    accepts: ["ewaste", "battery", "metal", "plastic"],
  },
  {
    id: "ecity-compost",
    name: "Electronic City Compost Yard",
    lat: 12.8389, lon: 77.6772,
    type: "Compost",
    address: "Electronic City Phase 2",
    accepts: ["organic", "paper", "wood"],
  },
  // ===== HSR / Koramangala =====
  {
    id: "bbmp-hsr",
    name: "BBMP Dry Waste Centre — HSR Layout",
    lat: 12.9116, lon: 77.6446,
    type: "Recycling",
    address: "HSR Layout Sector 2",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "koramangala-scrap",
    name: "Koramangala Scrap & Metal Recycler",
    lat: 12.9352, lon: 77.6245,
    type: "Metal / Scrap / Rubber",
    address: "Koramangala 5th Block",
    accepts: ["metal", "ewaste", "rubber", "wood"],
  },
  // ===== North-West / Peenya =====
  {
    id: "peenya-scrap",
    name: "Peenya Industrial Scrap Hub",
    lat: 13.0289, lon: 77.5217,
    type: "Metal / Scrap / Hazardous",
    address: "Peenya Industrial Area",
    accepts: ["metal", "ewaste", "rubber", "wood", "hazardous", "battery"],
  },
  // ===== West / BEML / Ullal =====
  {
    id: "beml-scrap",
    name: "BEML Layout Scrap & Metal Recycler",
    lat: 12.905, lon: 77.492,
    type: "Metal / Scrap / Rubber",
    address: "BEML Layout, 5th Stage, RR Nagar",
    accepts: ["metal", "ewaste", "rubber", "wood"],
  },
  {
    id: "ullal-compost",
    name: "Ullal Organic & Compost Hub",
    lat: 12.927, lon: 77.473,
    type: "Compost",
    address: "Ullal Main Rd",
    accepts: ["organic", "paper", "wood"],
  },
  // ===== Indiranagar / CV Raman Nagar =====
  {
    id: "indiranagar-dwcc",
    name: "BBMP Dry Waste Centre — Indiranagar",
    lat: 12.9719, lon: 77.6412,
    type: "Recycling",
    address: "Indiranagar 100ft Rd",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
];

export function centresForClass(cls: WasteClass): RRCentre[] {
  return RR_CENTRES.filter((c) => c.accepts.includes(cls));
}

// Bonus eco points for higher-impact waste types.
export function ecoPointsForClass(cls: WasteClass): number {
  if (cls === "hazardous" || cls === "medical") return 50;
  if (cls === "ewaste" || cls === "battery") return 40;
  if (cls === "glass" || cls === "metal" || cls === "rubber") return 30;
  return 25;
}
