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
import { VacancyStatusBadge } from "@/components/status-badge";
import { eur, formatMonth, monthKey } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  VACANCY_STATUSES,
  VACANCY_STATUS_LABELS,
  isOneOf,
  type Client,
  type MonthlyTarget,
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

  // Gewogen prognose (verwachte fee × slagingskans) voor de lopende en
  // volgende maand, op basis van de openstaande vacatures.
  const now = new Date();
  const thisMonth = monthKey(now);
  const nextMonth = monthKey(
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  );
  const forecastYears = [
    ...new Set([thisMonth, nextMonth].map((m) => Number(m.slice(0, 4)))),
  ];

  const [{ data: vacancies, error }, { data: clients }, { data: targets }] =
    await Promise.all([
      vq.returns<Vacancy[]>(),
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

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const targetByMonth = new Map<string, number>(
    (targets ?? []).map((t) => [
      `${t.year}-${String(t.month).padStart(2, "0")}`,
      Number(t.target_revenue ?? 0),
    ]),
  );
  const forecast = { [thisMonth]: 0, [nextMonth]: 0 } as Record<string, number>;
  for (const v of vacancies ?? []) {
    if (v.status !== "open") continue;
    const month = (v.expected_close_month ?? "").slice(0, 7);
    if (month !== thisMonth && month !== nextMonth) continue;
    if (v.expected_fee == null || v.success_probability == null) continue;
    forecast[month] +=
      Number(v.expected_fee) * (Number(v.success_probability) / 100);
  }

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

      {status === "open" && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[thisMonth, nextMonth].map((label) => {
            const value = forecast[label];
            const target = targetByMonth.get(label) ?? null;
            const onOrAboveTarget = target != null && value >= target;
            const belowTarget = target != null && value < target;
            const valueClass = onOrAboveTarget
              ? "text-green-600 dark:text-green-500"
              : belowTarget
                ? "text-red-600 dark:text-red-500"
                : "text-zinc-900 dark:text-zinc-50";
            return (
              <div
                key={label}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Prognose {formatMonth(`${label}-01`)}
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${valueClass}`}
                >
                  {eur(value)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  fee × slagingskans
                  {target != null && (
                    <>
                      {" · target "}
                      {eur(target)}
                      {" · "}
                      {value - target >= 0 ? "+" : "−"}
                      {eur(Math.abs(value - target))}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Mobiel: kaart per vacature (aanpassen via de detailpagina) */}
      {!error && vacancies && vacancies.length > 0 && (
        <ul className="mt-4 space-y-2 md:hidden">
          {vacancies.map((v) => (
            <li
              key={v.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/vacatures/${v.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {v.title}
                </Link>
                <VacancyStatusBadge status={v.status} />
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {clientName.get(v.client_id) ?? "—"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-500">
                {v.expected_fee != null && (
                  <span className="tabular-nums">
                    {eur(v.expected_fee)}
                  </span>
                )}
                {v.expected_close_month && (
                  <span>{formatMonth(v.expected_close_month)}</span>
                )}
                {v.success_probability != null && (
                  <span>{v.success_probability}% kans</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Tablet en breder: tabel met direct-bewerkbare velden */}
      {!error && vacancies && vacancies.length > 0 && (
        <div className={`${tableWrap} hidden md:block`}>
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
