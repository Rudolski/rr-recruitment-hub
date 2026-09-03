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
  type Client,
  type ClientNote,
} from "@/lib/types";

export type KlantenScope = "actief" | "prospects" | "archief";

const META: Record<
  KlantenScope,
  { title: string; description: string; empty: string }
> = {
  actief: {
    title: "Klanten",
    description: "Opdrachtgevers met de status Klant.",
    empty: "Nog geen klanten.",
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

const todayIso = () => new Date().toISOString().slice(0, 10);

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

  const withNotes = scope !== "archief" && !!clients && clients.length > 0;
  const latestNote = new Map<string, ClientNote>();
  const nextFollowUp = new Map<string, string>();
  if (withNotes) {
    const ids = clients!.map((c) => c.id);
    const { data: notes } = await supabase
      .from("client_notes")
      .select("*")
      .in("client_id", ids)
      .order("created_at", { ascending: false })
      .returns<ClientNote[]>();
    for (const n of notes ?? []) {
      if (!latestNote.has(n.client_id)) latestNote.set(n.client_id, n);
    }
    // eerstvolgende openstaande opvolging per klant
    const open = [...(notes ?? [])]
      .filter((n) => n.follow_up_on && !n.follow_up_done)
      .sort((a, b) => (a.follow_up_on ?? "").localeCompare(b.follow_up_on ?? ""));
    for (const n of open) {
      if (n.follow_up_on && !nextFollowUp.has(n.client_id))
        nextFollowUp.set(n.client_id, n.follow_up_on);
    }
  }

  const showStatus = scope !== "actief";
  const today = todayIso();

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

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!clients || clients.length === 0) && (
        <div className={emptyState}>{meta.empty}</div>
      )}

      {!error && clients && clients.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Naam</th>
                {showStatus && <th className={th}>Status</th>}
                {withNotes && <th className={th}>Laatste notitie / opvolgen</th>}
                <th className={th}>Aangemaakt</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {clients.map((client) => {
                const note = latestNote.get(client.id);
                const fu = nextFollowUp.get(client.id);
                const overdue = fu != null && fu <= today;
                return (
                  <tr key={client.id} className={tr}>
                    <td className={td}>
                      <Link
                        href={`/klanten/${client.id}`}
                        className="font-medium text-navy hover:underline dark:text-cream"
                      >
                        {client.name}
                      </Link>
                    </td>
                    {showStatus && (
                      <td className={td}>
                        <ClientStatusBadge status={client.status} />
                      </td>
                    )}
                    {withNotes && (
                      <td className={`${td} max-w-xs`}>
                        {fu && (
                          <span
                            className={`mr-2 rounded-full px-1.5 py-0.5 text-[11px] ${
                              overdue
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {formatDate(fu)}
                          </span>
                        )}
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {note ? (
                            <span
                              className="line-clamp-1"
                              title={note.body}
                            >
                              {note.body}
                            </span>
                          ) : (
                            "—"
                          )}
                        </span>
                      </td>
                    )}
                    <td className={`${td} text-zinc-500`}>
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
