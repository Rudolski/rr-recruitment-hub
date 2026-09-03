"use client";

import { btnPrimary } from "@/components/ui";
import { eur, MONTH_NAMES, pctLabel } from "@/lib/format";
import { saveYearTargets } from "./actions";

export type MonthInput = { revenue: string };

const cell =
  "w-32 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-right tabular-nums dark:border-zinc-700 dark:bg-zinc-900";

export function TargetsForm({
  year,
  initial,
  realisedRevenue,
}: {
  year: number;
  initial: Record<number, MonthInput>;
  realisedRevenue: number[];
}) {
  return (
    <form action={saveYearTargets} className="mt-6">
      <input type="hidden" name="year" value={year} />
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Maand</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Target omzet
              </th>
              <th className="px-4 py-2.5 text-right font-medium">
                Behaald excl. btw
              </th>
              <th className="px-4 py-2.5 text-right font-medium">% behaald</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const target = Number(initial[m]?.revenue || 0);
              const realised = realisedRevenue[m] ?? 0;
              const pct = pctLabel(realised, target);
              return (
                <tr key={m}>
                  <td className="px-4 py-2 capitalize">{MONTH_NAMES[m]}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      name={`revenue_${m}`}
                      inputMode="numeric"
                      defaultValue={initial[m]?.revenue ?? ""}
                      placeholder="0"
                      className={cell}
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-500">
                    {eur(realised)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums font-medium ${pct.tone}`}
                  >
                    {pct.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Het percentage is gebaseerd op het opgeslagen target. Sla eerst op om
        een gewijzigd target mee te rekenen.
      </p>
      <button type="submit" className={`${btnPrimary} mt-3`}>
        Targets opslaan
      </button>
    </form>
  );
}
