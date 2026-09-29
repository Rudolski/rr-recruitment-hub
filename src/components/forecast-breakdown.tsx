import Link from "next/link";
import { eur, formatMonth } from "@/lib/format";
import { VACANCY_KIND_LABELS, type VacancyKind } from "@/lib/types";

export type ForecastVacancyRow = {
  id: string;
  title: string;
  clientName: string;
  kind: string | null;
  expectedFee: number | null;
  successProbability: number | null;
  value: number;
};

export type ForecastInvoiceRow = {
  id: string;
  clientName: string;
  kind: string | null;
  amount: number;
  status: string;
};

function KindTag({ kind }: { kind: string | null }) {
  if (!kind || kind === "wervingsfee") return null;
  return (
    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {VACANCY_KIND_LABELS[kind as VacancyKind] ?? kind}
    </span>
  );
}

/**
 * Waaruit de prognose van een maand is opgebouwd: al gefactureerd
 * (alleen relevant voor de lopende maand) + lopende procedures met
 * hun gewogen bijdrage. Wordt aangesprongen door op een prognosekaart
 * (ForecastCards) te klikken — die linkt naar #prognose-<maand>.
 */
export function ForecastBreakdown({
  months,
  vacancyRowsByMonth,
  invoiceRowsByMonth,
}: {
  months: string[];
  vacancyRowsByMonth: Record<string, ForecastVacancyRow[]>;
  invoiceRowsByMonth?: Record<string, ForecastInvoiceRow[]>;
}) {
  return (
    <section className="mt-10 space-y-8">
      {months.map((month) => {
        const vacancyRows = vacancyRowsByMonth[month] ?? [];
        const invoiceRows = invoiceRowsByMonth?.[month] ?? [];
        const invoiceTotal = invoiceRows.reduce((s, r) => s + r.amount, 0);
        const weightedTotal = vacancyRows.reduce((s, r) => s + r.value, 0);

        return (
          <div key={month} id={`prognose-${month}`} className="scroll-mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Opbouw prognose {formatMonth(`${month}-01`)}
              </h2>
              <p className="text-sm text-zinc-500">
                Totaal:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {eur(invoiceTotal + weightedTotal)}
                </span>
              </p>
            </div>

            {invoiceRows.length === 0 && vacancyRows.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Geen facturen of open vacatures met verwachte fee, maand en
                slagingskans voor deze maand.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {invoiceRows.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                      Al gefactureerd
                    </p>
                    <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {invoiceRows.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="min-w-0">
                            <Link
                              href={`/facturen/${r.id}`}
                              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                            >
                              {r.clientName}
                            </Link>
                            <KindTag kind={r.kind} />
                          </span>
                          <span className="flex items-center gap-4 text-zinc-500">
                            <span className="capitalize">{r.status}</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {eur(r.amount)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {vacancyRows.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                      Lopende procedures (bedrag × slagingskans)
                    </p>
                    <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {vacancyRows.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="min-w-0">
                            <Link
                              href={`/vacatures/${r.id}`}
                              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                            >
                              {r.title}
                            </Link>
                            <KindTag kind={r.kind} />
                            <span className="ml-2 text-xs text-zinc-500">
                              {r.clientName}
                            </span>
                          </span>
                          <span className="flex items-center gap-4 text-zinc-500">
                            <span>
                              {eur(r.expectedFee)} × {r.successProbability}%
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {eur(r.value)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
