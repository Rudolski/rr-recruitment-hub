import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { btnPrimary, errorBox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type {
  Client,
  Contact,
  WatchSource,
  WatchVacancy,
} from "@/lib/types";
import { scanNow } from "./actions";
import { RadarSources } from "./radar-sources";

export const metadata = { title: "Vacature-radar · RR Recruitment Hub" };

const DAY = 86400000;

/** Voor het eerst gezien in de afgelopen 7 dagen? */
function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * DAY;
}

export default async function RadarPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Vacature-radar" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const [{ data: sources, error }, { data: vacancies }, { data: clients }] =
    await Promise.all([
      supabase
        .from("watch_sources")
        .select("*")
        .order("name")
        .returns<WatchSource[]>(),
      supabase
        .from("watch_vacancies")
        .select("*")
        .order("first_seen_at", { ascending: false })
        .limit(2000)
        .returns<WatchVacancy[]>(),
      supabase
        .from("clients")
        .select("id, name")
        .order("name")
        .returns<Pick<Client, "id" | "name">[]>(),
    ]);

  const tableMissing = !!error && /watch_sources/.test(error.message);

  // Primaire contactpersoon per klant (voor klant-bronnen).
  const klantClientIds = (sources ?? [])
    .filter((s) => s.kind === "klant" && s.client_id)
    .map((s) => s.client_id as string);
  const primaryContact = new Map<
    string,
    Pick<Contact, "name" | "email" | "phone">
  >();
  if (klantClientIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("client_id, name, email, phone")
      .eq("is_primary", true)
      .in("client_id", klantClientIds)
      .returns<Pick<Contact, "client_id" | "name" | "email" | "phone">[]>();
    for (const c of contacts ?? [])
      if (!primaryContact.has(c.client_id)) primaryContact.set(c.client_id, c);
  }

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const openBySource = new Map<string, WatchVacancy[]>();
  const closedBySource = new Map<string, WatchVacancy[]>();
  for (const v of vacancies ?? []) {
    const target = v.closed_at ? closedBySource : openBySource;
    const list = target.get(v.source_id) ?? [];
    list.push(v);
    target.set(v.source_id, list);
  }
  // Openstaande vacatures: nieuwste plaatsingsdatum eerst (valt terug op
  // wanneer wij 'm zagen als er geen datum op de site stond).
  const postKey = (v: WatchVacancy) => v.posted_on ?? v.first_seen_at.slice(0, 10);
  for (const list of openBySource.values())
    list.sort((a, b) => postKey(b).localeCompare(postKey(a)));

  // Archief op verdwijndatum, nieuwste eerst.
  for (const list of closedBySource.values())
    list.sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""));

  const kinds: Array<"klant" | "concurrent"> = ["klant", "concurrent"];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Vacature-radar"
        description="Dagelijks worden de opgegeven websites afgetast; nieuw gevonden vacatures komen hier binnen."
        action={
          <form action={scanNow}>
            <button type="submit" className={btnPrimary}>
              Scan nu
            </button>
          </form>
        }
      />

      {tableMissing && (
        <p className={errorBox}>
          De tabellen bestaan nog niet. Draai{" "}
          <code>supabase/migrations/011_vacature_radar.sql</code>.
        </p>
      )}

      {!tableMissing &&
        kinds.map((kind) => {
          const list = (sources ?? []).filter((s) => s.kind === kind);
          return (
            <section key={kind} className="mt-8">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {kind === "klant" ? "Klanten" : "Concurrenten"}
              </h2>

              {list.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
                  Nog geen bronnen. Voeg er hieronder een toe.
                </p>
              ) : (
                <div className="mt-3 space-y-5">
                  {list.map((s) => {
                    const vacs = openBySource.get(s.id) ?? [];
                    const archived = closedBySource.get(s.id) ?? [];
                    const contact = s.client_id
                      ? primaryContact.get(s.client_id)
                      : undefined;
                    return (
                      <div
                        key={s.id}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                          <div>
                            <span className="font-medium text-navy dark:text-cream">
                              {s.name}
                            </span>
                            {!s.active && (
                              <span className="ml-2 text-xs text-zinc-400">
                                (uit)
                              </span>
                            )}
                            {contact && (
                              <span className="ml-3 text-xs text-zinc-500">
                                {contact.name}
                                {contact.email ? ` · ${contact.email}` : ""}
                                {contact.phone ? ` · ${contact.phone}` : ""}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400">
                            {s.last_scan_at
                              ? `laatste scan ${formatDate(s.last_scan_at)} · ${
                                  s.last_scan_note ?? s.last_scan_status ?? ""
                                }`
                              : "nog niet gescand"}
                          </span>
                        </div>

                        {s.last_scan_status === "error" && (
                          <p className="px-4 py-2 text-xs text-red-600">
                            Scanfout: {s.last_scan_note}
                          </p>
                        )}

                        {vacs.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-zinc-400">
                            Geen openstaande vacatures gevonden.
                          </p>
                        ) : (
                          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {vacs.map((v) => {
                              const isNew = isRecent(v.first_seen_at);
                              return (
                                <li
                                  key={v.id}
                                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-sm"
                                >
                                  {isNew && (
                                    <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                                      nieuw
                                    </span>
                                  )}
                                  {v.company && (
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                      {v.company}
                                    </span>
                                  )}
                                  <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-navy hover:underline dark:text-cream"
                                  >
                                    {v.title}
                                  </a>
                                  {v.location && (
                                    <span className="text-zinc-500">
                                      {v.location}
                                    </span>
                                  )}
                                  <span className="ml-auto text-xs tabular-nums text-zinc-500">
                                    {v.posted_on
                                      ? `geplaatst ${formatDate(v.posted_on)}`
                                      : `gezien ${formatDate(v.first_seen_at)}`}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {archived.length > 0 && (
                          <details className="border-t border-zinc-100 dark:border-zinc-800">
                            <summary className="cursor-pointer px-4 py-2 text-xs text-zinc-500">
                              Gearchiveerd ({archived.length}) — vacatures die
                              van de site zijn verdwenen
                            </summary>
                            <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                              {archived.map((v) => (
                                <li
                                  key={v.id}
                                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-sm text-zinc-500"
                                >
                                  {v.company && (
                                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                      {v.company}
                                    </span>
                                  )}
                                  <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline"
                                  >
                                    {v.title}
                                  </a>
                                  {v.location && <span>{v.location}</span>}
                                  <span className="ml-auto text-xs">
                                    {v.posted_on
                                      ? `geplaatst ${formatDate(v.posted_on)} · `
                                      : ""}
                                    weg sinds{" "}
                                    {v.closed_at ? formatDate(v.closed_at) : "—"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

      {!tableMissing && (
        <details className="mt-10 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
            Bronnen beheren ({(sources ?? []).length})
          </summary>
          <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
            <RadarSources
              sources={sources ?? []}
              clients={clients ?? []}
              clientName={Object.fromEntries(clientName)}
            />
          </div>
        </details>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Prospects volgen kan later met hetzelfde mechanisme.{" "}
        <Link href="/acquisitie" className="underline">
          Acquisitie
        </Link>
      </p>
    </div>
  );
}
