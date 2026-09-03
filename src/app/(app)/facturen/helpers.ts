import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Client, Placement } from "@/lib/types";

/**
 * Leesbare labels voor de placement-dropdown in het factuurformulier:
 * "Kandidaat — Klant".
 */
export async function loadPlacementOptions(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; name: string }[]> {
  const [{ data: placements }, { data: clients }] = await Promise.all([
    supabase
      .from("placements")
      .select("id, candidate_name, client_id, start_date")
      .order("start_date", { ascending: false, nullsFirst: false })
      .returns<
        Pick<
          Placement,
          "id" | "candidate_name" | "client_id" | "start_date"
        >[]
      >(),
    supabase.from("clients").select("id, name").returns<
      Pick<Client, "id" | "name">[]
    >(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (placements ?? []).map((p) => ({
    id: p.id,
    name: `${p.candidate_name ?? "Kandidaat"} — ${
      clientName.get(p.client_id) ?? "Klant"
    }`,
  }));
}
