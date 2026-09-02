import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { btnDanger } from "@/components/ui";
import { eur2, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Invoice, Placement, Vacancy } from "@/lib/types";
import { PlacementForm } from "../placement-form";
import { deletePlacement, updatePlacement } from "../actions";

export const metadata = { title: "Placement · RR Recruitment Hub" };

export default async function PlacementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: placement } = await supabase
    .from("placements")
    .select("*")
    .eq("id", id)
    .maybeSingle<Placement>();

  if (!placement) notFound();

  const [{ data: clients }, { data: vacancies }, { data: candidates }, { data: invoices }] =
    await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("vacancies")
        .select("id, title, client_id")
        .returns<Pick<Vacancy, "id" | "title" | "client_id">[]>(),
      supabase.from("candidates").select("id, name").order("name"),
      supabase
        .from("invoices")
        .select("*")
        .eq("placement_id", id)
        .order("created_at", { ascending: true })
        .returns<Invoice[]>(),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/placements" label="Placements" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Placement
      </h1>

      <div className="mt-6">
        <PlacementForm
          action={updatePlacement}
          clients={clients ?? []}
          vacancies={vacancies ?? []}
          candidates={candidates ?? []}
          initial={placement}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Facturen
          </h2>
          <Link
            href={`/facturen/nieuw?placement=${placement.id}`}
            className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Factuurregel toevoegen
          </Link>
        </div>
        {!invoices || invoices.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Nog geen factuurregels voor deze placement.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <Link
                  href={`/facturen/${inv.id}`}
                  className="hover:underline"
                >
                  {inv.invoice_number || "(zonder nummer)"} —{" "}
                  {eur2(inv.amount_excl_btw)} excl. btw
                </Link>
                <span className="flex items-center gap-3">
                  <InvoiceStatusBadge status={inv.status} />
                  <span className="text-xs text-zinc-400">
                    {formatDate(inv.issue_date)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deletePlacement}>
          <input type="hidden" name="id" value={placement.id} />
          <button type="submit" className={btnDanger}>
            Placement verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
