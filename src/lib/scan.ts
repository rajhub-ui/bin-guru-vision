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
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-waste`;

async function callClassify(imageBase64: string, mimeType: string): Promise<ClassifyResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const data = await res.json();
  if (!res.ok) return { items: [], summary: "", error: data.error ?? `HTTP ${res.status}` };
  return data;
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
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("detections").insert({
    user_id: user.id,
    source: opts.source,
    predicted_class: opts.predicted_class,
    confidence: opts.confidence,
    carbon_grams: opts.carbon_grams,
    image_path: opts.image_path ?? null,
  });
  // bump eco score: +confidence*10 rounded
  const inc = Math.max(1, Math.round(opts.confidence * 10));
  await supabase.rpc("noop").catch(() => {});
  // simple update: read + write
  const { data: profile } = await supabase.from("profiles").select("eco_score").eq("id", user.id).maybeSingle();
  if (profile) {
    await supabase.from("profiles").update({ eco_score: (profile.eco_score ?? 0) + inc }).eq("id", user.id);
  }
}
