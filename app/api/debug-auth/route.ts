import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, repairMissingProfile } from "@/lib/auth";
import { getEnvCheck, isSupabaseConfigured } from "@/lib/env";

/** Diagnostik efter inloggning – visar vad servern faktiskt ser (ingen hemlig data). */
export async function GET() {
  const env = getEnvCheck();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      step: "env",
      env,
      message: "Supabase-URL eller anon-nyckel saknas på servern.",
    });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        step: "session",
        env,
        message:
          "Ingen giltig session på servern. Kontrollera Supabase Auth → URL Configuration (Site URL + redirect URLs) och logga in igen.",
        authError: authError?.message ?? null,
      });
    }

    let profile = await getProfile();
    let repaired = false;
    if (!profile) {
      profile = await repairMissingProfile(user);
      repaired = Boolean(profile);
    }

    return NextResponse.json({
      ok: Boolean(profile),
      step: profile ? "ready" : "profile",
      env,
      userId: user.id,
      email: user.email,
      profile: profile
        ? {
            role: profile.role,
            name: profile.name,
            onboarded: profile.onboarded,
          }
        : null,
      repaired,
      message: profile
        ? "Allt ser bra ut – du ska kunna nå lärarvyn."
        : "Inloggad men profil saknas och kunde inte skapas. Kontrollera SUPABASE_SERVICE_ROLE_KEY och kör fix-saknade-profiler.sql.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: "error",
      env,
      message: e instanceof Error ? e.message : "Okänt serverfel",
    });
  }
}
