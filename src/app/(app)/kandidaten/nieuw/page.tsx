import { BackLink } from "@/components/page-header";
import { CandidateForm } from "../candidate-form";
import { createKandidaat } from "../actions";

export const metadata = { title: "Nieuwe kandidaat · RR Recruitment Hub" };

export default function NieuweKandidaatPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/kandidaten" label="Kandidaten" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe kandidaat
      </h1>
      <div className="mt-6">
        <CandidateForm
          action={createKandidaat}
          submitLabel="Kandidaat opslaan"
        />
      </div>
    </div>
  );
}
