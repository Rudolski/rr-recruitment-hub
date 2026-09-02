import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "Dashboard · RR Recruitment Hub" };

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Behaalde omzet tot nu toe, gebaseerd op facturen met status verzonden of verder, exclusief btw en filterbaar op klant en periode (standaard dit jaar). Daarnaast de prognose voor de lopende en volgende maand: per openstaande vacature de verwachte fee maal het slagingspercentage, opgeteld per maand."
    />
  );
}
