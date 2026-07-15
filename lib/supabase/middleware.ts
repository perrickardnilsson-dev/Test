import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/konfiguration")) {
    return NextResponse.next({ request });
  }

  const env = getSupabaseEnv();
  if (!env) {
    const url = request.nextUrl.clone();
    url.pathname = "/konfiguration";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/konfiguration";
    url.searchParams.set("fel", "supabase");
    return NextResponse.redirect(url);
  }

  const isAuthPage =
    path.startsWith("/logga-in") || path.startsWith("/registrera");
  const isProtected =
    path.startsWith("/larare") || path.startsWith("/elev");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/logga-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
