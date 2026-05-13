import { supabase } from "@/integrations/supabase/client";
import type { WasteClass } from "./disposal";

export interface DetectedItem {
  label: string;
  class: WasteClass;
  confidence: number;
  box: [number, number, number, number] | null;
}

export interface ClassifyResult {
  items: DetectedItem[];
  summary: string;
  error?: string;
  fallback?: boolean;
  retryable?: boolean;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-waste`;

// In-memory cache: identical images skip the network round-trip entirely.
const CACHE_MAX = 50;
const cache = new Map<string, ClassifyResult>();

async function hashBase64(b64: string): Promise<string> {
  // Sample to keep hashing cheap on big images
  const sample = b64.length > 32_000 ? b64.slice(0, 16_000) + b64.slice(-16_000) : b64;
  const bytes = new TextEncoder().encode(sample);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function callClassify(imageBase64: string, mimeType: string): Promise<ClassifyResult> {
  const key = await hashBase64(imageBase64);
  const cached = cache.get(key);
  if (cached) return cached;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  let data: Partial<ClassifyResult> & { error?: string } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok)
    return {
      items: [],
      summary: "",
      error: data.error ?? `HTTP ${res.status}`,
      retryable: res.status === 429 || res.status >= 500,
    };

  const safeData: ClassifyResult = {
    items: Array.isArray(data.items) ? data.items : [],
    summary: typeof data.summary === "string" ? data.summary : "",
    fallback: Boolean(data.fallback),
    retryable: Boolean(data.retryable),
  };

  // LRU-ish trim
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  if (!safeData.fallback) cache.set(key, safeData);
  return safeData;
}

export async function classifyFile(file: File): Promise<ClassifyResult> {
  const base64 = await fileToBase64(file);
  return callClassify(base64, file.type || "image/jpeg");
}

export async function classifyCanvas(canvas: HTMLCanvasElement): Promise<ClassifyResult> {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1];
  return callClassify(base64, "image/jpeg");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1]);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function logDetection(opts: {
  source: "image" | "live" | "video" | "pdf";
  predicted_class: WasteClass;
  confidence: number;
  carbon_grams: number;
  image_path?: string;
  hazard_level?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("detections").insert({
    user_id: user.id,
    source: opts.source,
    predicted_class: opts.predicted_class,
    confidence: opts.confidence,
    carbon_grams: opts.carbon_grams,
    image_path: opts.image_path ?? null,
    hazard_level: opts.hazard_level ?? null,
  });
  const inc = Math.max(1, Math.round(opts.confidence * 10));
  const { data: profile } = await supabase
    .from("profiles")
    .select("eco_score")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) {
    await supabase
      .from("profiles")
      .update({ eco_score: (profile.eco_score ?? 0) + inc })
      .eq("id", user.id);
  }
}
