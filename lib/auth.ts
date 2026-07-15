import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

/** Hämtar inloggad användares profil, eller null. */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Kräver inloggning + given roll, annars omdirigering. */
export async function requireRole(role: Role): Promise<Profile> {
  if (!isSupabaseConfigured()) redirect("/konfiguration");

  const profile = await getProfile();
  if (!profile) redirect("/logga-in");
  // OAuth-användare som inte valt roll ännu skickas till rollvalet.
  if (profile.onboarded === false) redirect("/valj-roll");
  if (profile.role !== role) {
    redirect(profile.role === "teacher" ? "/larare" : "/elev");
  }
  return profile;
}
