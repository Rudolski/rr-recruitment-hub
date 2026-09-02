import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

/**
 * Next.js 16 Proxy (voorheen Middleware). Ververst bij elke request
 * de Supabase auth-sessie.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle paden behalve:
     * - _next/static (build assets)
     * - _next/image (image optimizer)
     * - favicon.ico
     * - bestanden met een afbeeldingsextensie
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
