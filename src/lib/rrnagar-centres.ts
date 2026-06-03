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

// Default map centre — Bengaluru city centre (MG Road area).
export const RNSIT_POS: [number, number] = [12.9716, 77.5946];

// Curated waste-disposal centres across Bengaluru. Mix of BBMP dry-waste
// centres, certified e-waste recyclers, organic composting hubs, scrap dealers
// and hazardous/biomedical drop-offs.
export const RR_CENTRES: RRCentre[] = [
  // --- West Bengaluru / RR Nagar belt ---
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
    type: "Recycling / Hazardous",
    address: "Channasandra Main Rd",
    accepts: ["plastic", "paper", "glass", "ewaste", "cloth", "hazardous", "medical", "battery"],
  },
  {
    id: "beml-scrap",
    name: "BEML Layout Scrap & Metal Recycler",
    lat: 12.905, lon: 77.492,
    type: "Metal / Scrap",
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

  // --- South Bengaluru ---
  {
    id: "bbmp-jayanagar",
    name: "BBMP Dry Waste Centre — Jayanagar 4th Block",
    lat: 12.9250, lon: 77.5938,
    type: "Recycling",
    address: "Jayanagar 4th Block",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "hsr-compost",
    name: "HSR Layout Composting Centre",
    lat: 12.9116, lon: 77.6473,
    type: "Compost",
    address: "HSR Layout, Sector 6",
    accepts: ["organic", "paper", "wood"],
  },
  {
    id: "btm-scrap",
    name: "BTM Scrap & Metal Recycler",
    lat: 12.9166, lon: 77.6101,
    type: "Metal / Scrap",
    address: "BTM 2nd Stage",
    accepts: ["metal", "ewaste", "rubber", "wood", "plastic"],
  },
  {
    id: "bannerghatta-haz",
    name: "Bannerghatta Hazardous Waste Drop-off",
    lat: 12.8853, lon: 77.5970,
    type: "Hazardous",
    address: "Bannerghatta Rd, near IIM-B",
    accepts: ["hazardous", "medical", "battery", "ewaste"],
  },

  // --- East Bengaluru ---
  {
    id: "bbmp-indiranagar",
    name: "BBMP Dry Waste Centre — Indiranagar",
    lat: 12.9719, lon: 77.6412,
    type: "Recycling",
    address: "100 Ft Rd, Indiranagar",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "ewaste-whitefield",
    name: "E-Waste Recyclers India — Whitefield",
    lat: 12.9698, lon: 77.7499,
    type: "E-waste / Battery",
    address: "ITPL Main Rd, Whitefield",
    accepts: ["ewaste", "battery"],
  },
  {
    id: "marathahalli-scrap",
    name: "Marathahalli Scrap & Rubber Recycler",
    lat: 12.9591, lon: 77.6974,
    type: "Metal / Rubber",
    address: "Outer Ring Rd, Marathahalli",
    accepts: ["metal", "rubber", "plastic", "wood"],
  },
  {
    id: "krpuram-medical",
    name: "KR Puram Biomedical Collection Point",
    lat: 13.0072, lon: 77.6957,
    type: "Biomedical",
    address: "Old Madras Rd, KR Puram",
    accepts: ["medical", "hazardous"],
  },

  // --- North Bengaluru ---
  {
    id: "hebbal-dry",
    name: "BBMP Dry Waste Centre — Hebbal",
    lat: 13.0359, lon: 77.5970,
    type: "Recycling",
    address: "Hebbal Kempapura",
    accepts: ["plastic", "paper", "metal", "glass", "cloth", "wood"],
  },
  {
    id: "yelahanka-compost",
    name: "Yelahanka Composting & Organic Hub",
    lat: 13.1007, lon: 77.5963,
    type: "Compost",
    address: "Yelahanka New Town",
    accepts: ["organic", "paper", "wood"],
  },
  {
    id: "rtnagar-ewaste",
    name: "RT Nagar E-Waste & Battery Drop-off",
    lat: 13.0237, lon: 77.5972,
    type: "E-waste / Battery",
    address: "RT Nagar Main Rd",
    accepts: ["ewaste", "battery", "hazardous"],
  },

  // --- Central Bengaluru ---
  {
    id: "mgroad-dry",
    name: "BBMP Dry Waste Centre — Shivajinagar",
    lat: 12.9854, lon: 77.6049,
    type: "Recycling",
    address: "Commercial St, Shivajinagar",
    accepts: ["plastic", "paper", "metal", "glass", "cloth"],
  },
  {
    id: "malleswaram-textile",
    name: "Malleswaram Textile & Donation Centre",
    lat: 13.0035, lon: 77.5709,
    type: "Textile / Donation",
    address: "Sampige Rd, Malleswaram",
    accepts: ["cloth", "paper"],
  },
  {
    id: "basavanagudi-glass",
    name: "Basavanagudi Glass & Bottle Recycler",
    lat: 12.9416, lon: 77.5712,
    type: "Glass / Recycling",
    address: "Bull Temple Rd, Basavanagudi",
    accepts: ["glass", "metal", "plastic"],
  },

  // --- Peripheral ---
  {
    id: "electronic-city-ewaste",
    name: "Electronic City Certified E-Waste Recycler",
    lat: 12.8452, lon: 77.6602,
    type: "E-waste / Battery",
    address: "Phase 1, Electronic City",
    accepts: ["ewaste", "battery", "hazardous"],
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
