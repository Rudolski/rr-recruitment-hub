import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Vacancy } from "@/lib/types";
import { PlacementForm } from "../placement-form";
import { createPlacement } from "../actions";

export const metadata = { title: "Nieuwe placement · RR Recruitment Hub" };

export default async function NieuwePlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const sp = await searchParams;
  const str = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;

  const [{ data: clients }, { data: vacancies }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase
      .from("vacancies")
      .select("id, title, client_id")
      .order("created_at", { ascending: false })
      .returns<Pick<Vacancy, "id" | "title" | "client_id">[]>(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/placements" label="Placements" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        Nieuwe placement
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Leg de plaatsing vast. De Hub maakt automatisch een factuurregel voor
        de fee aan (op concept).
      </p>
      <div className="mt-6">
        <PlacementForm
          action={createPlacement}
          clients={clients ?? []}
          vacancies={vacancies ?? []}
          submitLabel="Placement opslaan"
          withInvoiceSection
          defaultVacancyId={str("vacature")}
          defaultClientId={str("klant")}
          defaultFee={str("fee")}
          defaultPartnerName={str("partner")}
          defaultPartnerPct={str("partnerpct")}
        />
      </div>
    </div>
  );
}
