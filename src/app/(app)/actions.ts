"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/** Logt de huidige gebruiker uit en stuurt terug naar /login. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
