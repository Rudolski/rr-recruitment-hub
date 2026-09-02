import { PageHeader } from "@/components/page-header";
import { FeeCalculator } from "./calculator";

export const metadata = { title: "Fee calculator · RR Recruitment Hub" };

export default function FeeCalculatorPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Fee calculator"
        description="Snel een fee bepalen op basis van jaarsalaris en percentage."
      />
      <FeeCalculator />
    </div>
  );
}
