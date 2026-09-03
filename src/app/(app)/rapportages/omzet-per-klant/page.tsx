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

  const perClient = new Map<string, { revenue: number; count: number }>();
  for (const inv of invoices ?? []) {
    const entry = perClient.get(inv.client_id) ?? { revenue: 0, count: 0 };
    entry.revenue += Number(inv.amount_excl_btw);
    entry.count += 1;
    perClient.set(inv.client_id, entry);
  }

  const rows = [...perClient.entries()]
    .map(([id, v]) => ({
      id,
      name: clientName.get(id) ?? "—",
      ...v,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0);

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
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Facturen</th>
                <th className={`${th} text-right`}>Omzet excl. btw</th>
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
                  {eur2(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
