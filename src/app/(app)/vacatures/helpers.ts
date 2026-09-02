import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { eur } from "@/lib/format";
import {
  FEE_AGREEMENT_TYPE_LABELS,
  type Client,
  type FeeAgreement,
} from "@/lib/types";

/** Labels voor de fee-afspraak-dropdown in het vacatureformulier. */
export async function loadFeeAgreementOptions(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; label: string }[]> {
  const [{ data: agreements }, { data: clients }] = await Promise.all([
    supabase
      .from("fee_agreements")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<FeeAgreement[]>(),
    supabase.from("clients").select("id, name").returns<
      Pick<Client, "id" | "name">[]
    >(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (agreements ?? []).map((fa) => {
    const type =
      FEE_AGREEMENT_TYPE_LABELS[
        fa.type as keyof typeof FEE_AGREEMENT_TYPE_LABELS
      ] ?? fa.type;
    const value =
      fa.type === "percentage"
        ? fa.percentage != null
          ? `${fa.percentage}%`
          : ""
        : fa.type === "vast_bedrag"
          ? eur(fa.fixed_amount)
          : "";
    return {
      id: fa.id,
      label: `${clientName.get(fa.client_id) ?? "Klant"} — ${type}${
        value ? ` ${value}` : ""
      }`,
    };
  });
}
