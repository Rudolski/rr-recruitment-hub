import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  th,
  thead,
} from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Vacancy } from "@/lib/types";
import { ForecastRow } from "./forecast-row";

export const metadata = { title: "Vacatures · RR Recruitment Hub" };

export default async function VacaturesPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Vacatures" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: vacancies, error }, { data: clients }] = await Promise.all([
    supabase
      .from("vacancies")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Vacancy[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Vacatures"
        description="Opdrachten per klant, met de forecastvelden voor het dashboard."
        action={
          <Link href="/vacatures/nieuw" className={btnPrimary}>
            Nieuwe vacature
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!vacancies || vacancies.length === 0) && (
        <div className={emptyState}>
          Nog geen vacatures.{" "}
          <Link
            href="/vacatures/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste toe
          </Link>
          .
        </div>
      )}

      {!error && vacancies && vacancies.length > 0 && (
        <>
          <p className="mt-4 text-xs text-zinc-400">
            Verwachte fee, maand en kans zijn hier direct aan te passen.
          </p>
          <div className={tableWrap}>
            <table className={table}>
              <thead className={thead}>
                <tr>
                  <th className={th}>Titel</th>
                  <th className={th}>Klant</th>
                  <th className={th}>Status</th>
                  <th className={th}>Verw. fee</th>
                  <th className={th}>Verw. maand</th>
                  <th className={th}>Kans %</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className={tbody}>
                {vacancies.map((v) => (
                  <ForecastRow
                    key={v.id}
                    vacancy={v}
                    clientName={clientName.get(v.client_id) ?? "—"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
