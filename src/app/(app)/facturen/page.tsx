import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "Facturen · RR Recruitment Hub" };

export default function FacturenPage() {
  return (
    <PlaceholderPage
      title="Facturen"
      description="Registratie van facturen die in Snelstart Web worden gemaakt, geen factuurgenerator. Het factuurnummer wordt handmatig ingevoerd. Een regel start op concept; pas na handmatig op verzonden zetten (sent_at wordt dan vastgelegd) telt de factuur mee in behaalde omzet, dashboard en forecast. Btw standaard 21%, omzet altijd exclusief btw."
    />
  );
}
