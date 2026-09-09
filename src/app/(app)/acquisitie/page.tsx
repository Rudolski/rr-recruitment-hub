import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  PROSPECT_STATUSES,
  type Client,
  type ClientNote,
  type ClientStatus,
} from "@/lib/types";
import { toggleFollowUp } from "../klanten/notes-actions";
import { AcquisitieBoard, type FunnelClient } from "./acquisitie-board";

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

  const [{ data: clients }, { data: notes, error }] = await Promise.all([
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
  ]);

  const tableMissing = !!error && /client_notes/.test(error.message);
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
