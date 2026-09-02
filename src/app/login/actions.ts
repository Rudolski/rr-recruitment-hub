"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginState = { error: string | null };

/**
 * Server action voor het inlogformulier. Wordt aangeroepen via
 * `useActionState` in de client component.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawRedirect = String(formData.get("redirect") ?? "/dashboard");
  const redirectTo = rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  if (!email || !password) {
    return { error: "Vul je e-mailadres en wachtwoord in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: "Inloggen mislukt. Controleer je e-mailadres en wachtwoord.",
    };
  }

  // redirect() gooit een speciale fout die Next.js afhandelt; buiten
  // een try/catch laten staan.
  redirect(redirectTo);
}
