import type { DetectedItem } from "./scan";

export type HazardLevel = "low" | "medium" | "high" | "critical";

export interface HazardInfo {
  level: HazardLevel;
  category: string; // battery / medical / chemical / sharps / ewaste
  ppe: string[];
  steps: string[];
  facilityKeyword: string;
}

const RULES: Array<{ re: RegExp; info: HazardInfo }> = [
  {
    re: /(batter(y|ies)|li-?ion|lithium|cell|power\s*bank)/i,
    info: {
      level: "high",
      category: "battery",
      ppe: ["Gloves"],
      steps: [
        "Tape the terminals to prevent short circuits.",
        "Do NOT crush or incinerate.",
        "Drop at a battery take-back bin or e-waste centre.",
      ],
      facilityKeyword: "battery",
    },
  },
  {
    re: /(syringe|needle|sharps|scalpel|blade|broken\s*glass)/i,
    info: {
      level: "critical",
      category: "sharps",
      ppe: ["Heavy gloves", "Eye protection"],
      steps: [
        "Use puncture-proof container — never bare hands.",
        "Seal and label as 'Sharps'.",
        "Hand to municipal medical-waste collection.",
      ],
      facilityKeyword: "medical",
    },
  },
  {
    re: /(medical|medicine|pill|drug|pharma|expired\s*med|inhaler|mask|ppe)/i,
    info: {
      level: "high",
      category: "medical",
      ppe: ["Gloves", "Mask"],
      steps: [
        "Bag separately — do not mix with household waste.",
        "Return to a pharmacy take-back program if possible.",
        "Dispose at certified biomedical waste centre.",
      ],
      facilityKeyword: "medical",
    },
  },
  {
    re: /(chemical|paint|solvent|pesticide|bleach|acid|toxic|aerosol|propane|gas\s*can)/i,
    info: {
      level: "critical",
      category: "chemical",
      ppe: ["Chemical gloves", "Mask", "Eye protection"],
      steps: [
        "Keep in original container — never mix chemicals.",
        "Store away from heat & sparks.",
        "Drop at a hazardous-waste collection event or facility.",
      ],
      facilityKeyword: "hazardous",
    },
  },
  {
    re: /(phone|laptop|tablet|cable|charger|circuit|bulb|cfl|led|electronic|appliance|monitor|tv|router)/i,
    info: {
      level: "medium",
      category: "ewaste",
      ppe: [],
      steps: [
        "Wipe personal data first.",
        "Remove batteries if accessible.",
        "Drop at a certified e-waste recycler or take-back program.",
      ],
      facilityKeyword: "electronic",
    },
  },
];

export function detectHazard(items: DetectedItem[]): HazardInfo | null {
  let best: HazardInfo | null = null;
  const order: HazardLevel[] = ["low", "medium", "high", "critical"];
  for (const item of items) {
    const text = `${item.label} ${item.class}`;
    if (item.class === "ewaste" && !best) best = RULES[RULES.length - 1].info;
    for (const r of RULES) {
      if (r.re.test(text)) {
        if (!best || order.indexOf(r.info.level) > order.indexOf(best.level)) {
          best = r.info;
        }
      }
    }
  }
  return best;
}

let audioCtx: AudioContext | null = null;
export function playHazardBeep() {
  try {
    audioCtx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now + t);
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });
  } catch {
    /* audio not available */
  }
}
