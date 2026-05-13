import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
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
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    // RLS on detections is per-user; the admin client view here only sees own rows.
    // In a real ops deployment we would use supabaseAdmin — kept user-scoped to respect RLS by default.
    const { data, error } = await supabase
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
    const { supabase, userId } = context;
    // If any admin already exists at all, this user can't self-promote.
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { promoted: false, reason: "An admin already exists." };
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return { promoted: false, reason: error.message };
    return { promoted: true };
  });
