import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { InvoiceForm } from "../invoice-form";
import { createFactuur } from "../actions";
import { loadPlacementOptions } from "../helpers";

export const metadata = { title: "Nieuwe factuurregel · RR Recruitment Hub" };

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const params = await searchParams;
  const lockedPlacementId =
    typeof params.placement === "string" ? params.placement : undefined;
  const defaultClientId =
    typeof params.klant === "string" ? params.klant : undefined;

  const [{ data: clients }, placements] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    loadPlacementOptions(supabase),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/facturen" label="Facturen" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        Nieuwe factuurregel
      </h1>
      <div className="mt-6">
        <InvoiceForm
          action={createFactuur}
          clients={clients ?? []}
          placements={placements}
          lockedPlacementId={lockedPlacementId}
          defaultClientId={defaultClientId}
          submitLabel="Factuurregel opslaan"
        />
      </div>
    </div>
  );
}
