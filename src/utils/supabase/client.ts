import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client voor gebruik in Client Components (browser).
 * Gebruikt uitsluitend de publieke anon key; nooit de service role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
