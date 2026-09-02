import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { btnDanger } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { FeeAgreement } from "@/lib/types";
import { FeeAgreementForm } from "../fee-agreement-form";
import { deleteFeeAfspraak, updateFeeAfspraak } from "../actions";

export const metadata = { title: "Fee-afspraak · RR Recruitment Hub" };

export default async function FeeAfspraakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const [{ data: agreement }, { data: clients }] = await Promise.all([
    supabase
      .from("fee_agreements")
      .select("*")
      .eq("id", id)
      .maybeSingle<FeeAgreement>(),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  if (!agreement) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/fee-afspraken" label="Fee-afspraken" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Fee-afspraak
      </h1>

      <div className="mt-6">
        <FeeAgreementForm
          action={updateFeeAfspraak}
          clients={clients ?? []}
          initial={agreement}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteFeeAfspraak}>
          <input type="hidden" name="id" value={agreement.id} />
          <button type="submit" className={btnDanger}>
            Fee-afspraak verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
