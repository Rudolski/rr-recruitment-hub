import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
import { eur, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  FEE_AGREEMENT_TYPE_LABELS,
  type Client,
  type FeeAgreement,
} from "@/lib/types";

export const metadata = { title: "Fee-afspraken · RR Recruitment Hub" };

function typeLabel(type: string) {
  return (
    FEE_AGREEMENT_TYPE_LABELS[type as keyof typeof FEE_AGREEMENT_TYPE_LABELS] ??
    type
  );
}

function summary(fa: FeeAgreement) {
  if (fa.type === "percentage")
    return fa.percentage != null ? `${fa.percentage}%` : "—";
  if (fa.type === "vast_bedrag") return eur(fa.fixed_amount);
  return "Staffel";
}

export default async function FeeAfsprakenPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Fee-afspraken" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: agreements, error }, { data: clients }] = await Promise.all([
    supabase
      .from("fee_agreements")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<FeeAgreement[]>(),
    supabase.from("clients").select("id, name").returns<
      Pick<Client, "id" | "name">[]
    >(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Fee-afspraken"
        description="Percentage, staffel of vast bedrag per klant. Percentage ligt doorgaans tussen 18 en 25%."
        action={
          <Link href="/fee-afspraken/nieuw" className={btnPrimary}>
            Nieuwe fee-afspraak
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!agreements || agreements.length === 0) && (
        <div className={emptyState}>
          Nog geen fee-afspraken.{" "}
          <Link
            href="/fee-afspraken/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste toe
          </Link>
          .
        </div>
      )}

      {!error && agreements && agreements.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Type</th>
                <th className={th}>Waarde</th>
                <th className={th}>Min. fee</th>
                <th className={th}>Geldig vanaf</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {agreements.map((fa) => (
                <tr key={fa.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/fee-afspraken/${fa.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {clientName.get(fa.client_id) ?? "—"}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {typeLabel(fa.type)}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {summary(fa)}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {eur(fa.minimum_fee)}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(fa.valid_from)}
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
