import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ClientStatusBadge } from "@/components/status-badge";
import { SortHeader, cmpText, readSort } from "@/components/sort-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  thead,
  tr,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, ClientNote, Contact, Vacancy } from "@/lib/types";
import { toggleFollowUp } from "./notes-actions";

export type KlantenScope = "actief" | "archief";

const META: Record<
  KlantenScope,
  { title: string; description: string; empty: string }
> = {
  actief: {
    title: "Klanten",
    description: "Opdrachtgevers met de status Klant.",
    empty: "Nog geen klanten.",
  },
  archief: {
    title: "Archief",
    description: "Inactieve relaties.",
    empty: "Archief is leeg.",
  },
};

const BASE_PATH: Record<KlantenScope, string> = {
  actief: "/klanten",
  archief: "/archief",
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
  const isActief = scope === "actief";
  const allowedSort = isActief
    ? ["name", "contact", "vacancies", "followup"]
    : ["name", "status"];
  const { sort, dir } = readSort(sp, allowedSort, "name");

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("status", isActief ? "actief" : "inactief")
    .order("name", { ascending: true })
    .returns<Client[]>();

  const ids = (clients ?? []).map((c) => c.id);

  // Openstaande vacatures (titels), primaire contactpersoon en notities —
  // alleen op de klantenpagina.
  const openVacancies = new Map<string, string[]>();
  const primaryContact = new Map<
    string,
    Pick<Contact, "id" | "name" | "email">
  >();
  const latestNote = new Map<string, ClientNote>();
  const nextFollowUp = new Map<string, string>();
  let followUpNotes: ClientNote[] = [];

  if (isActief && ids.length > 0) {
    const [{ data: vac }, { data: contacts }, { data: notes }] =
      await Promise.all([
        supabase
          .from("vacancies")
          .select("client_id, title")
          .eq("status", "open")
          .in("client_id", ids)
          .order("created_at", { ascending: false })
          .returns<Pick<Vacancy, "client_id" | "title">[]>(),
        supabase
          .from("contacts")
          .select("id, client_id, name, email")
          .eq("is_primary", true)
          .in("client_id", ids)
          .returns<Pick<Contact, "id" | "client_id" | "name" | "email">[]>(),
        supabase
          .from("client_notes")
          .select("*")
          .in("client_id", ids)
          .order("created_at", { ascending: false })
          .returns<ClientNote[]>(),
      ]);

    for (const v of vac ?? []) {
      const list = openVacancies.get(v.client_id) ?? [];
      list.push(v.title);
      openVacancies.set(v.client_id, list);
    }
    for (const c of contacts ?? []) {
      if (!primaryContact.has(c.client_id)) primaryContact.set(c.client_id, c);
    }
    for (const n of notes ?? []) {
      if (!latestNote.has(n.client_id)) latestNote.set(n.client_id, n);
    }
    const open = [...(notes ?? [])]
      .filter((n) => n.follow_up_on && !n.follow_up_done)
      .sort((a, b) =>
        (a.follow_up_on ?? "").localeCompare(b.follow_up_on ?? ""),
      );
    followUpNotes = open;
    for (const n of open) {
      if (n.follow_up_on && !nextFollowUp.has(n.client_id))
        nextFollowUp.set(n.client_id, n.follow_up_on);
    }
  }

  const sorted = [...(clients ?? [])].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "contact":
        cmp = cmpText(
          primaryContact.get(a.id)?.name,
          primaryContact.get(b.id)?.name,
        );
        break;
      case "vacancies":
        cmp =
          (openVacancies.get(a.id)?.length ?? 0) -
          (openVacancies.get(b.id)?.length ?? 0);
        break;
      case "followup":
        cmp = cmpText(nextFollowUp.get(a.id), nextFollowUp.get(b.id));
        break;
      case "status":
        cmp = cmpText(a.status, b.status);
        break;
      default:
        cmp = cmpText(a.name, b.name);
    }
    if (cmp === 0) cmp = cmpText(a.name, b.name);
    return dir === "desc" ? -cmp : cmp;
  });

  const today = todayIso();
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const headerProps = {
    activeKey: sort,
    dir,
    basePath: BASE_PATH[scope],
  };

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

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {isActief && followUpNotes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Opvolgen ({followUpNotes.length})
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {followUpNotes.map((n) => {
              const overdue = (n.follow_up_on ?? "") < today;
              const isToday = n.follow_up_on === today;
              return (
                <li key={n.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/klanten/${n.client_id}`}
                        className="font-medium text-navy hover:underline dark:text-cream"
                      >
                        {clientName.get(n.client_id) ?? "Klant"}
                      </Link>
                      {n.body && (
                        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                          {n.body}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap text-xs tabular-nums ${
                        overdue
                          ? "font-medium text-red-600"
                          : isToday
                            ? "font-medium text-amber-600"
                            : "text-zinc-500"
                      }`}
                    >
                      {formatDate(n.follow_up_on)}
                    </span>
                  </div>
                  <form action={toggleFollowUp} className="mt-2">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      title="Haalt deze opvolgactie uit de lijst"
                    >
                      Markeer als afgehandeld
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!error && (!clients || clients.length === 0) && (
        <div className={emptyState}>{meta.empty}</div>
      )}

      {/* Mobiel: kaart per relatie */}
      {!error && clients && clients.length > 0 && (
        <ul className="mt-4 space-y-2 md:hidden">
          {sorted.map((client) => {
            const note = latestNote.get(client.id);
            const fu = nextFollowUp.get(client.id);
            const overdue = fu != null && fu <= today;
            const contact = primaryContact.get(client.id);
            const vacs = openVacancies.get(client.id) ?? [];
            return (
              <li
                key={client.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/klanten/${client.id}`}
                    className="font-medium text-navy hover:underline dark:text-cream"
                  >
                    {client.name}
                  </Link>
                  {isActief ? (
                    vacs.length > 0 && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                        {vacs.length} vac.
                      </span>
                    )
                  ) : (
                    <ClientStatusBadge status={client.status} />
                  )}
                </div>

                {isActief && (
                  <>
                    {contact && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {contact.name}
                        {contact.email ? ` · ${contact.email}` : ""}
                      </p>
                    )}
                    {vacs.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {vacs.join(" · ")}
                      </p>
                    )}
                    {(fu || note) && (
                      <p className="mt-1.5 text-xs">
                        {fu && (
                          <span
                            className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                              overdue
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {formatDate(fu)}
                          </span>
                        )}
                        {note && (
                          <span className="text-zinc-500">{note.body}</span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Tablet en breder: sorteerbare tabel */}
      {!error && clients && clients.length > 0 && (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <SortHeader label="Naam" columnKey="name" {...headerProps} />
                {isActief ? (
                  <>
                    <SortHeader
                      label="Primaire contactpersoon"
                      columnKey="contact"
                      {...headerProps}
                    />
                    <SortHeader
                      label="Vac. open"
                      columnKey="vacancies"
                      {...headerProps}
                    />
                    <SortHeader
                      label="Laatste notitie / opvolgen"
                      columnKey="followup"
                      {...headerProps}
                    />
                  </>
                ) : (
                  <SortHeader
                    label="Status"
                    columnKey="status"
                    {...headerProps}
                  />
                )}
              </tr>
            </thead>
            <tbody className={tbody}>
              {sorted.map((client) => {
                const note = latestNote.get(client.id);
                const fu = nextFollowUp.get(client.id);
                const overdue = fu != null && fu <= today;
                const contact = primaryContact.get(client.id);
                const vacs = openVacancies.get(client.id) ?? [];
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

                    {isActief ? (
                      <>
                        <td className={td}>
                          {contact ? (
                            <span>
                              <span className="text-zinc-800 dark:text-zinc-200">
                                {contact.name}
                              </span>
                              {contact.email && (
                                <span className="block text-xs text-zinc-400">
                                  {contact.email}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className={`${td} max-w-xs`}>
                          {vacs.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {vacs.map((titel, i) => (
                                <li
                                  key={i}
                                  className="text-zinc-700 dark:text-zinc-300"
                                >
                                  {titel}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>

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
                              <span className="line-clamp-1" title={note.body}>
                                {note.body}
                              </span>
                            ) : (
                              "—"
                            )}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className={td}>
                        <ClientStatusBadge status={client.status} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isActief && (
        <p className="mt-10 text-xs text-zinc-400">
          <Link
            href="/archief"
            className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Archief (inactieve relaties) →
          </Link>
        </p>
      )}
    </div>
  );
}
