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
import {
  VACANCY_STATUSES,
  VACANCY_STATUS_LABELS,
  isOneOf,
  type Client,
  type Vacancy,
} from "@/lib/types";
import { ForecastRow } from "./forecast-row";

export const metadata = { title: "Vacatures · RR Recruitment Hub" };

export default async function VacaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Vacatures" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  // Standaard alleen openstaande vacatures; ?status=alle toont alles.
  const statusParam =
    typeof sp.status === "string" ? sp.status : "open";
  const status =
    statusParam === "alle"
      ? "alle"
      : isOneOf(VACANCY_STATUSES, statusParam)
        ? statusParam
        : "open";

  let vq = supabase
    .from("vacancies")
    .select("*")
    .order("created_at", { ascending: false });
  if (status !== "alle") vq = vq.eq("status", status);

  const [{ data: vacancies, error }, { data: clients }] = await Promise.all([
    vq.returns<Vacancy[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={status === "open" ? "Vacatures openstaand" : "Vacatures"}
        description="Verwachte fee, maand en kans zijn hier direct aan te passen."
        action={
          <Link href="/vacatures/nieuw" className={btnPrimary}>
            Nieuwe vacature
          </Link>
        }
      />

      <form className="mt-6 flex items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {VACANCY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VACANCY_STATUS_LABELS[s]}
              </option>
            ))}
            <option value="alle">Alle</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!vacancies || vacancies.length === 0) && (
        <div className={emptyState}>
          {status === "alle" ? (
            <>
              Nog geen vacatures.{" "}
              <Link
                href="/vacatures/nieuw"
                className="font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Voeg de eerste toe
              </Link>
              .
            </>
          ) : (
            "Geen vacatures met deze status."
          )}
        </div>
      )}

      {!error && vacancies && vacancies.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Klant</th>
                <th className={th}>Status</th>
                <th className={th}>Consultant</th>
                <th className={th}>Partner %</th>
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
      )}
    </div>
  );
}
