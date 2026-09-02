import { BackLink } from "@/components/page-header";
import { getSessionContext } from "@/utils/supabase/auth";
import { ContactForm } from "../contact-form";
import { createContact } from "../actions";

export const metadata = { title: "Nieuwe contactpersoon · RR Recruitment Hub" };

export default async function NieuweContactpersoonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await getSessionContext();
  const params = await searchParams;
  const lockedClientId =
    typeof params.klant === "string" ? params.klant : undefined;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/contactpersonen" label="Contactpersonen" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe contactpersoon
      </h1>
      <div className="mt-6">
        <ContactForm
          action={createContact}
          clients={clients ?? []}
          lockedClientId={lockedClientId}
          submitLabel="Contactpersoon opslaan"
        />
      </div>
    </div>
  );
}
