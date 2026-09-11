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
import {
  INVOICE_KIND_LABELS,
  type Client,
  type Invoice,
  type InvoiceKind,
} from "@/lib/types";

function KindChip({ kind }: { kind: string | null }) {
  if (!kind || kind === "wervingsfee") return null;
  return (
    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {INVOICE_KIND_LABELS[kind as InvoiceKind] ?? kind}
    </span>
  );
}

export const metadata = { title: "Facturen · RR Recruitment Hub" };

export default async function FacturenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const sp = await searchParams;
  const klantFilter = (typeof sp.klant === "string" ? sp.klant : "").trim();
  const jaarFilter =
    typeof sp.jaar === "string" && /^\d{4}$/.test(sp.jaar)
      ? Number(sp.jaar)
      : null;
  const allInvoices = invoices ?? [];

  const currentYear = new Date().getFullYear();
  const years = [
    ...new Set([
      currentYear,
      ...allInvoices
        .map((inv) => (inv.issue_date ? Number(inv.issue_date.slice(0, 4)) : null))
        .filter((y): y is number => y != null),
    ]),
  ].sort((a, b) => b - a);

  const filtered = allInvoices.filter((inv) => {
    if (jaarFilter && inv.issue_date?.slice(0, 4) !== String(jaarFilter)) {
      return false;
    }
    if (
      klantFilter &&
      !(clientName.get(inv.client_id) ?? "")
        .toLowerCase()
        .includes(klantFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const omzet = splitOmzet(filtered);

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

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Jaar</span>
          <select
            name="jaar"
            defaultValue={jaarFilter ? String(jaarFilter) : ""}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Alle jaren</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Klant</span>
          <input
            type="text"
            name="klant"
            defaultValue={klantFilter}
            placeholder="Klantnaam…"
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
        {(klantFilter || jaarFilter) && (
          <Link
            href="/facturen"
            className="px-3 py-1.5 text-sm text-zinc-500 hover:underline"
          >
            Wissen
          </Link>
        )}
      </form>

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && filtered.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          {(klantFilter || jaarFilter) &&
            `${filtered.length} factu${filtered.length === 1 ? "ur" : "ren"} · `}
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

      {!error && filtered.length === 0 && (klantFilter || jaarFilter) && (
        <div className={emptyState}>
          Geen facturen
          {jaarFilter && ` in ${jaarFilter}`}
          {klantFilter && ` voor een klant met “${klantFilter}” in de naam`}.
        </div>
      )}

      {!error && filtered.length === 0 && !klantFilter && !jaarFilter && (
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

      {/* Mobiel: kaart per factuur */}
      {!error && filtered.length > 0 && (
        <ul className="mt-4 space-y-2 md:hidden">
          {filtered.map((inv) => (
            <li
              key={inv.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-2">
                <span>
                  <Link
                    href={`/facturen/${inv.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {clientName.get(inv.client_id) ?? "—"}
                  </Link>
                  <KindChip kind={inv.kind} />
                </span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              {inv.vacancy_label && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {inv.vacancy_label}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-500">
                <span className="tabular-nums">
                  {eur2(inv.amount_excl_btw)} excl.
                </span>
                <span className="tabular-nums">
                  {eur2(inv.amount_incl_btw)} incl.
                </span>
                <span>{formatDate(inv.issue_date)}</span>
                <span>{inv.invoice_number || "(zonder nummer)"}</span>
              </div>
              {inv.partner_name && inv.partner_share_amount ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  waarvan {eur2(inv.partner_share_amount)} naar{" "}
                  {inv.partner_name}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* Tablet en breder: tabel */}
      {!error && filtered.length > 0 && (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Excl. btw</th>
                <th className={th}>Incl. btw</th>
                <th className={th}>Status</th>
                <th className={th}>Factuurdatum</th>
                <th className={th}>Nummer</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {filtered.map((inv) => (
                <tr key={inv.id} className={tr}>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    <Link
                      href={`/facturen/${inv.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {clientName.get(inv.client_id) ?? "—"}
                    </Link>
                    <KindChip kind={inv.kind} />
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
                  <td className={`${td} text-zinc-500`}>
                    {inv.invoice_number || "(zonder nummer)"}
                    {inv.entity_name && (
                      <span className="block text-xs text-zinc-400">
                        {inv.entity_name}
                      </span>
                    )}
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
