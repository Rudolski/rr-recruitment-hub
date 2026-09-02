import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Contact } from "@/lib/types";

export const metadata = { title: "Contactpersonen · RR Recruitment Hub" };

export default async function ContactpersonenPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Contactpersonen" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const [{ data: contacts, error }, { data: clients }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .order("name", { ascending: true })
      .returns<Contact[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Contactpersonen"
        description="Alle contactpersonen, gekoppeld aan een klant."
        action={
          <Link href="/contactpersonen/nieuw" className={btnPrimary}>
            Nieuwe contactpersoon
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!contacts || contacts.length === 0) && (
        <div className={emptyState}>
          Nog geen contactpersonen.{" "}
          <Link
            href="/contactpersonen/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste toe
          </Link>
          .
        </div>
      )}

      {!error && contacts && contacts.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Naam</th>
                <th className={th}>Klant</th>
                <th className={th}>Rol</th>
                <th className={th}>E-mail</th>
                <th className={th}>Telefoon</th>
                <th className={th}>Primair</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {contacts.map((c) => (
                <tr key={c.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/contactpersonen/${c.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.client_id ? (
                      <Link
                        href={`/klanten/${c.client_id}`}
                        className="hover:underline"
                      >
                        {clientName.get(c.client_id) ?? "—"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.role ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.phone ?? "—"}
                  </td>
                  <td className={td}>{c.is_primary ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
