import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Vacancy } from "@/lib/types";
import { PlacementForm } from "../placement-form";
import { createPlacement } from "../actions";

export const metadata = { title: "Nieuwe placement · RR Recruitment Hub" };

export default async function NieuwePlacementPage() {
  const { supabase } = await getSessionContext();

  const [{ data: clients }, { data: vacancies }, { data: candidates }] =
    await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("vacancies")
        .select("id, title, client_id")
        .order("created_at", { ascending: false })
        .returns<Pick<Vacancy, "id" | "title" | "client_id">[]>(),
      supabase.from("candidates").select("id, name").order("name"),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/placements" label="Placements" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe placement
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Leg de plaatsing vast en optioneel meteen een factuurregel (op
        concept). Het factuurnummer voer je later los in.
      </p>
      <div className="mt-6">
        <PlacementForm
          action={createPlacement}
          clients={clients ?? []}
          vacancies={vacancies ?? []}
          candidates={candidates ?? []}
          submitLabel="Placement opslaan"
          withInvoiceSection
        />
      </div>
    </div>
  );
}
