import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { btnGhost, errorBox } from "@/components/ui";
import {
  eur,
  formatMonth,
  MONTH_NAMES,
  pctLabel,
  QUARTER_OF_MONTH,
} from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  INVOICE_KINDS,
  INVOICE_KIND_LABELS,
  REALISED_INVOICE_STATUSES,
  VACANCY_KIND_LABELS,
  WS_INVOICE_KINDS,
  type Client,
  type Invoice,
  type MonthlyTarget,
  type Vacancy,
  type VacancyKind,
} from "@/lib/types";
import { averageWsFee, nettoAmount, splitOmzet } from "@/lib/omzet";
import { RevenueChart } from "./revenue-chart";

export const metadata = { title: "Dashboard · RR Recruitment Hub" };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const wsKindSet = new Set<string>(WS_INVOICE_KINDS);

function monthlyBuckets(invoices: Invoice[], wsOnly = false): number[] {
  const b = Array(13).fill(0) as number[];
  for (const inv of invoices) {
    if (!inv.issue_date) continue;
    if (wsOnly && !wsKindSet.has(inv.kind ?? "wervingsfee")) continue;
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
  const inclPartner = params.partner === "1";

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name")
    .returns<Pick<Client, "id" | "name">[]>();

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

  async function commitmentInvoices() {
    let q = supabase
      .from("invoices")
      .select("*")
      .in("status", REALISED_INVOICE_STATUSES)
      .eq("kind", "commitment");
    if (clientFilter) q = q.eq("client_id", clientFilter);
    const { data } = await q.returns<Invoice[]>();
    return data ?? [];
  }

  async function allRealisedInvoicesEver() {
    let q = supabase.from("invoices").select("*").in("status", REALISED_INVOICE_STATUSES);
    if (clientFilter) q = q.eq("client_id", clientFilter);
    const { data } = await q.returns<Invoice[]>();
    return data ?? [];
  }

  const [periodInvoices, allInvoicesEver, commitmentPool] = await Promise.all([
    realisedInvoices(periodStart, periodEnd),
    allRealisedInvoicesEver(),
    commitmentInvoices(),
  ]);
  // Alle facturen van het gekozen jaar (alle soorten) — voor de
  // target-kaarten en de grafiek, volgt dus gewoon het jaarfilter.
  const yearInvoices = allInvoicesEver.filter(
    (inv) => inv.issue_date?.slice(0, 4) === String(year),
  );

  const omzet = splitOmzet(periodInvoices);
  const wsFee = averageWsFee(periodInvoices, commitmentPool, { inclPartner });
  const omzetBreakdown = (
    [
      ["wervingsfee", omzet.byKind.wervingsfee],
      ["commitment", omzet.byKind.commitment],
      ["interim", omzet.byKind.interim],
      ["zzp_marge", omzet.byKind.zzp_marge],
    ] as const
  ).filter(([, v]) => Math.abs(v) > 0.5);
  const periodLabel = `${MONTH_NAMES[fromMonth]}${
    fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""
  } ${year}`;

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

  /* -------- Omzet t.o.v. target: per kwartaal + jaar van het gekozen
     jaar (alle soorten). Volgt dus gewoon het jaarfilter hierboven. -------- */
  const currentRealMonth = now.getMonth() + 1;
  const currentRealQuarter = QUARTER_OF_MONTH[currentRealMonth];
  const isCurrentYear = year === currentYear;

  // Alle soorten tellen mee (geen wsOnly) — dit is totale omzet t.o.v. target.
  const yearBuckets = monthlyBuckets(yearInvoices);
  const quarterCards = [1, 2, 3, 4].map((q) => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(
      (m) => QUARTER_OF_MONTH[m] === q,
    );
    const behaald = months.reduce((s, m) => s + yearBuckets[m], 0);
    const target = targetMonthly
      ? months.reduce((s, m) => s + (targetMonthly![m] ?? 0), 0)
      : 0;
    return { q, behaald, target };
  });
  const jaarBehaald = yearBuckets.slice(1, 13).reduce((a, b) => a + b, 0);
  const jaarTarget = targetMonthly
    ? targetMonthly.slice(1, 13).reduce((a, b) => a + b, 0)
    : 0;

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

  const weightedThis = contributions
    .filter((c) => c.month === thisMonth)
    .reduce((s, c) => s + c.value, 0);
  const forecastNext = contributions
    .filter((c) => c.month === nextMonth)
    .reduce((s, c) => s + c.value, 0);

  // Uitsplitsing per vacaturesoort, voor onder de prognosecijfers.
  function byKind(month: string) {
    const out: Record<string, number> = {};
    for (const c of contributions) {
      if (c.month !== month) continue;
      const kind = c.vacancy.kind ?? "wervingsfee";
      out[kind] = (out[kind] ?? 0) + c.value;
    }
    return Object.entries(out).filter(([, v]) => Math.abs(v) > 0.5);
  }
  const forecastByKind = {
    [thisMonth]: byKind(thisMonth),
    [nextMonth]: byKind(nextMonth),
  } as Record<string, [string, number][]>;

  // Prognose lopende maand telt óók de al gerealiseerde facturen van
  // deze maand mee — die omzet staat 100% vast.
  const monthEnd = lastDay(now.getFullYear(), now.getMonth() + 1);
  const thisMonthInvoices = await realisedInvoices(
    `${thisMonth}-01`,
    `${thisMonth}-${String(monthEnd).padStart(2, "0")}`,
  );
  const realisedThisMonth = thisMonthInvoices.reduce(
    (s, inv) => s + nettoAmount(inv),
    0,
  );
  const forecastThis = weightedThis + realisedThisMonth;

  /* -------- Targets voor de prognosemaanden -------- */
  const forecastTargets = new Map<string, number>();
  if (!clientFilter) {
    const fcYears = [
      ...new Set([thisMonth, nextMonth].map((m) => Number(m.slice(0, 4)))),
    ];
    const { data: fcT } = await supabase
      .from("monthly_targets")
      .select("year, month, target_revenue")
      .in("year", fcYears)
      .returns<Pick<MonthlyTarget, "year" | "month" | "target_revenue">[]>();
    for (const row of fcT ?? []) {
      forecastTargets.set(
        `${row.year}-${String(row.month).padStart(2, "0")}`,
        Number(row.target_revenue ?? 0),
      );
    }
  }

  // Groen op/boven target, rood eronder, neutraal als er geen target is.
  const toneVsTarget = (value: number, target: number | null | undefined) =>
    target == null
      ? "text-zinc-900 dark:text-zinc-50"
      : value >= target
        ? "text-green-600 dark:text-green-500"
        : "text-red-600 dark:text-red-500";

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
    const amount = inclPartner ? Number(inv.amount_excl_btw) : nettoAmount(inv);
    revenueByClient.set(
      inv.client_id,
      (revenueByClient.get(inv.client_id) ?? 0) + amount,
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

  /* -------- Grafiek: alle jaren met data, W&S-omzet -------- */
  const chartYears = new Set<number>([year]);
  for (const inv of allInvoicesEver) {
    if (inv.issue_date) chartYears.add(Number(inv.issue_date.slice(0, 4)));
  }
  const chartSeries = [...chartYears].sort((a, b) => a - b).map((y) => ({
    year: y,
    data: monthlyBuckets(
      allInvoicesEver.filter((inv) => inv.issue_date?.slice(0, 4) === String(y)),
      true,
    ),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Behaalde omzet (facturen vanaf verzonden, excl. btw) en de prognose voor de lopende en volgende maand."
        action={
          <Link href="/targets" className={btnGhost}>
            Targets aanpassen
          </Link>
        }
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="partner"
            value="1"
            defaultChecked={inclPartner}
          />
          <span>Incl. partnerdeel (fee/plaatsing en top klanten)</span>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Prognose (lopende + volgende maand)
          <span className="ml-2 text-xs font-normal text-zinc-400">
            altijd de actuele maand, ongeacht het jaarfilter hieronder
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { month: thisMonth, value: forecastThis, realised: realisedThisMonth },
            { month: nextMonth, value: forecastNext, realised: 0 },
          ].map(({ month, value, realised }) => {
            const target = forecastTargets.get(month) ?? null;
            const delta = target != null ? value - target : null;
            const kindBreakdown = forecastByKind[month] ?? [];
            return (
              <div
                key={month}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Prognose {formatMonth(`${month}-01`)} (totaal)
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${toneVsTarget(value, target)}`}
                >
                  {eur(value)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {realised > 0.5
                    ? `${eur(realised)} gefactureerd + bedrag × slagingskans`
                    : "bedrag × slagingskans"}
                  {target != null && delta != null && (
                    <>
                      {" · target "}
                      {eur(target)}
                      {" · "}
                      {delta >= 0 ? "+" : "−"}
                      {eur(Math.abs(delta))}
                    </>
                  )}
                </p>
                {kindBreakdown.length > 1 && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {kindBreakdown
                      .map(
                        ([k, v]) =>
                          `${VACANCY_KIND_LABELS[k as VacancyKind] ?? k} ${eur(v)}`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Omzet t.o.v. target ({year})
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ...quarterCards.map(({ q, behaald, target }) => ({
              label: `Q${q}`,
              current: isCurrentYear && q === currentRealQuarter,
              behaald,
              target,
            })),
            {
              label: "Jaar",
              current: false,
              behaald: jaarBehaald,
              target: jaarTarget,
            },
          ].map(({ label, current, behaald, target }) => {
            const pct = pctLabel(behaald, target);
            const barPct =
              target > 0 ? Math.min(100, Math.round((behaald / target) * 100)) : 0;
            const barColor = !target
              ? "bg-zinc-300 dark:bg-zinc-700"
              : behaald >= target
                ? "bg-green-500"
                : behaald / target >= 0.75
                  ? "bg-amber-500"
                  : "bg-zinc-400";
            return (
              <div
                key={label}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  {label}
                  {current && (
                    <span className="ml-1 text-terra">· huidig</span>
                  )}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {eur(behaald)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  target {eur(target)} ·{" "}
                  <span className={`font-medium ${pct.tone}`}>{pct.text}</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {jaarTarget === 0 && (
          <p className="mt-2 text-xs text-zinc-400">
            Nog geen targets ingevuld voor {year}.{" "}
            <Link href="/targets" className="underline">
              Targets invullen
            </Link>
            .
          </p>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Behaalde omzet (netto)
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(omzet.netto)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {periodLabel} · {omzet.count} facturen · bruto {eur(omzet.bruto)}
          </p>
          {omzet.partners.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              waarvan naar partners:{" "}
              {omzet.partners
                .map((p) => `${p.name} ${eur(p.amount)}`)
                .join(" · ")}
            </p>
          )}
          {omzetBreakdown.length > 1 && (
            <p className="mt-1 text-xs text-zinc-400">
              <a href="#omzetverdeling" className="underline">
                Verdeling per soort ↓
              </a>
            </p>
          )}
        </div>

        <Link
          href={`/rapportages/plaatsingen?jaar=${year}&van=${fromMonth}&tm=${toMonth}${
            clientFilter ? `&klant=${clientFilter}` : ""
          }${inclPartner ? "&partner=1" : ""}`}
          className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-terra/50 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Plaatsingen ({periodLabel})
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {wsFee.placements}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            = wervingsfee-facturen · bekijk de lijst →
          </p>
        </Link>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Gem. W&amp;S-fee per plaatsing
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {wsFee.avg == null ? "—" : eur(wsFee.avg)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {eur(wsFee.total)} ÷ {wsFee.placements} · incl. commitment fee ·{" "}
            {inclPartner ? "incl. partnerdeel" : "RR-deel (excl. partner)"}
          </p>
        </div>
      </div>

      <RevenueChart
        selectedYear={year}
        series={chartSeries}
        target={targetMonthly}
        label="W&S-omzet"
      />

      <section id="omzetverdeling" className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Omzetverdeling ({periodLabel})
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          W&amp;S tegenover Interim (eigen uren) en ZZP Marge.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Soort</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Bedrag (netto)
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  % van omzet
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {INVOICE_KINDS.map((k) => {
                const v = omzet.byKind[k];
                const pct =
                  omzet.netto > 0 ? Math.round((v / omzet.netto) * 100) : null;
                return (
                  <tr key={k}>
                    <td className="px-4 py-2">{INVOICE_KIND_LABELS[k]}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {eur(v)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                      {pct == null ? "—" : `${pct}%`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                <td className="px-4 py-2">Totaal</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {eur(omzet.netto)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {omzet.netto > 0 ? "100%" : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {topClients.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Top klanten ({MONTH_NAMES[fromMonth]}
            {fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""} {year})
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {inclPartner ? "incl. partnerdeel" : "RR-deel (excl. partner)"}
            </span>
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
                <span className="min-w-0">
                  <Link
                    href={`/vacatures/${vacancy.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {vacancy.title}
                  </Link>
                  {vacancy.kind && vacancy.kind !== "wervingsfee" && (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {VACANCY_KIND_LABELS[vacancy.kind as VacancyKind] ??
                        vacancy.kind}
                    </span>
                  )}
                </span>
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
