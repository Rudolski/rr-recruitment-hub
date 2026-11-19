import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badge";
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
import { eur, eur2, formatDate, MONTH_NAMES } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { splitOmzet } from "@/lib/omzet";
import {
  INVOICE_KINDS,
  INVOICE_KIND_LABELS,
  isOneOf,
  REALISED_INVOICE_STATUSES,
  type Client,
  type Invoice,
  type InvoiceKind,
} from "@/lib/types";

export const metadata = { title: "Omzet per soort · RR Recruitment Hub" };

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/**
 * Oude opzet: een partneruitbetaling als losse regel met een negatief
 * bedrag en zonder partner_share_amount. splitOmzet telt die niet mee
 * in de verdeling per soort, dus hier ook niet.
 */
const isLegacyPartnerRow = (inv: Invoice) =>
  !!inv.partner_name && !Number(inv.partner_share_amount ?? 0);

export default async function OmzetPerSoortPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Omzet per soort" />
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
  const soortRaw = typeof params.soort === "string" ? params.soort : "";
  const soort: InvoiceKind = isOneOf(INVOICE_KINDS, soortRaw)
    ? soortRaw
    : "wervingsfee";

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
  if (clientFilter) periodQ = periodQ.eq("client_id", clientFilter);

  const [{ data: periodInvoices, error }, { data: clients }] =
    await Promise.all([
      periodQ.returns<Invoice[]>(),
      supabase
        .from("clients")
        .select("id, name")
        .returns<Pick<Client, "id" | "name">[]>(),
    ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const omzet = splitOmzet(periodInvoices ?? []);

  const rows = (periodInvoices ?? [])
    .filter(
      (inv) =>
        (inv.kind ?? "wervingsfee") === soort && !isLegacyPartnerRow(inv),
    )
    .map((inv) => {
      const bruto = Number(inv.amount_excl_btw);
      const partner = Number(inv.partner_share_amount ?? 0);
      return { inv, bruto, partner, netto: bruto - partner };
    })
    .sort((a, b) =>
      (b.inv.issue_date ?? "").localeCompare(a.inv.issue_date ?? ""),
    );

  const totals = rows.reduce(
    (s, r) => ({
      bruto: s.bruto + r.bruto,
      partner: s.partner + r.partner,
      netto: s.netto + r.netto,
    }),
    { bruto: 0, partner: 0, netto: 0 },
  );
  const hasPartner = totals.partner !== 0;

  const periodLabel = `${MONTH_NAMES[fromMonth]}${
    fromMonth !== toMonth ? `–${MONTH_NAMES[toMonth]}` : ""
  } ${year}`;
  const baseQuery = `jaar=${year}&van=${fromMonth}&tm=${toMonth}${
    clientFilter ? `&klant=${clientFilter}` : ""
  }`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Omzet per soort · ${periodLabel}`}
        description="Alle gerealiseerde facturen met factuurdatum in de periode, per soort omzet. Netto = factuurbedrag excl. btw minus het partnerdeel."
      />

      <nav className="mt-4 flex flex-wrap gap-2">
        {INVOICE_KINDS.map((k) => {
          const active = k === soort;
          return (
            <Link
              key={k}
              href={`/rapportages/omzet-per-soort?soort=${k}&${baseQuery}`}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-terra bg-terra/10 text-navy dark:text-cream"
                  : "border-zinc-200 text-zinc-600 hover:border-terra/50 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              <span className="font-medium">{INVOICE_KIND_LABELS[k]}</span>
              <span className="ml-2 tabular-nums text-zinc-500">
                {eur(omzet.byKind[k])}
              </span>
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 text-sm text-zinc-500">
        <span className="text-lg font-semibold text-navy dark:text-cream">
          {eur2(totals.netto)}
        </span>{" "}
        netto · {rows.length} {rows.length === 1 ? "factuur" : "facturen"}
        {omzet.netto > 0 &&
          ` · ${Math.round((omzet.byKind[soort] / omzet.netto) * 100)}% van de omzet`}
      </p>

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          Geen {INVOICE_KIND_LABELS[soort].toLowerCase()}-facturen in deze
          periode.
        </p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Omschrijving</th>
                <th className={th}>Factuur</th>
                <th className={th}>Datum</th>
                <th className={th}>Status</th>
                {hasPartner && (
                  <>
                    <th className={`${th} text-right`}>Bruto</th>
                    <th className={`${th} text-right`}>Partner</th>
                  </>
                )}
                <th className={`${th} text-right`}>Netto</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {rows.map(({ inv, bruto, partner, netto }) => (
                <tr key={inv.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/klanten/${inv.client_id}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {clientName.get(inv.client_id) ?? "—"}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {inv.vacancy_label || inv.notes || "—"}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/facturen/${inv.id}`}
                      className="text-navy hover:underline dark:text-cream"
                    >
                      {inv.invoice_number || "open"}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(inv.issue_date)}
                  </td>
                  <td className={td}>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  {hasPartner && (
                    <>
                      <td className={`${td} text-right tabular-nums`}>
                        {eur2(bruto)}
                      </td>
                      <td
                        className={`${td} text-right tabular-nums text-zinc-500`}
                      >
                        {partner ? `${eur2(-partner)} (${inv.partner_name})` : "—"}
                      </td>
                    </>
                  )}
                  <td className={`${td} text-right font-medium tabular-nums`}>
                    {eur2(netto)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                <td className={td} colSpan={5}>
                  Totaal ({rows.length})
                </td>
                {hasPartner && (
                  <>
                    <td className={`${td} text-right tabular-nums`}>
                      {eur2(totals.bruto)}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {eur2(-totals.partner)}
                    </td>
                  </>
                )}
                <td className={`${td} text-right tabular-nums`}>
                  {eur2(totals.netto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Staat een factuur onder de verkeerde soort? Open hem via het
        factuurnummer en pas <em>Soort factuur</em> aan.
      </p>
    </div>
  );
}
