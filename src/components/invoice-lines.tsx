import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { eur2, formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { advanceInvoiceStatus } from "@/app/(app)/facturen/actions";

function NextButton({
  id,
  to,
  label,
}: {
  id: string;
  to: string;
  label: string;
}) {
  return (
    <form action={advanceInvoiceStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {label}
      </button>
    </form>
  );
}

export function InvoiceLines({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500">Nog geen factuurregels.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {invoices.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        >
          <Link
            href={`/facturen/${inv.id}`}
            className="min-w-0 flex-1 hover:underline"
          >
            <span className="font-medium text-navy dark:text-cream">
              {inv.invoice_number || inv.vacancy_label || inv.notes || "(zonder nummer)"}
            </span>
            <span className="ml-2 tabular-nums text-zinc-500">
              {eur2(inv.amount_excl_btw)} excl. btw
            </span>
            {inv.partner_name && inv.partner_share_amount ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {eur2(inv.partner_share_amount)} → {inv.partner_name}
              </span>
            ) : null}
          </Link>

          <span className="flex items-center gap-2">
            <InvoiceStatusBadge status={inv.status} />
            {inv.sent_at && (
              <span className="text-xs text-zinc-400">
                verz. {formatDate(inv.sent_at)}
              </span>
            )}
          </span>

          <span className="flex items-center gap-2">
            {inv.status === "concept" && (
              <NextButton id={inv.id} to="verzonden" label="→ Verstuurd" />
            )}
            {inv.status === "verzonden" && (
              <NextButton id={inv.id} to="betaald" label="→ Betaald" />
            )}
            {inv.status === "te_laat" && (
              <NextButton id={inv.id} to="betaald" label="→ Betaald" />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
