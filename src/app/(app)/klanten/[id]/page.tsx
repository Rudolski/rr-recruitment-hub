import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { FileManager } from "@/components/file-manager";
import { btnDanger } from "@/components/ui";
import { ClientForm } from "../client-form";
import { deleteKlant, updateKlant } from "../actions";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, StoredFile } from "@/lib/types";

export const metadata = { title: "Klant · RR Recruitment Hub" };

export default async function KlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle<Client>();

  if (!client) {
    notFound();
  }

  const { data: files, error: filesError } = await supabase
    .from("stored_files")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .returns<StoredFile[]>();

  const filesTableMissing =
    !!filesError && /stored_files/.test(filesError.message);

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/klanten" label="Klanten" />
      <h1 className="mt-2 font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
        {client.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Gegevens en bestanden. Tabbladen voor contacten, vacatures, placements en
        facturen volgen later.
      </p>

      <div className="mt-6">
        <ClientForm
          action={updateKlant}
          initial={client}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Bestanden
        </h2>
        {filesTableMissing ? (
          <p className="text-sm text-zinc-500">
            Bestandsopslag nog niet ingericht — draai{" "}
            <code>supabase/migrations/004_file_storage.sql</code>.
          </p>
        ) : (
          <FileManager files={files ?? []} scope="client" clientId={client.id} />
        )}
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteKlant}>
          <input type="hidden" name="id" value={client.id} />
          <button type="submit" className={btnDanger}>
            Klant verwijderen
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">
          Verwijderen kan niet als er nog vacatures, placements of facturen aan
          deze klant hangen.
        </p>
      </div>
    </div>
  );
}
