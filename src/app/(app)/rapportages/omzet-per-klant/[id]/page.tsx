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
import {
  REALISED_INVOICE_STATUSES,
  type Client,
  type Invoice,
  type Placement,
  type Vacancy,
} from "@/lib/types";

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

  const realisedStatuses = REALISED_INVOICE_STATUSES as string[];
  const realisedTotal = (invoices ?? [])
    .filter((i) => realisedStatuses.includes(i.status))
    .reduce((s, i) => s + Number(i.amount_excl_btw), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/rapportages/omzet-per-klant" label="Omzet per klant" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
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
        Behaalde omzet:{" "}
        <span className="text-xl font-semibold text-navy dark:text-cream">
          {eur2(realisedTotal)}
        </span>
      </p>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Facturen
        </h2>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Geen facturen.</p>
        ) : (
          <div className={tableWrap}>
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
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Plaatsingen
        </h2>
        {!placements || placements.length === 0 ? (
          <p className="text-sm text-zinc-500">Geen plaatsingen.</p>
        ) : (
          <div className={tableWrap}>
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
        )}
      </section>
    </div>
  );
}
