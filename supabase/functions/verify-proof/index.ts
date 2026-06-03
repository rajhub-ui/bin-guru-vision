import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a strict reviewer that verifies whether a photo is genuine PROOF of waste disposal at a public waste-collection point.

You must approve the photo ONLY IF ALL of the following are true:
1. The photo clearly shows the waste item physically being placed INSIDE a waste bin, dumpster, collection container, or visibly at an organised collection point.
2. The waste shown in the photo is consistent with the declared waste class (e.g. for class="plastic" you must see plastic items; for "ewaste" you must see electronics; for "battery" you must see batteries; etc.).
3. The photo is not a random selfie, a clean room, an empty bin alone, or a screenshot from the internet.

Reject if:
- The photo shows ONLY the waste with no bin / collection point context.
- The bin is empty or the waste is not actually deposited.
- The waste type does not match the declared class.
- The image is blurry, dark, generic stock, or unrelated.

Reply ONLY with strict JSON: {"valid": true|false, "confidence": 0.0-1.0, "reason": "<one short sentence>"}.`;

const EARTH_RADIUS_METERS = 6371000;

// Mathematical calculation for spherical surface distance 
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_METERS * c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const { 
      imageBase64, 
      mimeType = "image/jpeg", 
      wasteClass, 
      centreId, 
      centreName,
      userLat, 
      userLon 
    } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ valid: false, reason: "No image provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 1: GEOSPATIAL ANTI-CHEAT VERIFICATION ---
    // Instantly filter requests if coordinates aren't supplied or are mathematically out of bounds
    if (!userLat || !userLon) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Location tracking required to prove you are present at the center." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize administrative client context to read structural system schemas securely
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the actual coordinate registry for the destination center from your centers database table
    const { data: center, error: dbError } = await supabase
      .from("disposal_centers")
      .select("latitude, longitude")
      .eq("id", centreId)
      .single();

    if (dbError || !center) {
      console.error("Database lookup failure or center entry absent:", dbError);
      return new Response(
        JSON.stringify({ valid: false, reason: "Target collection center registry invalid or missing from server record." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run Haversine cross-check. Maximum allowed distance error margin: 50 meters
    const exactDistance = calculateDistance(userLat, userLon, center.latitude, center.longitude);
    if (exactDistance > 50) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: `Geofence failed. You are roughly ${Math.round(exactDistance)}m away. You must stand within 50m of the yard.` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STEP 2: AI VISION STRUCTURAL CONTENT INSPECTION ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userText = `Declared waste class: "${wasteClass ?? "unknown"}". Disposal centre: "${centreName ?? "unknown"}". Decide if this image is valid proof of disposal.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("verify-proof gateway error", res.status, t);
      return new Response(
        JSON.stringify({ valid: false, reason: "Verification service unavailable, please try again." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: { valid?: boolean; confidence?: number; reason?: string };
    try { parsed = JSON.parse(raw); } catch { parsed = { valid: false, reason: "Could not parse verifier output." }; }
    
    const valid = Boolean(parsed.valid) && (parsed.confidence ?? 1) >= 0.6;
    
    return new Response(
      JSON.stringify({ valid, confidence: parsed.confidence ?? 0, reason: parsed.reason ?? "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ valid: false, reason: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
