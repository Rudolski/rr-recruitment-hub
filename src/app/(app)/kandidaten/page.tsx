import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CandidateStatusBadge } from "@/components/status-badge";
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
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Candidate } from "@/lib/types";

export const metadata = { title: "Kandidaten · RR Recruitment Hub" };

export default async function KandidatenPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Kandidaten" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Candidate[]>();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Kandidaten"
        description="Kandidatenbestand met status, huidige functie en bron."
        action={
          <Link href="/kandidaten/nieuw" className={btnPrimary}>
            Nieuwe kandidaat
          </Link>
        }
      />

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!candidates || candidates.length === 0) && (
        <div className={emptyState}>
          Nog geen kandidaten.{" "}
          <Link
            href="/kandidaten/nieuw"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Voeg de eerste toe
          </Link>
          .
        </div>
      )}

      {!error && candidates && candidates.length > 0 && (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Naam</th>
                <th className={th}>Status</th>
                <th className={th}>Huidige functie</th>
                <th className={th}>Bron</th>
                <th className={th}>Toegevoegd</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {candidates.map((c) => (
                <tr key={c.id} className={tr}>
                  <td className={td}>
                    <Link
                      href={`/kandidaten/${c.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className={td}>
                    <CandidateStatusBadge status={c.status} />
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.current_job_title ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {c.source ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(c.created_at)}
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
