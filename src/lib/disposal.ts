import type { Database } from "@/integrations/supabase/types";

export type WasteClass = Database["public"]["Enums"]["waste_class"];
export type DetectionSource = Database["public"]["Enums"]["detection_source"];

export interface DisposalInfo {
  label: string;
  emoji: string;
  color: string; // semantic token name
  bin: string;
  instructions: string[];
  recyclable: boolean;
  carbonGramsSaved: number; // grams CO2e per item correctly diverted
}

export const DISPOSAL: Record<WasteClass, DisposalInfo> = {
  plastic: {
    label: "Plastic",
    emoji: "🧴",
    color: "sky",
    bin: "Recycling (yellow / blue bin)",
    instructions: [
      "Rinse the container to remove food residue.",
      "Remove caps and labels if your facility requires it.",
      "Flatten bottles to save space.",
    ],
    recyclable: true,
    carbonGramsSaved: 80,
  },
  paper: {
    label: "Paper",
    emoji: "📄",
    color: "earth",
    bin: "Paper recycling (blue bin)",
    instructions: [
      "Keep dry — wet paper cannot be recycled.",
      "Remove staples, plastic windows or tape.",
      "Flatten cardboard to save space.",
    ],
    recyclable: true,
    carbonGramsSaved: 40,
  },
  metal: {
    label: "Metal",
    emoji: "🥫",
    color: "amber",
    bin: "Metal recycling (yellow bin)",
    instructions: [
      "Rinse cans before recycling.",
      "Aluminium and steel are infinitely recyclable.",
      "Crush cans to save volume.",
    ],
    recyclable: true,
    carbonGramsSaved: 700,
  },
  glass: {
    label: "Glass",
    emoji: "🍾",
    color: "leaf",
    bin: "Glass recycling (green bin)",
    instructions: [
      "Empty and rinse the bottle or jar.",
      "Remove lids and corks (recycle separately).",
      "Don't include broken window or mirror glass.",
    ],
    recyclable: true,
    carbonGramsSaved: 300,
  },
  organic: {
    label: "Organic",
    emoji: "🍎",
    color: "leaf",
    bin: "Compost / organic waste",
    instructions: [
      "Place in compost bin or food-waste collection.",
      "Avoid plastic bags — use compostable liners only.",
      "Keep dairy and meat out of home compost piles.",
    ],
    recyclable: true,
    carbonGramsSaved: 120,
  },
  ewaste: {
    label: "E-Waste",
    emoji: "🔌",
    color: "coral",
    bin: "Certified e-waste drop-off",
    instructions: [
      "Never put in regular trash — contains heavy metals.",
      "Wipe personal data first.",
      "Drop off at a certified e-waste recycler or take-back program.",
    ],
    recyclable: true,
    carbonGramsSaved: 1500,
  },
  cloth: {
    label: "Cloth",
    emoji: "👕",
    color: "rose",
    bin: "Textile recycling / donation bin",
    instructions: [
      "Donate wearable clothing to charity shops.",
      "Drop torn or stained textiles at a fabric-recycling point.",
      "Avoid putting wet or mouldy fabric in donation bins.",
    ],
    recyclable: true,
    carbonGramsSaved: 250,
  },
  battery: {
    label: "Battery",
    emoji: "🔋",
    color: "coral",
    bin: "Battery take-back point",
    instructions: [
      "Tape the terminals to prevent short-circuits.",
      "Never throw in regular trash — contains heavy metals.",
      "Drop at a certified battery / e-waste collection bin.",
    ],
    recyclable: true,
    carbonGramsSaved: 1200,
  },
  hazardous: {
    label: "Hazardous",
    emoji: "☣️",
    color: "coral",
    bin: "Hazardous waste facility",
    instructions: [
      "Keep in original labelled container.",
      "Never mix with regular waste or pour down the drain.",
      "Take to a certified hazardous-waste collection event or facility.",
    ],
    recyclable: false,
    carbonGramsSaved: 900,
  },
  wood: {
    label: "Wood",
    emoji: "🪵",
    color: "earth",
    bin: "Wood / bulky recycling",
    instructions: [
      "Untreated wood can be chipped or composted.",
      "Painted / treated wood goes to a special wood-recycling yard.",
      "Remove nails and metal fittings first.",
    ],
    recyclable: true,
    carbonGramsSaved: 180,
  },
  rubber: {
    label: "Rubber",
    emoji: "🛞",
    color: "amber",
    bin: "Rubber / tyre recycling",
    instructions: [
      "Tyres are accepted at certified retreaders or recyclers.",
      "Small rubber items can sometimes go with mixed recycling — check locally.",
      "Never burn rubber — releases toxic fumes.",
    ],
    recyclable: true,
    carbonGramsSaved: 350,
  },
  medical: {
    label: "Medical",
    emoji: "💉",
    color: "coral",
    bin: "Biomedical waste (yellow / red bag)",
    instructions: [
      "Sharps go into a puncture-proof container.",
      "Never put used syringes, vials or PPE in normal trash.",
      "Return to a pharmacy or biomedical-waste collection point.",
    ],
    recyclable: false,
    carbonGramsSaved: 600,
  },
};

