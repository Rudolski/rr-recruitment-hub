import { BackLink } from "@/components/page-header";
import { KlantenList } from "../klanten/klanten-list";

export const metadata = { title: "Archief · RR Recruitment Hub" };

export default function ArchiefPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href="/klanten" label="Klanten" />
      <KlantenList scope="archief" searchParams={searchParams} />
    </div>
  );
}
