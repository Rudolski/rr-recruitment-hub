import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Contact, FeeAgreement } from "@/lib/types";
import { ContractForm } from "./contract-form";

export const metadata = {
  title: "Samenwerkingsovereenkomst · RR Recruitment Hub",
};

export default async function SamenwerkingsovereenkomstPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();
  const params = await searchParams;

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Samenwerkingsovereenkomst" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: clients }, { data: contacts }, { data: fees }] =
    await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("contacts")
        .select("id, client_id, name, role")
        .returns<Pick<Contact, "id" | "client_id" | "name" | "role">[]>(),
      supabase
        .from("fee_agreements")
        .select("client_id, percentage")
        .returns<Pick<FeeAgreement, "client_id" | "percentage">[]>(),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Samenwerkingsovereenkomst"
        description="Vul de samenwerkingsovereenkomst en download 'm als Word-document. Kies een klant om velden voor te vullen."
      />

      {params.fout === "bedrijf" && (
        <p className={errorBox}>Vul minimaal het bedrijf in.</p>
      )}
      {params.fout === "genereren" && (
        <p className={errorBox}>
          Genereren mislukt. Controleer de velden en probeer opnieuw.
        </p>
      )}

      <ContractForm
        clients={(clients as Pick<Client, "id" | "name">[] | null) ?? []}
        contacts={contacts ?? []}
        fees={fees ?? []}
      />
    </div>
  );
}
