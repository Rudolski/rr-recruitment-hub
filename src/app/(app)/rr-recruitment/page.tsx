import { PageHeader } from "@/components/page-header";
import { FileManager } from "@/components/file-manager";
import { errorBox } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { StoredFile } from "@/lib/types";

export const metadata = { title: "RR Recruitment · Huisstijl" };

export default async function RRRecruitmentPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="RR Recruitment" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const { data: files, error } = await supabase
    .from("stored_files")
    .select("*")
    .eq("scope", "brand")
    .order("created_at", { ascending: false })
    .returns<StoredFile[]>();

  const tableMissing = !!error && /stored_files/.test(error.message);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="RR Recruitment"
        description="Huisstijl: logo's, beeldmerk, afbeeldingen en stijldocumenten om centraal terug te vinden."
      />

      {tableMissing ? (
        <p className={errorBox}>
          De bestandsopslag is nog niet ingericht. Draai{" "}
          <code>supabase/migrations/004_file_storage.sql</code> in de Supabase
          SQL Editor.
        </p>
      ) : (
        <div className="mt-6">
          <FileManager files={files ?? []} scope="brand" />
        </div>
      )}
    </div>
  );
}
