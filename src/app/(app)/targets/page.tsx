import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { eur, pctLabel, QUARTER_OF_MONTH } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  REALISED_INVOICE_STATUSES,
  type Invoice,
  type MonthlyTarget,
} from "@/lib/types";
import { nettoAmount } from "@/lib/omzet";
import { TargetsForm, type MonthInput } from "./targets-form";

export const metadata = { title: "Targets · RR Recruitment Hub" };

const numStr = (v: number | null) => (v == null ? "" : String(v));

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Targets" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(
    typeof params.jaar === "string" ? params.jaar : currentYear,
  );
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  const [{ data: targets, error }, { data: invoices }] = await Promise.all([
    supabase
      .from("monthly_targets")
      .select("*")
      .eq("year", year)
      .returns<MonthlyTarget[]>(),
    supabase
      .from("invoices")
      .select("*")
      .in("status", REALISED_INVOICE_STATUSES)
      .gte("issue_date", `${year}-01-01`)
      .lte("issue_date", `${year}-12-31`)
      .returns<Invoice[]>(),
  ]);

  if (error && error.message.includes("monthly_targets")) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Targets" />
        <p className={errorBox}>
          De tabel <code>monthly_targets</code> bestaat nog niet. Draai eerst
          <code> supabase/migrations/002_monthly_targets.sql</code> in de
          Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const initial: Record<number, MonthInput> = {};
  for (const t of targets ?? []) {
    initial[t.month] = { revenue: numStr(t.target_revenue) };
  }

  const realisedRevenue = Array(13).fill(0) as number[];
  for (const inv of invoices ?? []) {
    if (!inv.issue_date) continue;
    const m = Number(inv.issue_date.slice(5, 7));
    realisedRevenue[m] += nettoAmount(inv);
  }

  // Kwartaal- en jaartotalen: opgeteld uit de maanden.
  const q = {
    target: [0, 0, 0, 0, 0],
    realised: [0, 0, 0, 0, 0],
  };
  for (let m = 1; m <= 12; m++) {
    const quarter = QUARTER_OF_MONTH[m];
    q.target[quarter] += initial[m]?.revenue ? Number(initial[m].revenue) : 0;
    q.realised[quarter] += realisedRevenue[m];
  }
  const yearTarget = q.target.reduce((a, b) => a + b, 0);
  const yearRealised = q.realised.reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Targets"
        description="Voer per maand een target in. Kwartaal en jaar worden automatisch opgeteld en afgezet tegen de behaalde omzet (facturen vanaf verzonden, excl. btw)."
      />

      <form className="mt-6 flex items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Jaar</span>
          <select
            name="jaar"
            defaultValue={String(year)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
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

      <TargetsForm
        key={year}
        year={year}
        initial={initial}
        realisedRevenue={realisedRevenue}
      />

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Kwartaal en jaar {year}
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Periode</th>
                <th className="px-4 py-2.5 text-right font-medium">Target</th>
                <th className="px-4 py-2.5 text-right font-medium">Behaald</th>
                <th className="px-4 py-2.5 text-right font-medium">% behaald</th>
                <th className="px-4 py-2.5 text-right font-medium">Verschil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[1, 2, 3, 4].map((quarter) => {
                const pct = pctLabel(q.realised[quarter], q.target[quarter]);
                return (
                  <tr key={quarter}>
                    <td className="px-4 py-2">Q{quarter}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {eur(q.target[quarter])}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {eur(q.realised[quarter])}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium tabular-nums ${pct.tone}`}
                    >
                      {pct.text}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                      {eur(q.realised[quarter] - q.target[quarter])}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                <td className="px-4 py-2">Jaar</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {eur(yearTarget)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {eur(yearRealised)}
                </td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${
                    pctLabel(yearRealised, yearTarget).tone
                  }`}
                >
                  {pctLabel(yearRealised, yearTarget).text}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                  {eur(yearRealised - yearTarget)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
