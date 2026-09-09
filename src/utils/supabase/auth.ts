import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type SessionContext = Awaited<ReturnType<typeof getSessionContext>>;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Dwingt tweestapsverificatie af. Zolang de sessie niet op `aal2` staat
 * (geen MFA-factor, of factor nog niet bevestigd deze sessie) gaat de
 * gebruiker naar /mfa om zich in te schrijven of de code in te voeren.
 *
 * De /mfa-route zelf roept dit NIET aan, anders ontstaat een lus.
 */
export async function requireMfaOrRedirect(supabase: ServerSupabase) {
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Alleen doorsturen als we zeker weten dat de sessie te laag is.
  if (aal && aal.currentLevel !== "aal2") {
    redirect("/mfa");
  }
}

/**
 * Haalt de ingelogde gebruiker en zijn organisatielidmaatschap op.
 * Stuurt door naar /login als er geen sessie is en naar /mfa als de
 * tweede factor nog niet is voltooid.
 *
 * `organizationId` is null als de gebruiker wel is ingelogd maar nog
 * niet aan een organisatie gekoppeld is (zie supabase/seed.sql).
 */
export async function getSessionContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await requireMfaOrRedirect(supabase);

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    organizationId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
}
