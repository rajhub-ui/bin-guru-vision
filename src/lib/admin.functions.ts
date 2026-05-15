import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) return { admin: false };
    return { admin: !!data };
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { data, error } = await supabaseAdmin
      .from("detections")
      .select("predicted_class, source, confidence, carbon_grams, hazard_level, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return { rows: data ?? [] };
  });

export const claimAdminIfFirst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { promoted: false, reason: "An admin already exists." };
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return { promoted: false, reason: error.message };
    return { promoted: true };
  });
