import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  ACQUISITION_FUNNEL,
  CLIENT_STATUS_LABELS,
  type Client,
  type ClientNote,
} from "@/lib/types";
import { toggleFollowUp } from "../klanten/notes-actions";

export const metadata = { title: "Acquisitie · RR Recruitment Hub" };

const todayIso = () => new Date().toISOString().slice(0, 10);

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
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const today = todayIso();

  // Volgende opvolgdatum per klant
  const nextFollowUp = new Map<string, string>();
  for (const n of notes ?? []) {
    if (n.follow_up_on && !nextFollowUp.has(n.client_id)) {
      nextFollowUp.set(n.client_id, n.follow_up_on);
    }
  }

  const byStage = new Map<string, Pick<Client, "id" | "name" | "status">[]>();
  for (const c of clients ?? []) {
    const list = byStage.get(c.status) ?? [];
    list.push(c);
    byStage.set(c.status, list);
  }
  const stages = [...ACQUISITION_FUNNEL, "inactief"];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Acquisitie"
        description="Je funnel en de openstaande opvolgacties."
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
          Opvolgen
        </h2>
        {!notes || notes.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Geen openstaande opvolgacties.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {notes.map((n) => {
              const overdue = (n.follow_up_on ?? "") < today;
              const isToday = n.follow_up_on === today;
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <span
                    className={`w-24 shrink-0 tabular-nums ${
                      overdue
                        ? "font-medium text-red-600"
                        : isToday
                          ? "font-medium text-amber-600"
                          : "text-zinc-500"
                    }`}
                  >
                    {formatDate(n.follow_up_on)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/klanten/${n.client_id}`}
                      className="font-medium text-navy hover:underline dark:text-cream"
                    >
                      {clientName.get(n.client_id) ?? "Klant"}
                    </Link>
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      {n.body}
                    </span>
                  </span>
                  <form action={toggleFollowUp}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Afgehandeld
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
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => {
            const list = byStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                  {CLIENT_STATUS_LABELS[
                    stage as keyof typeof CLIENT_STATUS_LABELS
                  ] ?? stage}{" "}
                  <span className="text-zinc-400">({list.length})</span>
                </div>
                {list.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-400">—</p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {list.map((c) => (
                      <li key={c.id} className="px-3 py-2 text-sm">
                        <Link
                          href={`/klanten/${c.id}`}
                          className="text-navy hover:underline dark:text-cream"
                        >
                          {c.name}
                        </Link>
                        {nextFollowUp.get(c.id) && (
                          <span className="ml-2 text-xs text-zinc-400">
                            {formatDate(nextFollowUp.get(c.id))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
