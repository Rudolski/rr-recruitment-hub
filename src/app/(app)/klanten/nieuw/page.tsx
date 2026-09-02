import Link from "next/link";
import { ClientForm } from "../client-form";
import { createKlant } from "../actions";

export const metadata = { title: "Nieuwe klant · RR Recruitment Hub" };

export default function NieuweKlantPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/klanten"
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Klanten
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nieuwe klant
      </h1>
      <div className="mt-6">
        <ClientForm action={createKlant} submitLabel="Klant opslaan" />
      </div>
    </div>
  );
}
