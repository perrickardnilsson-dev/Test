import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Säker landningspunkt efter inloggning/registrering.
 * Reparerar saknad profil och skickar vidare utan att krascha.
 */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/konfiguration`);
  }

  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.redirect(`${origin}/logga-in?fel=saknar-profil`);
    }
    if (profile.onboarded === false) {
      return NextResponse.redirect(`${origin}/valj-roll`);
    }

    if (next && next.startsWith("/")) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const dest = profile.role === "teacher" ? "/larare" : "/elev";
    return NextResponse.redirect(`${origin}${dest}`);
  } catch {
    return NextResponse.redirect(`${origin}/konfiguration?fel=supabase`);
  }
}
