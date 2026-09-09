import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SortHeader, cmpText, readSort } from "@/components/sort-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  td,
  thead,
  tr,
} from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Client, Contact } from "@/lib/types";

export const metadata = { title: "Contactpersonen · RR Recruitment Hub" };

const SORT_KEYS = [
  "name",
  "client",
  "role",
  "email",
  "phone",
  "primary",
] as const;

export default async function ContactpersonenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const { sort, dir } = readSort(await searchParams, SORT_KEYS, "name");
  const sorted = [...(contacts ?? [])].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "client":
        cmp = cmpText(
          clientName.get(a.client_id),
          clientName.get(b.client_id),
        );
        break;
      case "role":
        cmp = cmpText(a.role, b.role);
        break;
      case "email":
        cmp = cmpText(a.email, b.email);
        break;
      case "phone":
        cmp = cmpText(a.phone, b.phone);
        break;
      case "primary":
        cmp = (a.is_primary ? 1 : 0) - (b.is_primary ? 1 : 0);
        break;
      default:
        cmp = cmpText(a.name, b.name);
    }
    if (cmp === 0) cmp = cmpText(a.name, b.name);
    return dir === "desc" ? -cmp : cmp;
  });

  const headerProps = {
    activeKey: sort,
    dir,
    basePath: "/contactpersonen",
  };

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

      {/* Mobiel: kaart per contactpersoon */}
      {!error && contacts && contacts.length > 0 && (
        <ul className="mt-4 space-y-2 md:hidden">
          {sorted.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/contactpersonen/${c.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {c.name}
                </Link>
                {c.is_primary && (
                  <span className="shrink-0 text-xs text-terra">primair</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {c.role ? `${c.role} · ` : ""}
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
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-terra hover:underline"
                  >
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/\s+/g, "")}`}
                    className="text-terra hover:underline"
                  >
                    {c.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Tablet en breder: sorteerbare tabel */}
      {!error && contacts && contacts.length > 0 && (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <SortHeader label="Naam" columnKey="name" {...headerProps} />
                <SortHeader label="Klant" columnKey="client" {...headerProps} />
                <SortHeader label="Rol" columnKey="role" {...headerProps} />
                <SortHeader label="E-mail" columnKey="email" {...headerProps} />
                <SortHeader
                  label="Telefoon"
                  columnKey="phone"
                  {...headerProps}
                />
                <SortHeader
                  label="Primair"
                  columnKey="primary"
                  {...headerProps}
                />
              </tr>
            </thead>
            <tbody className={tbody}>
              {sorted.map((c) => (
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
