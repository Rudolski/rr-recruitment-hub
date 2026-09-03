import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { PlacementStatusBadge } from "@/components/status-badge";
import { btnDanger, btnPrimary } from "@/components/ui";
import { eur, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Placement, Vacancy } from "@/lib/types";
import { VacancyForm } from "../vacancy-form";
import { deleteVacature, updateVacature } from "../actions";

export const metadata = { title: "Vacature · RR Recruitment Hub" };

export default async function VacatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: vacancy } = await supabase
    .from("vacancies")
    .select("*")
    .eq("id", id)
    .maybeSingle<Vacancy>();

  if (!vacancy) notFound();

  const [{ data: clients }, { data: placements }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("placements")
      .select("*")
      .eq("vacancy_id", id)
      .order("created_at", { ascending: false })
      .returns<Placement[]>(),
  ]);

  const clientName =
    (clients as Pick<Client, "id" | "name">[] | null)?.find(
      (c) => c.id === vacancy.client_id,
    )?.name ?? null;

  const canPlace =
    Number(vacancy.success_probability) === 100 &&
    (placements ?? []).length === 0;

  const placeUrl =
    `/placements/nieuw?vacature=${vacancy.id}&klant=${vacancy.client_id}` +
    (vacancy.expected_fee != null ? `&fee=${vacancy.expected_fee}` : "") +
    (Number(vacancy.partner_pct) > 0
      ? `&partner=Juul&partnerpct=${vacancy.partner_pct}`
      : "");

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/vacatures" label="Vacatures" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        {vacancy.title}
      </h1>
      {clientName && (
        <p className="mt-1 text-sm text-zinc-500">
          <Link
            href={`/klanten/${vacancy.client_id}`}
            className="hover:underline"
          >
            {clientName}
          </Link>
        </p>
      )}

      {canPlace && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-terra/40 bg-terra/5 px-4 py-3">
          <p className="text-sm text-navy dark:text-cream">
            Slagingskans staat op 100%.
          </p>
          <Link href={placeUrl} className={btnPrimary}>
            Vervuld → placement aanmaken
          </Link>
        </div>
      )}

      {placements && placements.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Placements
          </h2>
          <ul className="space-y-2">
            {placements.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <Link
                  href={`/placements/${p.id}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {p.candidate_name || "Placement"}
                </Link>
                <span className="flex items-center gap-3 text-zinc-500">
                  <span>{formatDate(p.start_date)}</span>
                  <span className="tabular-nums">{eur(p.fee_amount)}</span>
                  <PlacementStatusBadge status={p.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Gegevens
        </h2>
        <VacancyForm
          action={updateVacature}
          clients={clients ?? []}
          initial={vacancy}
          submitLabel="Wijzigingen opslaan"
        />
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteVacature}>
          <input type="hidden" name="id" value={vacancy.id} />
          <button type="submit" className={btnDanger}>
            Vacature verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
