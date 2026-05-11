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
};

export const WASTE_CLASSES: WasteClass[] = [
  "plastic", "paper", "metal", "glass", "organic", "ewaste",
];
