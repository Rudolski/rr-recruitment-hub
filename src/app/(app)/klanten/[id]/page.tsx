import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "../client-form";
import { deleteKlant, updateKlant } from "../actions";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client } from "@/lib/types";

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

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/klanten"
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Klanten
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {client.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Gegevens. Tabbladen voor contacten, vacatures, placements en facturen
        volgen later.
      </p>

      <div className="mt-6">
        <ClientForm
          action={updateKlant}
          initial={client}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteKlant}>
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
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
