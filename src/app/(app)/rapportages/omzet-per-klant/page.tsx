import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { eur2 } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { splitOmzet } from "@/lib/omzet";
import {
  REALISED_INVOICE_STATUSES,
  type Client,
  type Invoice,
} from "@/lib/types";

export const metadata = {
  title: "Omzet per klant · RR Recruitment Hub",
};

export default async function OmzetPerKlantPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Omzet per klant" />
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

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .in("status", REALISED_INVOICE_STATUSES)
      .gte("issue_date", `${year}-01-01`)
      .lte("issue_date", `${year}-12-31`)
      .returns<Invoice[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .order("name")
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const invoicesByClient = new Map<string, Invoice[]>();
  for (const inv of invoices ?? []) {
    const list = invoicesByClient.get(inv.client_id) ?? [];
    list.push(inv);
    invoicesByClient.set(inv.client_id, list);
  }

  const rows = [...invoicesByClient.entries()]
    .map(([id, invs]) => {
      const omzet = splitOmzet(invs);
      return {
        id,
        name: clientName.get(id) ?? "—",
        revenue: omzet.netto,
        count: omzet.count,
        ws: omzet.wsNetto,
        interim: omzet.byKind.interim,
        zzpMarge: omzet.byKind.zzp_marge,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const totalWs = rows.reduce((s, r) => s + r.ws, 0);
  const totalInterim = rows.reduce((s, r) => s + r.interim, 0);
  const totalZzpMarge = rows.reduce((s, r) => s + r.zzpMarge, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Omzet per klant"
        description="Behaalde omzet per klant, gebaseerd op facturen vanaf status verzonden, exclusief btw, met factuurdatum in het gekozen jaar."
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

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          Geen verzonden facturen met een factuurdatum in {year}.
        </p>
      ) : (
        <>
          {/* Mobiel: kaart per klant */}
          <ul className="mt-4 space-y-1.5 md:hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="min-w-0">
                  <Link
                    href={`/rapportages/omzet-per-klant/${r.id}?jaar=${year}`}
                    className="font-medium text-terra hover:underline"
                  >
                    {r.name}
                  </Link>
                  <span className="block text-xs text-zinc-400">
                    {r.count} factu{r.count === 1 ? "ur" : "ren"}
                    {(r.interim > 0.5 || r.zzpMarge > 0.5) && (
                      <>
                        {" · "}
                        {[
                          r.ws > 0.5 && `W&S ${eur2(r.ws)}`,
                          r.interim > 0.5 && `Interim ${eur2(r.interim)}`,
                          r.zzpMarge > 0.5 && `ZZP Marge ${eur2(r.zzpMarge)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </>
                    )}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{eur2(r.revenue)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
              <span>Totaal</span>
              <span className="tabular-nums">{eur2(total)}</span>
            </li>
          </ul>

          {/* Tablet en breder: tabel */}
          <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Facturen</th>
                <th className={`${th} text-right`}>W&amp;S</th>
                <th className={`${th} text-right`}>Interim</th>
                <th className={`${th} text-right`}>ZZP Marge</th>
                <th className={`${th} text-right`}>Totaal excl. btw</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {rows.map((r) => (
                <tr key={r.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/rapportages/omzet-per-klant/${r.id}?jaar=${year}`}
                      className="font-medium text-terra hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {r.count}
                  </td>
                  <td className={`${td} text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>
                    {r.ws > 0.5 ? eur2(r.ws) : "—"}
                  </td>
                  <td className={`${td} text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>
                    {r.interim > 0.5 ? eur2(r.interim) : "—"}
                  </td>
                  <td className={`${td} text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>
                    {r.zzpMarge > 0.5 ? eur2(r.zzpMarge) : "—"}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {eur2(r.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                <td className={td}>Totaal</td>
                <td className={td} />
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(totalWs)}
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(totalInterim)}
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(totalZzpMarge)}
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(total)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
