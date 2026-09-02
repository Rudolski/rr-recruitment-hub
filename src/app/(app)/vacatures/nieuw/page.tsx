import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { VacancyForm } from "../vacancy-form";
import { createVacature } from "../actions";
import { loadFeeAgreementOptions } from "../helpers";

export const metadata = { title: "Nieuwe vacature · RR Recruitment Hub" };

export default async function NieuweVacaturePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const params = await searchParams;
  const lockedClientId =
    typeof params.klant === "string" ? params.klant : undefined;

  const [{ data: clients }, feeAgreements] = await Promise.all([
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
    loadFeeAgreementOptions(supabase),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/vacatures" label="Vacatures" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe vacature
      </h1>
      <div className="mt-6">
        <VacancyForm
          action={createVacature}
          clients={clients ?? []}
          feeAgreements={feeAgreements}
          lockedClientId={lockedClientId}
          submitLabel="Vacature opslaan"
        />
      </div>
    </div>
  );
}
