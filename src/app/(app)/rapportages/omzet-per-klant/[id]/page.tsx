import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { InvoiceStatusBadge, PlacementStatusBadge } from "@/components/status-badge";
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
import { eur2, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { splitOmzet } from "@/lib/omzet";
import type { Client, Invoice, Placement, Vacancy } from "@/lib/types";

export const metadata = { title: "Omzet per klant · RR Recruitment Hub" };

export default async function KlantOmzetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink href="/rapportages/omzet-per-klant" label="Omzet per klant" />
        <p className={errorBox}>Geen organisatie gekoppeld.</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearParam =
    typeof sp.jaar === "string" && /^\d{4}$/.test(sp.jaar)
      ? Number(sp.jaar)
      : null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .maybeSingle<Pick<Client, "id" | "name">>();
  if (!client) notFound();

  let invoiceQuery = supabase
    .from("invoices")
    .select("*")
    .eq("client_id", id)
    .order("issue_date", { ascending: true, nullsFirst: true });
  if (yearParam) {
    invoiceQuery = invoiceQuery
      .gte("issue_date", `${yearParam}-01-01`)
      .lte("issue_date", `${yearParam}-12-31`);
  }

  const [{ data: invoices }, { data: placements }, { data: vacancies }] =
    await Promise.all([
      invoiceQuery.returns<Invoice[]>(),
      supabase
        .from("placements")
        .select("*")
        .eq("client_id", id)
        .order("start_date", { ascending: false, nullsFirst: false })
        .returns<Placement[]>(),
      supabase
        .from("vacancies")
        .select("id, title")
        .eq("client_id", id)
        .returns<Pick<Vacancy, "id" | "title">[]>(),
    ]);

  const vacancyTitle = new Map((vacancies ?? []).map((v) => [v.id, v.title]));
  const omzet = splitOmzet(invoices ?? []);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/rapportages/omzet-per-klant" label="Omzet per klant" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-xl font-medium tracking-tight sm:text-2xl text-navy dark:text-cream">
        {client.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Opbouw van de omzet{yearParam ? ` in ${yearParam}` : ""} — facturen
        vanaf verzonden, excl. btw.{" "}
        <Link
          href={`/klanten/${client.id}`}
          className="text-terra hover:underline"
        >
          Naar klant
        </Link>
      </p>

      <p className="mt-4 text-sm text-zinc-500">
        Behaalde omzet (netto):{" "}
        <span className="text-xl font-semibold text-navy dark:text-cream">
          {eur2(omzet.netto)}
        </span>
        <span className="ml-2 text-xs text-zinc-400">
          bruto {eur2(omzet.bruto)}
          {omzet.partners.length > 0 &&
            ` · ${omzet.partners
              .map((p) => `${p.name} ${eur2(p.amount)}`)
              .join(", ")}`}
        </span>
      </p>
      {(omzet.byKind.interim > 0.5 || omzet.byKind.zzp_marge > 0.5) && (
        <p className="mt-1 text-xs text-zinc-400">
          {[
            omzet.wsNetto > 0.5 && `W&S ${eur2(omzet.wsNetto)}`,
            omzet.byKind.interim > 0.5 &&
              `Interim ${eur2(omzet.byKind.interim)}`,
            omzet.byKind.zzp_marge > 0.5 &&
              `ZZP Marge ${eur2(omzet.byKind.zzp_marge)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Facturen
        </h2>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Geen facturen.</p>
        ) : (
          <>
          <ul className="space-y-1.5 md:hidden">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/facturen/${inv.id}`}
                    className="text-terra hover:underline"
                  >
                    {inv.invoice_number || "(zonder nummer)"}
                  </Link>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-500">
                  <span>{formatDate(inv.issue_date)}</span>
                  <span className="tabular-nums">
                    {eur2(inv.amount_excl_btw)}
                  </span>
                </div>
                {inv.notes && (
                  <p className="mt-0.5 text-xs text-zinc-400">{inv.notes}</p>
                )}
              </li>
            ))}
          </ul>
          <div className={`${tableWrap} hidden md:block`}>
            <table className={table}>
              <thead className={thead}>
                <tr>
                  <th className={th}>Nummer</th>
                  <th className={th}>Datum</th>
                  <th className={th}>Excl. btw</th>
                  <th className={th}>Status</th>
                  <th className={th}>Omschrijving</th>
                </tr>
              </thead>
              <tbody className={tbody}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={tr}>
                    <td className={td}>
                      <Link
                        href={`/facturen/${inv.id}`}
                        className="text-terra hover:underline"
                      >
                        {inv.invoice_number || "(zonder nummer)"}
                      </Link>
                    </td>
                    <td className={`${td} text-zinc-500`}>
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {eur2(inv.amount_excl_btw)}
                    </td>
                    <td className={td}>
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className={`${td} text-zinc-500`}>
                      {inv.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Plaatsingen
        </h2>
        {!placements || placements.length === 0 ? (
          <p className="text-sm text-zinc-500">Geen plaatsingen.</p>
        ) : (
          <>
          <ul className="space-y-1.5 md:hidden">
            {placements.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/placements/${p.id}`}
                    className="text-terra hover:underline"
                  >
                    {p.candidate_name ?? "—"}
                  </Link>
                  <PlacementStatusBadge status={p.status} />
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {vacancyTitle.get(p.vacancy_id) ?? "—"}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-500">
                  <span>start {formatDate(p.start_date)}</span>
                  <span className="tabular-nums">
                    {p.fee_amount == null ? "—" : eur2(p.fee_amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className={`${tableWrap} hidden md:block`}>
            <table className={table}>
              <thead className={thead}>
                <tr>
                  <th className={th}>Kandidaat</th>
                  <th className={th}>Vacature</th>
                  <th className={th}>Start</th>
                  <th className={th}>Fee</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className={tbody}>
                {placements.map((p) => (
                  <tr key={p.id} className={tr}>
                    <td className={td}>
                      <Link
                        href={`/placements/${p.id}`}
                        className="text-terra hover:underline"
                      >
                        {p.candidate_name ?? "—"}
                      </Link>
                    </td>
                    <td className={`${td} text-zinc-500`}>
                      {vacancyTitle.get(p.vacancy_id) ?? "—"}
                    </td>
                    <td className={`${td} text-zinc-500`}>
                      {formatDate(p.start_date)}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {p.fee_amount == null ? "—" : eur2(p.fee_amount)}
                    </td>
                    <td className={td}>
                      <PlacementStatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
