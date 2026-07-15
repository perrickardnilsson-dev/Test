import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Anropas från en Server Component – kan ignoreras när
            // middleware sköter sessionsförnyelse.
          }
        },
      },
    },
  );
}

/**
 * Service-role-klient för serverside-operationer som behöver kringgå RLS,
 * t.ex. att skapa inbjudningar eller spara AI-tolkade frågor. Får ALDRIG
 * exponeras mot klienten.
 */
export function createServiceClient() {
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env || !serviceKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
