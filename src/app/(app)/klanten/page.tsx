import { KlantenList } from "./klanten-list";

export const metadata = { title: "Klanten · RR Recruitment Hub" };

export default function KlantenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <KlantenList scope="actief" searchParams={searchParams} />;
}
