import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { btnDanger } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Application, Candidate, Client, Vacancy } from "@/lib/types";
import { VacancyForm } from "../vacancy-form";
import { deleteVacature, updateVacature } from "../actions";
import { loadFeeAgreementOptions } from "../helpers";
import { Pipeline, type PipelineRow } from "./pipeline";

export const metadata = { title: "Vacature · RR Recruitment Hub" };

export default async function VacatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: vacancy } = await supabase
    .from("vacancies")
    .select("*")
    .eq("id", id)
    .maybeSingle<Vacancy>();

  if (!vacancy) notFound();

  const [
    { data: clients },
    { data: applications },
    { data: candidates },
    feeAgreements,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("applications")
      .select("*")
      .eq("vacancy_id", id)
      .order("created_at", { ascending: true })
      .returns<Application[]>(),
    supabase
      .from("candidates")
      .select("id, name")
      .order("name", { ascending: true })
      .returns<Pick<Candidate, "id" | "name">[]>(),
    loadFeeAgreementOptions(supabase),
  ]);

  const candidateName = new Map((candidates ?? []).map((c) => [c.id, c.name]));
  const rows: PipelineRow[] = (applications ?? []).map((a) => ({
    id: a.id,
    candidateId: a.candidate_id,
    candidateName: candidateName.get(a.candidate_id) ?? "Kandidaat",
    stage: a.stage,
  }));
  const usedCandidateIds = new Set(rows.map((r) => r.candidateId));
  const addableCandidates = (candidates ?? []).filter(
    (c) => !usedCandidateIds.has(c.id),
  );

  const clientName =
    (clients as Pick<Client, "id" | "name">[] | null)?.find(
      (c) => c.id === vacancy.client_id,
    )?.name ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/vacatures" label="Vacatures" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {vacancy.title}
      </h1>
      {clientName && (
        <p className="mt-1 text-sm text-zinc-500">
          <Link
            href={`/klanten/${vacancy.client_id}`}
            className="hover:underline"
          >
            {clientName}
          </Link>
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Sollicitatieprocedure
        </h2>
        <Pipeline
          vacancyId={vacancy.id}
          rows={rows}
          addableCandidates={addableCandidates}
        />
      </section>

      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Gegevens
        </h2>
        <VacancyForm
          action={updateVacature}
          clients={clients ?? []}
          feeAgreements={feeAgreements}
          initial={vacancy}
          submitLabel="Wijzigingen opslaan"
        />
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteVacature}>
          <input type="hidden" name="id" value={vacancy.id} />
          <button type="submit" className={btnDanger}>
            Vacature verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
