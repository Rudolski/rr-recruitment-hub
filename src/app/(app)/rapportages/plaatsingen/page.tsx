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
import { eur2, formatDate, MONTH_NAMES } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { averageWsFee } from "@/lib/omzet";
import {
  REALISED_INVOICE_STATUSES,
  type Client,
  type Invoice,
} from "@/lib/types";

export const metadata = { title: "Plaatsingen · RR Recruitment Hub" };

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default async function PlaatsingenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Plaatsingen" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
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

  const periodStart = `${year}-${String(fromMonth).padStart(2, "0")}-01`;
  const periodEnd = `${year}-${String(toMonth).padStart(2, "0")}-${String(
    lastDay(year, toMonth),
  ).padStart(2, "0")}`;

  let periodQ = supabase
    .from("invoices")
    .select("*")
    .in("status", REALISED_INVOICE_STATUSES)
    .gte("issue_date", periodStart)
    .lte("issue_date", periodEnd);
  let commQ = supabase
    .from("invoices")
    .select("*")
    .in("status", REALISED_INVOICE_STATUSES)
    .eq("kind", "commitment");
  if (clientFilter) {
    periodQ = periodQ.eq("client_id", clientFilter);
    commQ = commQ.eq("client_id", clientFilter);
  }

  const [{ data: periodInvoices, error }, { data: commitmentPool }, { data: clients }] =
    await Promise.all([
      periodQ.returns<Invoice[]>(),
      commQ.returns<Invoice[]>(),
      supabase
        .from("clients")
        .select("id, name")
        .returns<Pick<Client, "id" | "name">[]>(),
    ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const { rows, total, avg, placements } = averageWsFee(
    periodInvoices ?? [],
    commitmentPool ?? [],
    { inclPartner },
  );

  const periodLabel = `${MONTH_NAMES[fromMonth]}${
    fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""
  } ${year}`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Plaatsingen · ${periodLabel}`}
        description="Elke gerealiseerde wervingsfee-factuur met factuurdatum in de periode telt als één plaatsing. De bijbehorende commitment fee wordt erbij opgeteld (koppeling op vacature-label of placement)."
      />

      <p className="mt-4 text-sm text-zinc-500">
        <span className="text-lg font-semibold text-navy dark:text-cream">
          {placements}
        </span>{" "}
        plaatsingen · totaal W&amp;S-fee {eur2(total)} · gemiddeld{" "}
        {avg == null ? "—" : eur2(avg)} ·{" "}
        {inclPartner ? "incl. partnerdeel" : "RR-deel (excl. partner)"}
      </p>

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          Geen wervingsfee-facturen in deze periode.
        </p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Vacature</th>
                <th className={th}>Factuurdatum</th>
                <th className={`${th} text-right`}>Wervingsfee</th>
                <th className={`${th} text-right`}>Commitment</th>
                <th className={`${th} text-right`}>Totaal</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {rows.map((r) => (
                <tr key={r.invoiceId} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/klanten/${r.clientId}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {clientName.get(r.clientId) ?? "—"}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {r.vacancyLabel || r.invoiceNumber || "—"}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(r.issueDate)}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {eur2(r.wervingsfee)}
                  </td>
                  <td className={`${td} text-right tabular-nums text-zinc-500`}>
                    {r.commitment ? eur2(r.commitment) : "—"}
                  </td>
                  <td className={`${td} text-right font-medium tabular-nums`}>
                    {eur2(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                <td className={td} colSpan={5}>
                  Totaal ({placements})
                </td>
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Staat hier een factuur die eigenlijk een commitment fee is? Open die
        via Facturen en zet <em>Soort factuur</em> op <em>Commitment fee</em>;
        dan telt hij niet meer als plaatsing.
      </p>
    </div>
  );
}
