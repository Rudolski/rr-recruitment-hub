import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PlacementStatusBadge } from "@/components/status-badge";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { eur, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Placement, Vacancy } from "@/lib/types";

export const metadata = { title: "Placements · RR Recruitment Hub" };

export default async function PlacementsPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Placements" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: placements, error }, { data: clients }, { data: vacancies }] =
    await Promise.all([
      supabase
        .from("placements")
        .select("*")
        .order("start_date", { ascending: false, nullsFirst: false })
        .returns<Placement[]>(),
      supabase.from("clients").select("id, name").returns<
        Pick<Client, "id" | "name">[]
      >(),
      supabase.from("vacancies").select("id, title").returns<
        Pick<Vacancy, "id" | "title">[]
      >(),
    ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const vacancyTitle = new Map((vacancies ?? []).map((v) => [v.id, v.title]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Placements"
        description="Geplaatste kandidaten met fee, startdatum en garantie."
        action={
          <Link href="/placements/nieuw" className={btnPrimary}>
            Nieuwe placement
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!placements || placements.length === 0) && (
        <div className={emptyState}>
          Nog geen placements.{" "}
          <Link
            href="/placements/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Leg de eerste vast
          </Link>
          .
        </div>
      )}

      {!error && placements && placements.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Kandidaat</th>
                <th className={th}>Klant</th>
                <th className={th}>Vacature</th>
                <th className={th}>Start</th>
                <th className={th}>Fee</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {placements.map((p) => (
                <tr key={p.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/placements/${p.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {p.candidate_name ?? "—"}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {clientName.get(p.client_id) ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {vacancyTitle.get(p.vacancy_id) ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {formatDate(p.start_date)}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {eur(p.fee_amount)}
                  </td>
                  <td className={td}>
                    <PlacementStatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
