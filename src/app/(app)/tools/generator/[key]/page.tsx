import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import { getGenerator } from "@/lib/generators";
import { GeneratorPanel } from "./generator-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const g = getGenerator(key);
  return { title: `${g?.label ?? "Generator"} · RR Recruitment Hub` };
}

export default async function GeneratorPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const generator = getGenerator(key);
  if (!generator) notFound();

  const { supabase, organizationId } = await getSessionContext();

  const { data: history, error } = await supabase
    .from("generated_documents")
    .select("id, title, content, created_at")
    .eq("type", key)
    .order("created_at", { ascending: false })
    .limit(10);

  const tableMissing =
    !!error && /generated_documents/.test(error.message);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={generator.label} description={generator.description} />

      {!organizationId && (
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      )}

      {tableMissing && (
        <p className={errorBox}>
          De tabel <code>generated_documents</code> bestaat nog niet. Draai{" "}
          <code>supabase/migrations/003_generated_documents.sql</code> in de
          Supabase SQL Editor. Zet ook <code>ANTHROPIC_API_KEY</code> in{" "}
          <code>.env.local</code>.
        </p>
      )}

      {organizationId && (
        <GeneratorPanel
          generatorKey={generator.key}
          fields={generator.fields}
          history={history ?? []}
        />
      )}
    </div>
  );
}
