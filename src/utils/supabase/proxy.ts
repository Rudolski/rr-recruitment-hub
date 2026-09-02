import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ververst de Supabase auth-sessie bij elke request en houdt de
 * auth-cookies synchroon tussen request en response.
 *
 * Wordt aangeroepen vanuit de root `proxy.ts` (in Next.js 16 de
 * opvolger van `middleware.ts`).
 *
 * Belangrijk: voer geen logica uit tussen het aanmaken van de client
 * en `supabase.auth.getUser()`. Dat kan tot lastig te debuggen
 * sessieproblemen leiden.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Zolang Supabase nog niet is geconfigureerd (fase 0) laten we de
  // request ongemoeid door, zodat de lege navigatie te bekijken is.
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
  await supabase.auth.getUser();

  // Auth-gating (redirect naar /login voor niet-ingelogde gebruikers)
  // komt in fase 0 zodra Supabase Auth is aangesloten.

  return supabaseResponse;
}