export const DECOMPOSITION: Record<WasteClass, { time: string; method: string }> = {
  plastic: { time: "450+ years", method: "Mechanical recycling — shred, wash, melt into pellets, remould." },
  paper:   { time: "2–6 weeks",   method: "Pulping + de-inking — re-formed into new paper sheets." },
  metal:   { time: "50–500 years",method: "Melt-down furnace — re-cast into ingots, infinitely recyclable." },
  glass:   { time: "1M+ years",   method: "Crushed into cullet, melted at 1500°C, blown into new bottles." },
  organic: { time: "2–6 weeks",   method: "Aerobic composting or anaerobic digestion → soil + biogas." },
  ewaste:  { time: "Never (toxic)", method: "Certified disassembly — recover gold, copper, rare earths; safe-dispose batteries." },
  cloth:   { time: "5 months – 40 years", method: "Sort by fibre, shred natural fibres for insulation, recycle synthetics into yarn." },
  battery: { time: "100+ years", method: "Specialised smelter — recover lithium, cobalt, lead; safe-dispose electrolytes." },
  hazardous: { time: "Never (toxic)", method: "Neutralised or incinerated under controlled high-temperature conditions." },
  wood:    { time: "1–3 years", method: "Chipped into mulch, particle-board feedstock or biomass fuel." },
  rubber:  { time: "50–80 years", method: "Cryogenic grinding into crumb-rubber for playgrounds, roads, new tyres." },
  medical: { time: "Never (biohazard)", method: "Autoclaved or incinerated at 1000°C+ in licensed biomedical plants." },
};

export const WASTE_CLASSES: WasteClass[] = [
  "plastic", "paper", "metal", "glass", "organic", "ewaste", "cloth",
  "battery", "hazardous", "wood", "rubber", "medical",
];

export interface MaterialInfo {
  composition: string;        // what it's made of
  manufacturing: string;      // how it's typically produced
  decomposes: string;         // natural decomposition time
  recycledInto: string;       // what it can be turned into
}

