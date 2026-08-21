import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Landningspunkt för Supabase-e-postlänkar (t.ex. lösenordsåterställning).
 * Hanterar både PKCE-flödet (?code=...) och OTP-flödet
 * (?token_hash=...&type=recovery) och skickar sedan vidare.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest =
        next && next !== "/"
          ? next
          : await postConfirmDestination(supabase);
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const dest =
        type === "signup" || type === "email"
          ? await postConfirmDestination(supabase)
          : next;
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/logga-in?fel=ogiltig-lank", origin),
  );
}

/** Efter e-postbekräftelse: skicka till rätt arbetsyta utifrån profilen. */
async function postConfirmDestination(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/logga-in";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded === false) return "/valj-roll";
  return profile?.role === "teacher" ? "/larare" : "/elev";
}
