"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UNLOCK_COOKIE } from "@/lib/app-lock";

/** Logt de huidige gebruiker uit en stuurt terug naar /login. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Voorkomt dat een volgende inlog op ditzelfde toestel de
  // app-vergrendeling overslaat.
  (await cookies()).delete(UNLOCK_COOKIE);
  redirect("/login");
}
