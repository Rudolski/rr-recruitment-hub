import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { emptyState, errorBox, tableWrap } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABELS,
  type Client,
  type Vacancy,
  type VacancyCandidate,
} from "@/lib/types";

export const metadata = { title: "Procedures · RR Recruitment Hub" };

export default async function ProceduresPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Procedures" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const [{ data: candidates, error }, { data: vacancies }, { data: clients }] =
    await Promise.all([
      supabase
        .from("vacancy_candidates")
        .select("id, vacancy_id, first_name, stage, stage_date")
        .order("created_at", { ascending: true })
        .returns<
          Pick<
            VacancyCandidate,
            "id" | "vacancy_id" | "first_name" | "stage" | "stage_date"
          >[]
        >(),
      supabase
        .from("vacancies")
        .select("id, title, client_id, status")
        .returns<Pick<Vacancy, "id" | "title" | "client_id" | "status">[]>(),
      supabase
        .from("clients")
        .select("id, name")
        .returns<Pick<Client, "id" | "name">[]>(),
    ]);

  const tableMissing =
    !!error && /vacancy_candidates|stage_date/.test(error.message);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const vacancyById = new Map((vacancies ?? []).map((v) => [v.id, v]));

  const byVacancy = new Map<
    string,
    Pick<VacancyCandidate, "id" | "first_name" | "stage" | "stage_date">[]
  >();
  for (const c of candidates ?? []) {
    if (!vacancyById.has(c.vacancy_id)) continue;
    const list = byVacancy.get(c.vacancy_id) ?? [];
    list.push(c);
    byVacancy.set(c.vacancy_id, list);
  }

  const rows = [...byVacancy.entries()]
    .map(([vacancyId, cands]) => {
      const v = vacancyById.get(vacancyId)!;
      return {
        vacancyId,
        title: v.title,
        client: clientName.get(v.client_id) ?? "—",
        cands,
      };
    })
    .sort(
      (a, b) =>
        a.client.localeCompare(b.client, "nl") ||
        a.title.localeCompare(b.title, "nl"),
    );

  const headBase =
    "border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left align-bottom text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900";
  const cellBase =
    "border-b border-zinc-100 px-3 py-3 align-top dark:border-zinc-800";
  const stickyHead = `${headBase} sticky left-0 z-20 min-w-[11rem] border-r`;
  const stickyCell = `${cellBase} sticky left-0 z-10 min-w-[11rem] border-r bg-white dark:bg-zinc-950`;

  return (
    <div className="mx-auto max-w-full">
      <PageHeader
        title="Procedures"
        description="Alle kandidaten per vacature, uitgezet over de stappen. Toevoegen en de datum zetten doe je op de vacaturepagina zelf."
      />

      {tableMissing && (
        <p className={errorBox}>
          Draai eerst{" "}
          <code>supabase/migrations/010_vacancy_board.sql</code> en{" "}
          <code>supabase/migrations/014_candidate_stage_date.sql</code>.
        </p>
      )}

      {!tableMissing && rows.length === 0 && (
        <div className={emptyState}>
          Nog geen kandidaten in een procedure. Voeg ze toe op een{" "}
          <Link href="/vacatures" className="underline">
            vacaturepagina
          </Link>
          .
        </div>
      )}

      {!tableMissing && rows.length > 0 && (
        <div className={`${tableWrap}`}>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={stickyHead}>Vacature</th>
                {CANDIDATE_STAGES.map((s) => (
                  <th key={s} className={`${headBase} min-w-[9rem]`}>
                    {CANDIDATE_STAGE_LABELS[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vacancyId}>
                  <td className={stickyCell}>
                    <span className="block text-xs text-zinc-500">
                      {r.client}
                    </span>
                    <Link
                      href={`/vacatures/${r.vacancyId}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {r.title}
                    </Link>
                  </td>
                  {CANDIDATE_STAGES.map((s) => {
                    const inStage = r.cands.filter((c) => c.stage === s);
                    return (
                      <td key={s} className={cellBase}>
                        {inStage.length === 0 ? (
                          <span className="text-zinc-300 dark:text-zinc-700">
                            —
                          </span>
                        ) : (
                          <ul className="space-y-1.5">
                            {inStage.map((c) => (
                              <li key={c.id}>
                                <span className="text-zinc-800 dark:text-zinc-200">
                                  {c.first_name}
                                </span>
                                {c.stage_date && (
                                  <span className="block text-[11px] text-zinc-400">
                                    {formatDate(c.stage_date)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
