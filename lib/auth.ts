import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

/** Skapar profilrad om användaren finns i Auth men saknar rad (vanligt efter sent setup). */
export async function repairMissingProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<Profile | null> {
  try {
    const service = createServiceClient();
    const meta = user.user_metadata ?? {};
    const role =
      typeof meta.role === "string" &&
      (meta.role === "teacher" || meta.role === "student")
        ? meta.role
        : "teacher";
    const name =
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      (user.email?.split("@")[0] ?? "Användare");

    const { data, error } = await service
      .from("profiles")
      .insert({
        id: user.id,
        role,
        name,
        email: user.email ?? "",
        onboarded: typeof meta.role === "string",
      })
      .select("*")
      .single();

    if (error || !data) {
      // Profil skapades av triggern mellan försöken – hämta den.
      if (error?.code === "23505") {
        const { data: existing } = await service
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (existing) return existing as Profile;
      }

      // Äldre databas utan onboarded-kolumn.
      if (error?.message?.includes("onboarded")) {
        const { data: legacy, error: legacyErr } = await service
          .from("profiles")
          .insert({
            id: user.id,
            role,
            name,
            email: user.email ?? "",
          })
          .select("*")
          .single();
        if (!legacyErr && legacy) return legacy as Profile;
      }

      return null;
    }
    return data as Profile;
  } catch {
    return null;
  }
}

/** Hämtar inloggad användares profil, eller null. */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) return data as Profile;

    const shouldRepair =
      error?.code === "PGRST116" ||
      error?.code === "PGRST301" ||
      error?.details?.includes("0 rows");

    if (shouldRepair) {
      return repairMissingProfile(user);
    }

    return null;
  } catch {
    return null;
  }
}

/** Kräver inloggning + given roll, annars omdirigering. */
export async function requireRole(role: Role): Promise<Profile> {
  if (!isSupabaseConfigured()) redirect("/konfiguration");

  let profile: Profile | null = null;
  try {
    profile = await getProfile();
  } catch {
    redirect("/konfiguration?fel=supabase");
  }

  if (!profile) redirect("/logga-in?fel=saknar-profil");
  // OAuth-användare som inte valt roll ännu skickas till rollvalet.
  if (profile.onboarded === false) redirect("/valj-roll");
  if (profile.role !== role) {
    redirect(profile.role === "teacher" ? "/larare" : "/elev");
  }
  return profile;
}
