import { KlantenList } from "../klanten/klanten-list";

export const metadata = { title: "Archief · RR Recruitment Hub" };

export default function ArchiefPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <KlantenList scope="archief" searchParams={searchParams} />;
}
