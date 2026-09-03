import { KlantenList } from "../klanten/klanten-list";

export const metadata = { title: "Prospects · RR Recruitment Hub" };

export default function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <KlantenList scope="prospects" searchParams={searchParams} />;
}
