import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { InvoiceForm } from "../invoice-form";
import { createFactuur } from "../actions";

export const metadata = { title: "Nieuwe factuurregel · RR Recruitment Hub" };

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const params = await searchParams;
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : undefined;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

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
          lockedPlacementId={str("placement")}
          defaultClientId={str("klant")}
          defaultVacancyLabel={str("vacature")}
          submitLabel="Factuurregel opslaan"
        />
      </div>
    </div>
  );
}
