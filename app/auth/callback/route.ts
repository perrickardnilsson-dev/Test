import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Tar emot OAuth-återkopplingen (t.ex. Google) och skapar sessionen. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/efter-inloggning";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        `${origin}${next.startsWith("/") ? next : "/"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/logga-in?fel=ogiltig-lank`);
}