export const MATERIALS: Record<WasteClass, MaterialInfo> = {
  plastic: {
    composition: "Polymers — typically PET, HDPE, PP or PVC derived from crude-oil hydrocarbons.",
    manufacturing: "Naphtha cracked into monomers, polymerised under heat & pressure, then injection-moulded or blow-moulded.",
    decomposes: "450+ years in landfill; never fully — breaks into microplastics.",
    recycledInto: "Pellets → new bottles, polyester fibre, park benches, road asphalt blends.",
  },
  paper: {
    composition: "Cellulose fibres from wood pulp, plus fillers (kaolin clay, calcium carbonate) and ink.",
    manufacturing: "Logs pulped & bleached, fibres laid on mesh, pressed and dried into sheets.",
    decomposes: "2–6 weeks in compost; faster when shredded.",
    recycledInto: "Newsprint, cardboard, egg cartons, insulation, tissue paper.",
  },
  metal: {
    composition: "Aluminium, tin-plated steel or stainless alloys — refined from bauxite / iron ore.",
    manufacturing: "Ore smelted in blast / electrolytic furnace, rolled into sheets, stamped or drawn into cans.",
    decomposes: "50–500 years; doesn't biodegrade but oxidises (rusts) over decades.",
    recycledInto: "New cans, car parts, bicycle frames — infinitely recyclable with 95% less energy.",
  },
  glass: {
    composition: "Silica sand (~70%) + soda ash + limestone, melted at ~1500 °C.",
    manufacturing: "Raw mix melted in a furnace, gob blown or pressed into bottles, annealed to relieve stress.",
    decomposes: "1 million+ years — practically inert.",
    recycledInto: "Crushed into cullet, re-melted into new bottles, fibreglass, road aggregate.",
  },
  organic: {
    composition: "Cellulose, starch, proteins, water — biomass from plants or animals.",
    manufacturing: "Grown / farmed; no industrial fabrication.",
    decomposes: "2–6 weeks via aerobic composting; weeks–months in landfill (produces methane).",
    recycledInto: "Nutrient-rich compost, biogas (methane) and digestate fertiliser.",
  },
  ewaste: {
    composition: "Mixed metals (Cu, Au, Ag, Pd), plastics, lithium / lead batteries, glass, flame retardants.",
    manufacturing: "Silicon wafers etched into chips, PCBs assembled with solder, housed in plastic/metal cases.",
    decomposes: "Never — leaches heavy metals (Pb, Hg, Cd) into soil and groundwater.",
    recycledInto: "Recovered gold, copper, rare earths; refurbished components; safe-disposed batteries.",
  },
  cloth: {
    composition: "Natural fibres (cotton, wool, linen) or synthetics (polyester, nylon, acrylic) + dyes.",
    manufacturing: "Fibres spun into yarn, woven or knitted, dyed and finished with chemical treatments.",
    decomposes: "Natural fibres: 5 months – 1 year. Synthetics: 20–40 years (shed microplastics).",
    recycledInto: "Industrial rags, insulation, shredded yarn, upcycled fashion.",
  },
  battery: {
    composition: "Lithium-ion, NiMH, alkaline or lead-acid cells with metal casings and electrolyte.",
    manufacturing: "Cathode/anode coated on metal foils, rolled with separator, sealed with electrolyte.",
    decomposes: "100+ years; leaches lithium, cobalt, lead and acid into soil.",
    recycledInto: "Recovered cobalt, lithium and nickel for new batteries.",
  },
  hazardous: {
    composition: "Solvents, paints, pesticides, acids — reactive, flammable or toxic chemicals.",
    manufacturing: "Synthesised in chemical plants for industrial, cleaning or agricultural use.",
    decomposes: "Persists indefinitely; many compounds bioaccumulate in soil and water.",
    recycledInto: "Some solvents are re-distilled; most are incinerated under strict controls.",
  },
  wood: {
    composition: "Cellulose, lignin and hemicellulose fibres; may be treated with paints or preservatives.",
    manufacturing: "Felled and milled from trees, then dried, planed and sometimes chemically treated.",
    decomposes: "1–3 years untreated; treated wood can persist much longer and leach chemicals.",
    recycledInto: "Mulch, particle board, MDF, biomass pellets for energy.",
  },
  rubber: {
    composition: "Natural latex or synthetic polymers (SBR, butyl) + carbon black, sulphur, oils.",
    manufacturing: "Vulcanised under heat and pressure into moulds (tyres, gaskets, shoe soles).",
    decomposes: "50–80 years; releases toxins if burned.",
    recycledInto: "Crumb rubber for sports surfaces, road asphalt blends, retread tyres.",
  },
  medical: {
    composition: "Mixed plastics, glass, metals, contaminated cotton, biological fluids and sharps.",
    manufacturing: "Single-use medical devices and PPE produced under sterile conditions.",
    decomposes: "Never safely — biohazard; pathogens can survive in landfills.",
    recycledInto: "Sterilised metals/glass may be recovered; most is incinerated and ash landfilled.",
  },
};
