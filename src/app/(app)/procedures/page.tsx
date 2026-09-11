import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { emptyState, errorBox } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Vacancy, VacancyCandidate } from "@/lib/types";
import { ProceduresGrid, type ProcedureRow } from "./procedures-grid";

export const metadata = { title: "Procedures · RR Recruitment Hub" };

const ACTIVE = new Set(["open", "concept", "on_hold"]);

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
        .select(
          "id, title, client_id, status, consultant, exclusivity_until, kind",
        )
        .returns<
          Pick<
            Vacancy,
            | "id"
            | "title"
            | "client_id"
            | "status"
            | "consultant"
            | "exclusivity_until"
            | "kind"
          >[]
        >(),
      supabase
        .from("clients")
        .select("id, name")
        .returns<Pick<Client, "id" | "name">[]>(),
    ]);

  const tableMissing =
    !!error && /vacancy_candidates|stage_date|column/.test(error.message);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

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

  const rows: ProcedureRow[] = (vacancies ?? [])
    .filter(
      (v) => ACTIVE.has(v.status) || (byVacancy.get(v.id)?.length ?? 0) > 0,
    )
    .map((v) => ({
      vacancyId: v.id,
      title: v.title,
      client: clientName.get(v.client_id) ?? "—",
      consultant: v.consultant,
      exclusivityUntil: v.exclusivity_until,
      kind: v.kind,
      cands: byVacancy.get(v.id) ?? [],
    }))
    .sort(
      (a, b) =>
        a.client.localeCompare(b.client, "nl") ||
        a.title.localeCompare(b.title, "nl"),
    );

  return (
    <div className="mx-auto max-w-full">
      <PageHeader
        title="Procedures"
        description="Alle kandidaten per vacature, uitgezet over de stappen. Typ een voornaam om toe te voegen, pas naam of datum aan, of sleep een kaartje naar een andere stap."
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
          Geen openstaande vacatures. Maak er eerst een aan onder{" "}
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
    </div>
  );
}
