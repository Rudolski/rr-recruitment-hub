import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientStatusBadge } from "@/components/status-badge";
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
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  isOneOf,
  type Client,
} from "@/lib/types";

export const metadata = { title: "Klanten · RR Recruitment Hub" };

export default async function KlantenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Klanten" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const statusFilter =
    typeof sp.status === "string" && isOneOf(CLIENT_STATUSES, sp.status)
      ? sp.status
      : null;

  let query = supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: clients, error } = await query.returns<Client[]>();

  const selectClass =
    "mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Klanten"
        action={
          <Link href="/klanten/nieuw" className={btnPrimary}>
            Nieuwe klant
          </Link>
        }
      />

      <form className="mt-6 flex items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Status</span>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className={selectClass}
          >
            <option value="">Alle</option>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABELS[s]}
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

      {error && (
        <p className={errorBox}>Klanten laden mislukt: {error.message}</p>
      )}

      {!error && (!clients || clients.length === 0) && (
        <div className={emptyState}>
          {statusFilter ? (
            "Geen klanten met deze status."
          ) : (
            <>
              Nog geen klanten.{" "}
              <Link
                href="/klanten/nieuw"
                className="font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Voeg de eerste toe
              </Link>
              .
            </>
          )}
        </div>
      )}

      {!error && clients && clients.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Naam</th>
                <th className={th}>Status</th>
                <th className={th}>Aangemaakt</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {clients.map((client) => (
                <tr key={client.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/klanten/${client.id}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className={td}>
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(client.created_at)}
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
