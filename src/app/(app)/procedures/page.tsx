import Link from "next/link";
import { ForecastCards } from "@/components/forecast-cards";
import { PageHeader } from "@/components/page-header";
import { VacancyStatusBadge } from "@/components/status-badge";
import { emptyState, errorBox } from "@/components/ui";
import { eur, formatMonth, monthKey } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  VACANCY_KIND_LABELS,
  type Client,
  type MonthlyTarget,
  type Vacancy,
  type VacancyCandidate,
  type VacancyKind,
} from "@/lib/types";
import {
  byKindPerMonth,
  sumByMonth,
  vacancyContributions,
} from "@/lib/vacancy-forecast";
import { ProceduresGrid, type ProcedureRow } from "./procedures-grid";

export const metadata = { title: "Procedures · RR Recruitment Hub" };

const ACTIVE = new Set(["open", "concept", "on_hold"]);

const VACANCY_FIELDS =
  "id, title, client_id, status, kind, consultant, exclusivity_until, expected_fee, expected_close_month, success_probability";

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

  const now = new Date();
  const thisMonth = monthKey(now);
  const nextMonth = monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const forecastYears = [
    ...new Set([thisMonth, nextMonth].map((m) => Number(m.slice(0, 4)))),
  ];

  const [
    { data: candidates, error },
    { data: vacancies },
    { data: clients },
    { data: targets },
  ] = await Promise.all([
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
      .select(VACANCY_FIELDS)
      .returns<
        Pick<
          Vacancy,
          | "id"
          | "title"
          | "client_id"
          | "status"
          | "kind"
          | "consultant"
          | "exclusivity_until"
          | "expected_fee"
          | "expected_close_month"
          | "success_probability"
        >[]
      >(),
    supabase
      .from("clients")
      .select("id, name")
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("monthly_targets")
      .select("year, month, target_revenue")
      .in("year", forecastYears)
      .returns<Pick<MonthlyTarget, "year" | "month" | "target_revenue">[]>(),
  ]);

  const tableMissing =
    !!error && /vacancy_candidates|stage_date|column/.test(error.message);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const targetByMonth = new Map<string, number>(
    (targets ?? []).map((t) => [
      `${t.year}-${String(t.month).padStart(2, "0")}`,
      Number(t.target_revenue ?? 0),
    ]),
  );

  // Prognose telt over ALLE soorten — W&S én Interim/ZZP Marge, ongeacht
  // waar ze hieronder getoond worden.
  const contributions = vacancyContributions(vacancies ?? []);
  const forecastMonths = [thisMonth, nextMonth];
  const forecastTotals = sumByMonth(contributions, forecastMonths);
  const forecastByKind = byKindPerMonth(contributions, forecastMonths);

  const byVacancy = new Map<string, ProcedureRow["cands"]>();
  for (const c of candidates ?? []) {
    const list = byVacancy.get(c.vacancy_id) ?? [];
    list.push({
      id: c.id,
      first_name: c.first_name,
      stage: c.stage,
      stage_date: c.stage_date,
    });
    byVacancy.set(c.vacancy_id, list);
  }

  const active = (vacancies ?? []).filter(
    (v) => ACTIVE.has(v.status) || (byVacancy.get(v.id)?.length ?? 0) > 0,
  );

  // W&S: de visuele matrix met kandidaten per stap.
  const rows: ProcedureRow[] = active
    .filter((v) => (v.kind ?? "wervingsfee") === "wervingsfee")
    .map((v) => ({
      vacancyId: v.id,
      title: v.title,
      client: clientName.get(v.client_id) ?? "—",
      consultant: v.consultant,
      exclusivityUntil: v.exclusivity_until,
      expectedFee: v.expected_fee,
      successProbability: v.success_probability,
      cands: byVacancy.get(v.id) ?? [],
    }))
    .sort(
      (a, b) =>
        a.client.localeCompare(b.client, "nl") ||
        a.title.localeCompare(b.title, "nl"),
    );

  // Interim/ZZP Marge: geen kandidaat-procedure, wel forecast — los
  // eronder, zonder stappenkolommen.
  const otherKindRows = active
    .filter((v) => (v.kind ?? "wervingsfee") !== "wervingsfee")
    .sort(
      (a, b) =>
        (clientName.get(a.client_id) ?? "—").localeCompare(
          clientName.get(b.client_id) ?? "—",
          "nl",
        ) || a.title.localeCompare(b.title, "nl"),
    );

  return (
    <div className="mx-auto max-w-full">
      <PageHeader
        title="Procedures"
        description="Alle kandidaten per vacature, uitgezet over de stappen. Typ een voornaam om toe te voegen, pas naam of datum aan, of sleep een kaartje naar een andere stap."
      />

      <div className="mt-6">
        <ForecastCards
          months={forecastMonths}
          totals={forecastTotals}
          targets={targetByMonth}
          byKind={forecastByKind}
        />
      </div>

      {tableMissing && (
        <p className={`${errorBox} mt-6`}>
          Draai eerst{" "}
          <code>supabase/migrations/010_vacancy_board.sql</code> en{" "}
          <code>supabase/migrations/014_candidate_stage_date.sql</code>.
        </p>
      )}

      {!tableMissing && rows.length === 0 && (
        <div className={`${emptyState} mt-6`}>
          Geen openstaande W&amp;S-vacatures. Maak er eerst een aan onder{" "}
          <Link href="/vacatures" className="underline">
            Vacatures
          </Link>
          .
        </div>
      )}

      {!tableMissing && rows.length > 0 && (
        <div className="mt-6">
          <ProceduresGrid rows={rows} />
        </div>
      )}

      {!tableMissing && otherKindRows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Interim &amp; ZZP Marge
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Geen kandidaat-procedure, wel meegeteld in de prognose hierboven.
          </p>
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {otherKindRows.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <Link
                    href={`/vacatures/${v.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {v.title}
                  </Link>
                  <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {VACANCY_KIND_LABELS[(v.kind ?? "wervingsfee") as VacancyKind] ??
                      v.kind}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {clientName.get(v.client_id) ?? "—"}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-zinc-500">
                  <VacancyStatusBadge status={v.status} />
                  {v.expected_fee != null && (
                    <span className="tabular-nums">{eur(v.expected_fee)}</span>
                  )}
                  {v.expected_close_month && (
                    <span>{formatMonth(v.expected_close_month)}</span>
                  )}
                  {v.success_probability != null && (
                    <span>{v.success_probability}% kans</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
