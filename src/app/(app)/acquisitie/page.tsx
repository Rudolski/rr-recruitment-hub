import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { errorBox, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  PROSPECT_STATUSES,
  type AcquisitieLead,
  type Client,
  type ClientNote,
  type ClientStatus,
} from "@/lib/types";
import { toggleFollowUp, updateClientNote } from "../klanten/notes-actions";
import { AcquisitieBoard, type FunnelClient } from "./acquisitie-board";
import {
  addLead,
  convertLeadToClient,
  deleteLead,
  dismissLead,
  updateLead,
} from "./leads-actions";

export const metadata = { title: "Acquisitie · RR Recruitment Hub" };

const todayIso = () => new Date().toISOString().slice(0, 10);
const prospectSet = new Set<string>(PROSPECT_STATUSES);

export default async function AcquisitiePage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Acquisitie" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const [{ data: clients }, { data: notes, error }, { data: leads, error: leadsError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, status")
        .order("name")
        .returns<Pick<Client, "id" | "name" | "status">[]>(),
      supabase
        .from("client_notes")
        .select("*")
        .eq("follow_up_done", false)
        .not("follow_up_on", "is", null)
        .order("follow_up_on", { ascending: true })
        .returns<ClientNote[]>(),
      supabase
        .from("acquisitie_leads")
        .select("*")
        .eq("done", false)
        .order("approach_on", { ascending: true })
        .returns<AcquisitieLead[]>(),
    ]);

  const tableMissing = !!error && /client_notes/.test(error.message);
  const leadsTableMissing = !!leadsError && /acquisitie_leads/.test(leadsError.message);
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const today = todayIso();

  // Opvolgacties, maar alleen voor relaties die nog géén klant zijn —
  // klanten volg je op via het Klanten-tabblad.
  const followUps = (notes ?? []).filter(
    (n) => clientById.get(n.client_id)?.status !== "actief",
  );

  // Eerstvolgende opvolgdatum per relatie, voor op de kaartjes.
  const nextFollowUp = new Map<string, string>();
  for (const n of notes ?? []) {
    if (n.follow_up_on && !nextFollowUp.has(n.client_id)) {
      nextFollowUp.set(n.client_id, n.follow_up_on);
    }
  }

  const funnelClients: FunnelClient[] = (clients ?? [])
    .filter((c) => prospectSet.has(c.status))
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as ClientStatus,
      nextFollowUp: nextFollowUp.get(c.id) ?? null,
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Acquisitie"
        description="Je funnel en de openstaande opvolgacties (klanten niet meegerekend)."
      />

      {tableMissing && (
        <p className={errorBox}>
          De tabel <code>client_notes</code> bestaat nog niet. Draai{" "}
          <code>supabase/migrations/006_acquisitie.sql</code>.
        </p>
      )}
      {leadsTableMissing && (
        <p className={errorBox}>
          De tabel <code>acquisitie_leads</code> bestaat nog niet. Draai{" "}
          <code>supabase/migrations/019_acquisitie_leads.sql</code>.
        </p>
      )}

      {/* Bewaarlijst: LinkedIn-vacatures die nog geen relatie zijn */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Bewaarlijst ({(leads ?? []).length})
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Interessante vacatures van je LinkedIn-tijdlijn — nog niet het
          juiste moment om te benaderen. Verschijnt weer boven aan zodra
          de datum bereikt is.
        </p>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            + Post bewaren
          </summary>
          <form
            action={addLead}
            className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-2"
          >
            <label className="text-xs text-zinc-500 sm:col-span-2">
              <span className="block">LinkedIn-link</span>
              <input
                name="linkedin_url"
                type="text"
                required
                placeholder="https://www.linkedin.com/posts/..."
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-zinc-500">
              <span className="block">Bedrijf (indien bekend)</span>
              <input
                name="company_name"
                type="text"
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-zinc-500">
              <span className="block">Benaderen vanaf</span>
              <input
                name="approach_on"
                type="date"
                required
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-zinc-500 sm:col-span-2">
              <span className="block">Notitie</span>
              <textarea
                name="note"
                rows={2}
                placeholder="Wie postte 'm, wat maakt 'm interessant..."
                className={`${inputClass} mt-1`}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Bewaren
              </button>
            </div>
          </form>
        </details>

        {(leads ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nog niets bewaard.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {(leads ?? []).map((l) => {
              const overdue = l.approach_on < today;
              const isToday = l.approach_on === today;
              return (
                <li key={l.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={l.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-navy hover:underline dark:text-cream"
                      >
                        {l.company_name || "LinkedIn-post"}
                      </a>
                      {l.note && (
                        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                          {l.note}
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
                      {formatDate(l.approach_on)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <details>
                      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                        Omzetten naar klant
                      </summary>
                      <form
                        action={convertLeadToClient}
                        className="mt-2 flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="id" value={l.id} />
                        <label className="text-xs text-zinc-500">
                          <span className="block">Klantnaam</span>
                          <input
                            name="name"
                            type="text"
                            required
                            defaultValue={l.company_name ?? ""}
                            className={`${inputClass} mt-1 w-52`}
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Aanmaken
                        </button>
                      </form>
                    </details>
                    <form action={dismissLead}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        title="Niet (meer) interessant, verdwijnt uit de lijst"
                      >
                        Niet interessant
                      </button>
                    </form>
                    <form action={deleteLead}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                        title="Permanent verwijderen, bijv. bij een dubbele"
                      >
                        Verwijderen
                      </button>
                    </form>
                    <details>
                      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                        Bewerken
                      </summary>
                      <form action={updateLead} className="mt-2 space-y-2">
                        <input type="hidden" name="id" value={l.id} />
                        <label className="block text-xs text-zinc-500">
                          <span className="block">Bedrijf</span>
                          <input
                            name="company_name"
                            type="text"
                            defaultValue={l.company_name ?? ""}
                            className={`${inputClass} mt-1`}
                          />
                        </label>
                        <textarea
                          name="note"
                          rows={2}
                          defaultValue={l.note ?? ""}
                          className={`${inputClass} text-sm`}
                        />
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-xs text-zinc-500">
                            <span className="block">Benaderen vanaf</span>
                            <input
                              name="approach_on"
                              type="date"
                              required
                              defaultValue={l.approach_on}
                              className={`${inputClass} mt-1 w-44`}
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Opslaan
                          </button>
                        </div>
                      </form>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Opvolgen */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Opvolgen ({followUps.length})
        </h2>
        {followUps.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Geen openstaande opvolgacties.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {followUps.map((n) => {
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
                        {clientById.get(n.client_id)?.name ?? "Relatie"}
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
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <form action={toggleFollowUp}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        title="Haalt deze opvolgactie uit de lijst"
                      >
                        Markeer als afgehandeld
                      </button>
                    </form>
                    <details>
                      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                        Bewerken
                      </summary>
                      <form
                        action={updateClientNote}
                        className="mt-2 space-y-2"
                      >
                        <input type="hidden" name="id" value={n.id} />
                        <input
                          type="hidden"
                          name="client_id"
                          value={n.client_id}
                        />
                        <textarea
                          name="body"
                          required
                          rows={2}
                          defaultValue={n.body}
                          className={`${inputClass} text-sm`}
                        />
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-xs text-zinc-500">
                            <span className="block">Opvolgen op</span>
                            <input
                              name="follow_up_on"
                              type="date"
                              defaultValue={n.follow_up_on ?? ""}
                              className={`${inputClass} mt-1 w-44`}
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Opslaan
                          </button>
                        </div>
                      </form>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Funnel */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Funnel
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sleep een relatie naar een andere fase om de status te wijzigen.
        </p>
        <div className="mt-3">
          <AcquisitieBoard clients={funnelClients} />
        </div>
      </section>
    </div>
  );
}
