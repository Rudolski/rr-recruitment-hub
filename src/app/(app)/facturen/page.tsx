import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badge";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { eur2, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { splitOmzet } from "@/lib/omzet";
import type { Client, Invoice } from "@/lib/types";

export const metadata = { title: "Facturen · RR Recruitment Hub" };

export default async function FacturenPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Facturen" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: invoices, error }, { data: clients }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .order("issue_date", { ascending: false, nullsFirst: false })
      .returns<Invoice[]>(),
    supabase.from("clients").select("id, name").returns<
      Pick<Client, "id" | "name">[]
    >(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const omzet = splitOmzet(invoices ?? []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Facturen"
        description="Registratie van facturen uit Snelstart Web. Concept telt niet mee in de omzet; verzonden en verder wel (excl. btw)."
        action={
          <Link href="/facturen/nieuw" className={btnPrimary}>
            Nieuwe factuurregel
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && invoices && invoices.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          Behaalde omzet (verzonden en verder, excl. btw): netto{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {eur2(omzet.netto)}
          </span>{" "}
          · bruto {eur2(omzet.bruto)}
          {omzet.partners.length > 0 &&
            ` · partners ${omzet.partners
              .map((p) => `${p.name} ${eur2(p.amount)}`)
              .join(", ")}`}
        </p>
      )}

      {!error && (!invoices || invoices.length === 0) && (
        <div className={emptyState}>
          Nog geen facturen.{" "}
          <Link
            href="/facturen/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste toe
          </Link>
          .
        </div>
      )}

      {!error && invoices && invoices.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Nummer</th>
                <th className={th}>Klant</th>
                <th className={th}>Excl. btw</th>
                <th className={th}>Incl. btw</th>
                <th className={th}>Status</th>
                <th className={th}>Factuurdatum</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {invoices.map((inv) => (
                <tr key={inv.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/facturen/${inv.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {inv.invoice_number || "(zonder nummer)"}
                    </Link>
                    {inv.entity_name && (
                      <span className="block text-xs text-zinc-400">
                        {inv.entity_name}
                      </span>
                    )}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {clientName.get(inv.client_id) ?? "—"}
                    {inv.vacancy_label && (
                      <span className="block text-xs text-zinc-400">
                        {inv.vacancy_label}
                      </span>
                    )}
                    {inv.partner_name && inv.partner_share_amount ? (
                      <span className="block text-xs text-amber-600 dark:text-amber-400">
                        waarvan {eur2(inv.partner_share_amount)} naar{" "}
                        {inv.partner_name}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {eur2(inv.amount_excl_btw)}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {eur2(inv.amount_incl_btw)}
                  </td>
                  <td className={td}>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(inv.issue_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
