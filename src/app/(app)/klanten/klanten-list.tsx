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
  CLIENT_STATUS_LABELS,
  PROSPECT_STATUSES,
  isOneOf,
  type Client,
} from "@/lib/types";

export type KlantenScope = "actief" | "prospects" | "archief";

const META: Record<
  KlantenScope,
  { title: string; description: string; empty: string }
> = {
  actief: {
    title: "Klanten",
    description: "Opdrachtgevers met de status Klant.",
    empty: "Nog geen actieve klanten.",
  },
  prospects: {
    title: "Prospects",
    description:
      "Relaties in de funnel: nieuw, in outreach, warm, afspraak gepland of voorstel gestuurd.",
    empty: "Geen prospects.",
  },
  archief: {
    title: "Archief",
    description: "Inactieve relaties.",
    empty: "Archief is leeg.",
  },
};

export async function KlantenList({
  scope,
  searchParams,
}: {
  scope: KlantenScope;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();
  const meta = META[scope];

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={meta.title} />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const stage =
    scope === "prospects" &&
    typeof sp.status === "string" &&
    (PROSPECT_STATUSES as string[]).includes(sp.status)
      ? sp.status
      : null;

  let query = supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (scope === "actief") query = query.eq("status", "actief");
  else if (scope === "archief") query = query.eq("status", "inactief");
  else query = query.in("status", stage ? [stage] : PROSPECT_STATUSES);

  const { data: clients, error } = await query.returns<Client[]>();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={meta.title}
        description={meta.description}
        action={
          <Link href="/klanten/nieuw" className={btnPrimary}>
            Nieuwe relatie
          </Link>
        }
      />

      {scope === "prospects" && (
        <form className="mt-6 flex items-end gap-3" method="get">
          <label className="text-sm">
            <span className="block text-xs text-zinc-500">Fase</span>
            <select
              name="status"
              defaultValue={stage ?? ""}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Alle prospects</option>
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABELS[s as keyof typeof CLIENT_STATUS_LABELS]}
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
      )}

      {error && (
        <p className={errorBox}>Laden mislukt: {error.message}</p>
      )}

      {!error && (!clients || clients.length === 0) && (
        <div className={emptyState}>{meta.empty}</div>
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
