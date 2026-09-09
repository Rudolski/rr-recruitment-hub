"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type MfaState = { error: string | null };

/**
 * Bevestigt een TOTP-code (zowel bij het inschrijven van een nieuwe
 * factor als bij het inloggen). Draait volledig server-side: de
 * @supabase/ssr server-client schrijft de opgewaardeerde (aal2) sessie
 * terug naar de cookies, waarna het app-gedeelte toegankelijk is.
 */
export async function verifyMfa(
  _prev: MfaState,
  fd: FormData,
): Promise<MfaState> {
  const factorId = String(fd.get("factor_id") ?? "");
  // Authenticator-apps tonen de code soms met een spatie ("123 456").
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");

  if (!factorId) return { error: "Onbekende factor. Herlaad de pagina." };
  if (!/^\d{6}$/.test(code)) return { error: "Voer de 6-cijferige code in." };

  const supabase = await createClient();

  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challenge) {
    return {
      error: challengeErr?.message ?? "Kon de verificatie niet starten.",
    };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) {
    return { error: "Code klopt niet. Probeer de nieuwste code uit je app." };
  }

  redirect("/dashboard");
}
