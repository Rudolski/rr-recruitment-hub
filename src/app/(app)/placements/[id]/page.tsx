import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { InvoiceLines } from "@/components/invoice-lines";
import { btnDanger } from "@/components/ui";
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

  const [{ data: clients }, { data: vacancies }, { data: invoices }] =
    await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("vacancies")
        .select("id, title, client_id")
        .returns<Pick<Vacancy, "id" | "title" | "client_id">[]>(),
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
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        {placement.candidate_name || "Placement"}
      </h1>

      <div className="mt-6">
        <PlacementForm
          action={updatePlacement}
          clients={clients ?? []}
          vacancies={vacancies ?? []}
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
            className="text-sm text-terra underline hover:text-terra-dark"
          >
            Extra factuurregel
          </Link>
        </div>
        <InvoiceLines invoices={invoices ?? []} />
        <p className="mt-2 text-xs text-zinc-400">
          Een partneraandeel (bijv. Juul) vul je op de factuurregel zelf in bij
          &ldquo;Aandeel naar partner&rdquo;; het gaat automatisch van de
          netto-omzet af.
        </p>
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
