import { eur, formatMonth } from "@/lib/format";
import { VACANCY_KIND_LABELS, type VacancyKind } from "@/lib/types";

/**
 * De twee prognosekaarten (lopende + volgende maand) op basis van open
 * vacatures: bedrag × slagingskans, groen/rood t.o.v. de maandtarget,
 * met een uitsplitsing per vacaturesoort zodra er meer dan één soort
 * meetelt. Eén plek zodat het cijfer overal hetzelfde is.
 */
export function ForecastCards({
  months,
  totals,
  targets,
  byKind,
}: {
  months: string[];
  totals: Record<string, number>;
  targets: Map<string, number>;
  byKind: Record<string, [VacancyKind, number][]>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {months.map((month) => {
        const value = totals[month] ?? 0;
        const target = targets.get(month) ?? null;
        const onOrAboveTarget = target != null && value >= target;
        const belowTarget = target != null && value < target;
        const valueClass = onOrAboveTarget
          ? "text-green-600 dark:text-green-500"
          : belowTarget
            ? "text-red-600 dark:text-red-500"
            : "text-zinc-900 dark:text-zinc-50";
        const kindBreakdown = byKind[month] ?? [];
        return (
          <div
            key={month}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Prognose {formatMonth(`${month}-01`)}
            </p>
            <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>
              {eur(value)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              bedrag × slagingskans
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
            {kindBreakdown.length > 1 && (
              <p className="mt-1 text-xs text-zinc-400">
                {kindBreakdown
                  .map(([k, v]) => `${VACANCY_KIND_LABELS[k] ?? k} ${eur(v)}`)
                  .join(" · ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
