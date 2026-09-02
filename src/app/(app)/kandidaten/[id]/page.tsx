import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { btnDanger } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Application, Candidate, Vacancy } from "@/lib/types";
import { ApplicationStageBadge } from "@/components/status-badge";
import { CandidateForm } from "../candidate-form";
import { deleteKandidaat, updateKandidaat } from "../actions";

export const metadata = { title: "Kandidaat · RR Recruitment Hub" };

export default async function KandidaatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle<Candidate>();

  if (!candidate) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false })
    .returns<Application[]>();

  const vacancyIds = [...new Set((applications ?? []).map((a) => a.vacancy_id))];
  const { data: vacancies } = vacancyIds.length
    ? await supabase
        .from("vacancies")
        .select("id, title")
        .in("id", vacancyIds)
        .returns<Pick<Vacancy, "id" | "title">[]>()
    : { data: [] as Pick<Vacancy, "id" | "title">[] };
  const vacancyTitle = new Map((vacancies ?? []).map((v) => [v.id, v.title]));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/kandidaten" label="Kandidaten" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {candidate.name}
      </h1>

      <div className="mt-6">
        <CandidateForm
          action={updateKandidaat}
          initial={candidate}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Sollicitatieprocedures
        </h2>
        {!applications || applications.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Deze kandidaat is nog niet aan een vacature gekoppeld. Dat doe je
            vanuit de vacature.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {applications.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span>{vacancyTitle.get(a.vacancy_id) ?? "Vacature"}</span>
                <span className="flex items-center gap-3">
                  <ApplicationStageBadge stage={a.stage} />
                  <span className="text-xs text-zinc-400">
                    {formatDate(a.stage_updated_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteKandidaat}>
          <input type="hidden" name="id" value={candidate.id} />
          <button type="submit" className={btnDanger}>
            Kandidaat verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
