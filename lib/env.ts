/** Kontrollerar att Supabase-URL och anon-nyckel finns (krävs för all auth). */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? null;
}

/** Status för miljövariabler – används på /konfiguration. */
export type EnvCheck = {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseServiceKey: boolean;
  anthropicKey: boolean;
  appUrl: boolean;
};

export function getEnvCheck(): EnvCheck {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseAnonKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    supabaseServiceKey: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };
}

export type DatabaseCheck =
  | { ok: true }
  | { ok: false; message: string };

/** Testar att profiles-tabellen finns och är läsbar. */
export async function checkDatabase(): Promise<DatabaseCheck> {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      ok: false,
      message: "Supabase-URL och anon-nyckel måste vara satta först.",
    };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("does not exist") ||
        msg.includes("finns inte") ||
        error.code === "42P01"
      ) {
        return {
          ok: false,
          message:
            'Databastabellerna saknas. Kör supabase/setup.sql (eller step1-tabeller.sql) i Supabase SQL Editor.',
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Kunde inte ansluta till Supabase. Kontrollera URL och nycklar.",
    };
  }
}
