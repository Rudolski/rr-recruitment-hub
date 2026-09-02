import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type SessionContext = Awaited<ReturnType<typeof getSessionContext>>;

/**
 * Haalt de ingelogde gebruiker en zijn organisatielidmaatschap op.
 * Stuurt door naar /login als er geen sessie is.
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
