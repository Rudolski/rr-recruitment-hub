import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import {
  eur,
  formatDate,
  formatMonth,
  MONTH_NAMES,
  pctLabel,
} from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  REALISED_INVOICE_STATUSES,
  type Client,
  type ClientNote,
  type Invoice,
  type MonthlyTarget,
  type Vacancy,
} from "@/lib/types";
import { nettoAmount, splitOmzet } from "@/lib/omzet";
import { RevenueChart } from "./revenue-chart";

export const metadata = { title: "Dashboard · RR Recruitment Hub" };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthlyBuckets(invoices: Invoice[]): number[] {
  const b = Array(13).fill(0) as number[];
  for (const inv of invoices) {
    if (!inv.issue_date) continue;
    const m = Number(inv.issue_date.slice(5, 7));
    b[m] += nettoAmount(inv);
  }
  return b;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Dashboard" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code> in de Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const num = (key: string, fallback: number) => {
    const v = typeof params[key] === "string" ? Number(params[key]) : NaN;
    return Number.isFinite(v) ? v : fallback;
  };

  const year = num("jaar", currentYear);
  let fromMonth = Math.min(12, Math.max(1, num("van", 1)));
  let toMonth = Math.min(12, Math.max(1, num("tm", 12)));
  if (fromMonth > toMonth) [fromMonth, toMonth] = [toMonth, fromMonth];
  const clientFilter =
    typeof params.klant === "string" && params.klant ? params.klant : null;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name")
    .returns<Pick<Client, "id" | "name">[]>();

  /* -------- Opvolgacties (komende 7 dagen + te laat) -------- */
  const weekAhead = new Date(now.getTime() + 7 * 864e5)
    .toISOString()
    .slice(0, 10);
  const { data: followUps } = await supabase
    .from("client_notes")
    .select("id, client_id, body, follow_up_on")
    .eq("follow_up_done", false)
    .not("follow_up_on", "is", null)
    .lte("follow_up_on", weekAhead)
    .order("follow_up_on", { ascending: true })
    .returns<
      Pick<ClientNote, "id" | "client_id" | "body" | "follow_up_on">[]
    >();
  const clientNameAll = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const todayStr = now.toISOString().slice(0, 10);

  async function realisedInvoices(from: string, to: string) {
    let q = supabase
      .from("invoices")
      .select("*")
      .in("status", REALISED_INVOICE_STATUSES)
      .gte("issue_date", from)
      .lte("issue_date", to);
    if (clientFilter) q = q.eq("client_id", clientFilter);
    const { data } = await q.returns<Invoice[]>();
    return data ?? [];
  }

  /* -------- Behaalde omzet in de gekozen periode -------- */
  const periodStart = `${year}-${String(fromMonth).padStart(2, "0")}-01`;
  const periodEnd = `${year}-${String(toMonth).padStart(2, "0")}-${String(
    lastDay(year, toMonth),
  ).padStart(2, "0")}`;

  const [periodInvoices, thisYearInvoices, lastYearInvoices] = await Promise.all([
    realisedInvoices(periodStart, periodEnd),
    realisedInvoices(`${year}-01-01`, `${year}-12-31`),
    realisedInvoices(`${year - 1}-01-01`, `${year - 1}-12-31`),
  ]);

  const omzet = splitOmzet(periodInvoices);

  /* -------- Grafiek: heel jaar t.o.v. vorig jaar en target -------- */

  let targetMonthly: number[] | null = null;
  if (!clientFilter) {
    const { data: targets, error: targetErr } = await supabase
      .from("monthly_targets")
      .select("*")
      .eq("year", year)
      .returns<MonthlyTarget[]>();
    if (!targetErr && targets && targets.length > 0) {
      const t = Array(13).fill(0) as number[];
      for (const row of targets) t[row.month] = Number(row.target_revenue ?? 0);
      targetMonthly = t;
    }
  }

  /* -------- Omzet t.o.v. target tot op heden (incl. lopende maand) -------- */
  const monthsElapsed =
    year < currentYear ? 12 : year > currentYear ? 0 : now.getMonth() + 1;
  const ytdBuckets = monthlyBuckets(thisYearInvoices);
  const ytdRevenue = ytdBuckets
    .slice(1, monthsElapsed + 1)
    .reduce((a, b) => a + b, 0);
  const ytdTarget = targetMonthly
    ? targetMonthly.slice(1, monthsElapsed + 1).reduce((a, b) => a + b, 0)
    : null;
  const ytdPct = ytdTarget != null ? pctLabel(ytdRevenue, ytdTarget) : null;
  const ytdDelta = ytdTarget != null ? ytdRevenue - ytdTarget : null;
  const ytdLabel =
    monthsElapsed === 0
      ? null
      : monthsElapsed >= 12
        ? `heel ${year}`
        : `t/m ${MONTH_NAMES[monthsElapsed]} ${year}`;

  /* -------- Prognose lopende + volgende maand -------- */
  const thisMonth = monthKey(now);
  const nextMonth = monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  let vacancyQuery = supabase
    .from("vacancies")
    .select("*")
    .eq("status", "open")
    .not("expected_fee", "is", null)
    .not("expected_close_month", "is", null)
    .not("success_probability", "is", null);
  if (clientFilter) vacancyQuery = vacancyQuery.eq("client_id", clientFilter);
  const { data: openVacancies } = await vacancyQuery.returns<Vacancy[]>();

  const contributions = (openVacancies ?? []).map((v) => ({
    vacancy: v,
    month: (v.expected_close_month ?? "").slice(0, 7),
    value:
      Number(v.expected_fee ?? 0) * (Number(v.success_probability ?? 0) / 100),
  }));

  const forecastThis = contributions
    .filter((c) => c.month === thisMonth)
    .reduce((s, c) => s + c.value, 0);
  const forecastNext = contributions
    .filter((c) => c.month === nextMonth)
    .reduce((s, c) => s + c.value, 0);

  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];
  const selectClass =
    "mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  const prognoseRows = contributions
    .filter((c) => c.month === thisMonth || c.month === nextMonth)
    .sort((a, b) => a.month.localeCompare(b.month));

  /* -------- Top klanten in de periode -------- */
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const revenueByClient = new Map<string, number>();
  for (const inv of periodInvoices) {
    revenueByClient.set(
      inv.client_id,
      (revenueByClient.get(inv.client_id) ?? 0) + nettoAmount(inv),
    );
  }
  const topClients = [...revenueByClient.entries()]
    .map(([cid, amount]) => ({
      id: cid,
      name: clientName.get(cid) ?? "—",
      amount,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const topMax = topClients[0]?.amount ?? 1;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Behaalde omzet (facturen vanaf verzonden, excl. btw) en de prognose voor de lopende en volgende maand."
      />

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Jaar</span>
          <select name="jaar" defaultValue={String(year)} className={selectClass}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Van maand</span>
          <select name="van" defaultValue={String(fromMonth)} className={selectClass}>
            {MONTH_NAMES.slice(1).map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Tot en met</span>
          <select name="tm" defaultValue={String(toMonth)} className={selectClass}>
            {MONTH_NAMES.slice(1).map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Klant</span>
          <select
            name="klant"
            defaultValue={clientFilter ?? ""}
            className={selectClass}
          >
            <option value="">Alle klanten</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Behaalde omzet (netto)
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(omzet.netto)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {MONTH_NAMES[fromMonth]}
            {fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""} {year} ·{" "}
            {omzet.count} facturen · bruto {eur(omzet.bruto)}
          </p>
          {omzet.partners.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              waarvan naar partners:{" "}
              {omzet.partners
                .map((p) => `${p.name} ${eur(p.amount)}`)
                .join(" · ")}
            </p>
          )}
          {ytdLabel && (
            <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                T.o.v. target ({ytdLabel})
              </p>
              <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                Behaald{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {eur(ytdRevenue)}
                </span>
                {ytdTarget != null && ytdPct && ytdDelta != null && (
                  <>
                    {" "}
                    · target {eur(ytdTarget)} ·{" "}
                    <span className={ytdPct.tone}>
                      {ytdDelta >= 0 ? "+" : "−"}
                      {eur(Math.abs(ytdDelta))} ({ytdPct.text})
                    </span>
                  </>
                )}
              </p>
              {ytdTarget == null && !clientFilter && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  Geen maandtargets voor {year}.{" "}
                  <Link href="/targets" className="underline">
                    Targets invullen
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Prognose {formatMonth(`${thisMonth}-01`)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(forecastThis)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">fee × slagingskans</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Prognose {formatMonth(`${nextMonth}-01`)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(forecastNext)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">fee × slagingskans</p>
        </div>
      </div>

      {followUps && followUps.length > 0 && (
        <section className="mt-8 rounded-lg border border-terra/40 bg-terra/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy dark:text-cream">
              Opvolgen ({followUps.length})
            </h2>
            <Link href="/acquisitie" className="text-xs text-terra underline">
              Naar acquisitie
            </Link>
          </div>
          <ul className="mt-2 space-y-1">
            {followUps.slice(0, 8).map((f) => {
              const overdue = (f.follow_up_on ?? "") < todayStr;
              return (
                <li key={f.id} className="flex gap-3 text-sm">
                  <span
                    className={`w-20 shrink-0 tabular-nums ${
                      overdue
                        ? "font-medium text-red-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {formatDate(f.follow_up_on)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <Link
                      href={`/klanten/${f.client_id}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {clientNameAll.get(f.client_id) ?? "Klant"}
                    </Link>
                    <span className="ml-2 text-zinc-500">{f.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <RevenueChart
        year={year}
        thisYear={monthlyBuckets(thisYearInvoices)}
        lastYear={monthlyBuckets(lastYearInvoices)}
        target={targetMonthly}
      />

      {topClients.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Top klanten ({MONTH_NAMES[fromMonth]}
            {fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""} {year})
          </h2>
          <ul className="mt-3 space-y-1.5">
            {topClients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/rapportages/omzet-per-klant/${c.id}?jaar=${year}`}
                  className="group flex items-center gap-3"
                >
                  <span className="w-40 shrink-0 truncate text-sm text-navy group-hover:text-terra dark:text-cream">
                    {c.name}
                  </span>
                  <span className="relative h-5 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <span
                      className="absolute inset-y-0 left-0 rounded bg-terra/70"
                      style={{ width: `${(c.amount / topMax) * 100}%` }}
                    />
                  </span>
                  <span className="w-28 shrink-0 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                    {eur(c.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Klik een klant aan voor de opbouw (facturen en plaatsingen).
          </p>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Vacatures in de prognose
          </h2>
          <p className="text-sm text-zinc-500">
            Totaal {formatMonth(`${thisMonth}-01`)}:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {eur(forecastThis)}
            </span>{" "}
            · {formatMonth(`${nextMonth}-01`)}:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {eur(forecastNext)}
            </span>
          </p>
        </div>

        {prognoseRows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Geen open vacatures met verwachte fee, maand en slagingskans voor
            deze twee maanden.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {prognoseRows.map(({ vacancy, month, value }) => (
              <li
                key={vacancy.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <Link
                  href={`/vacatures/${vacancy.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {vacancy.title}
                </Link>
                <span className="flex items-center gap-4 text-zinc-500">
                  <span>{formatMonth(`${month}-01`)}</span>
                  <span>
                    {eur(vacancy.expected_fee)} × {vacancy.success_probability}%
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {eur(value)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
