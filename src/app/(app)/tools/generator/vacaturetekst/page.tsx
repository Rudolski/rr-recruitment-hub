import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import { VacaturetekstForm } from "./vacaturetekst-form";

export const metadata = { title: "Vacaturetekst · RR Recruitment Hub" };

export default async function VacaturetekstPage() {
  const { supabase, organizationId } = await getSessionContext();

  const { data: history, error } = await supabase
    .from("generated_documents")
    .select("id, title, content, created_at")
    .eq("type", "vacaturetekst")
    .order("created_at", { ascending: false })
    .limit(10);

  const tableMissing = !!error && /generated_documents/.test(error.message);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Vacaturetekst"
        description="Herschrijf de originele vacature van de klant naar een tekst voor de RR-website (met klantnaam of anoniem) of voor een banensite."
      />

      {!organizationId && (
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      )}
      {tableMissing && (
        <p className={errorBox}>
          Draai <code>supabase/migrations/003_generated_documents.sql</code> en
          zet <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code>.
        </p>
      )}

      {organizationId && <VacaturetekstForm />}

      {organizationId && history && history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Geschiedenis
          </h2>
          <ul className="mt-3 space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-md border border-zinc-200 dark:border-zinc-800"
              >
                <details>
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {h.title || "Zonder titel"}
                    </span>
                    <span className="ml-2 text-xs text-zinc-400">
                      {formatDate(h.created_at)}
                    </span>
                  </summary>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                    {h.content}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
