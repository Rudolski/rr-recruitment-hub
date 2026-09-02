import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { btnDanger } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Contact } from "@/lib/types";
import { ContactForm } from "../contact-form";
import { deleteContact, updateContact } from "../actions";

export const metadata = { title: "Contactpersoon · RR Recruitment Hub" };

export default async function ContactpersoonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const [{ data: contact }, { data: clients }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle<Contact>(),
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/contactpersonen" label="Contactpersonen" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {contact.name}
      </h1>

      <div className="mt-6">
        <ContactForm
          action={updateContact}
          clients={clients ?? []}
          initial={contact}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteContact}>
          <input type="hidden" name="id" value={contact.id} />
          <button type="submit" className={btnDanger}>
            Contactpersoon verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
