import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paden die zonder ingelogde gebruiker bereikbaar zijn. */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/**
 * Ververst de Supabase auth-sessie bij elke request, houdt de
 * auth-cookies synchroon en stuurt niet-ingelogde bezoekers naar
 * /login. Wordt aangeroepen vanuit de root `proxy.ts` (in Next.js 16
 * de opvolger van `middleware.ts`).
 *
 * Belangrijk: voer geen logica uit tussen het aanmaken van de client
 * en `supabase.auth.getUser()`. Dat kan tot lastig te debuggen
 * sessieproblemen leiden.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Zolang Supabase nog niet is geconfigureerd laten we de request
  // ongemoeid door, zodat de app zonder .env.local te bekijken is.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Ververst het access token indien nodig.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Niet ingelogd en geen publiek pad -> naar /login, met het
  // oorspronkelijke pad als ?redirect zodat we daarna terugkeren.
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Al ingelogd maar op /login -> door naar het dashboard.
  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
