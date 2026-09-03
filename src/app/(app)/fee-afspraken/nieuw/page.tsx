import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { FeeAgreementForm } from "../fee-agreement-form";
import { createFeeAfspraak } from "../actions";

export const metadata = {
  title: "Nieuwe fee-afspraak · RR Recruitment Hub",
};

export default async function NieuweFeeAfspraakPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const sp = await searchParams;
  const klant = typeof sp.klant === "string" ? sp.klant : undefined;
  if (!klant) notFound();

  const [{ data: clients }, { data: client }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("clients").select("id, name").eq("id", klant).maybeSingle(),
  ]);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/klanten/${klant}`} label={client.name} />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        Nieuwe fee-afspraak
      </h1>
      <div className="mt-6">
        <FeeAgreementForm
          action={createFeeAfspraak}
          clients={clients ?? []}
          lockedClientId={klant}
          submitLabel="Fee-afspraak opslaan"
        />
      </div>
    </div>
  );
}
