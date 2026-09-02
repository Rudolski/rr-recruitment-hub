import Link from "next/link";
import { ClientStatusBadge } from "@/components/status-badge";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client } from "@/lib/types";

export const metadata = { title: "Klanten · RR Recruitment Hub" };

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function KlantenPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Klanten
        </h1>
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code> in de Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true })
    .returns<Client[]>();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Klanten
        </h1>
        <Link
          href="/klanten/nieuw"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Nieuwe klant
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Klanten laden mislukt: {error.message}
        </p>
      )}

      {!error && (!clients || clients.length === 0) && (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-5 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Nog geen klanten.</p>
          <Link
            href="/klanten/nieuw"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste klant toe
          </Link>
        </div>
      )}

      {!error && clients && clients.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2.5 font-medium">Naam</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Sector</th>
                <th className="px-4 py-2.5 font-medium">Regio</th>
                <th className="px-4 py-2.5 font-medium">Aangemaakt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/klanten/${client.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {client.sector ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {client.region ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {dateFmt.format(new Date(client.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
