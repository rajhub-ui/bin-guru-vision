import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a multi-object waste detector. Identify EVERY distinct waste item visible (return multiple items when present) and classify each into exactly one of: plastic, paper, metal, glass, organic, ewaste, cloth.
- plastic: bottles, packaging, plastic bags, polystyrene
- paper: cardboard, newspaper, magazines, office paper
- metal: aluminium cans, tin cans, foil, scrap metal
- glass: bottles, jars, broken glass containers
- organic: food scraps, plant matter, compostable
- ewaste: phones, batteries, cables, circuit boards, light bulbs
- cloth: clothing, fabric, towels, textiles, shoes
Return ONLY valid JSON: {"items":[{"label":"<short object name>","class":"plastic|paper|metal|glass|organic|ewaste|cloth","confidence":0.0-1.0,"box":[x,y,w,h]}],"summary":"one short sentence"}.
box MUST be provided as normalized 0..1 image coords [x,y,width,height] for each item so the UI can draw an AR overlay. If no waste visible, return items: [].`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const callModel = (model: string) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                { type: "text", text: "Classify the waste in this image." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

    const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"];
    const delays = [0, 800, 2000];
    let res: Response | null = null;
    outer: for (const model of models) {
      for (const wait of delays) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        res = await callModel(model);
        if (res.ok) break outer;
        if (res.status !== 429) break;
        console.warn(`429 from ${model}, retrying after ${wait}ms`);
      }
      if (res && res.status !== 429) break;
    }

    if (!res || !res.ok) {
      const status = res?.status ?? 500;
      const t = res ? await res.text() : "no response";
      console.error("AI gateway error", status, t);
      if (status === 429 || status >= 500) {
        return new Response(
          JSON.stringify({ items: [], summary: "", fallback: true, retryable: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (status === 402)
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      return new Response(JSON.stringify({ error: "Vision request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { items: [], summary: "Could not parse model output." };
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ items: [], summary: "", fallback: true, retryable: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
