import { NextResponse } from "next/server";
import { checkDatabase, getEnvCheck, isSupabaseConfigured } from "@/lib/env";

/** Enkel hälsokoll för felsökning i produktion (ingen känslig data). */
export async function GET() {
  const env = getEnvCheck();
  const db = isSupabaseConfigured() ? await checkDatabase() : null;

  return NextResponse.json({
    supabaseConfigured: isSupabaseConfigured(),
    env,
    database: db,
    timestamp: new Date().toISOString(),
  });
}
