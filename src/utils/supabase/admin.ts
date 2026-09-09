import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Supabase-client met de service role key. Omzeilt RLS en heeft geen
 * gebruikerssessie — uitsluitend voor server-side achtergrondtaken
 * (de dagelijkse vacature-scan via de cron-route).
 *
 * NOOIT importeren in een client component of een route die met
 * gebruikersinvoer werkt.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY of NEXT_PUBLIC_SUPABASE_URL ontbreekt (server-side).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
