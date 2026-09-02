import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { FeeAgreementForm } from "../fee-agreement-form";
import { createFeeAfspraak } from "../actions";

export const metadata = {
  title: "Nieuwe fee-afspraak · RR Recruitment Hub",
};

export default async function NieuweFeeAfspraakPage() {
  const { supabase } = await getSessionContext();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/fee-afspraken" label="Fee-afspraken" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe fee-afspraak
      </h1>
      <div className="mt-6">
        <FeeAgreementForm
          action={createFeeAfspraak}
          clients={clients ?? []}
          submitLabel="Fee-afspraak opslaan"
        />
      </div>
    </div>
  );
}
