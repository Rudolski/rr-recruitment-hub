import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { btnDanger } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import type { Invoice } from "@/lib/types";
import { InvoiceForm } from "../invoice-form";
import { deleteFactuur, updateFactuur } from "../actions";
import { loadPlacementOptions } from "../helpers";

export const metadata = { title: "Factuur · RR Recruitment Hub" };

export default async function FactuurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<Invoice>();

  if (!invoice) notFound();

  const [{ data: clients }, placements] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    loadPlacementOptions(supabase),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/facturen" label="Facturen" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {invoice.invoice_number || "Factuurregel"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Aangemaakt {formatDate(invoice.created_at)}
        {invoice.sent_at && ` · verzonden ${formatDate(invoice.sent_at)}`}
      </p>

      <div className="mt-6">
        <InvoiceForm
          action={updateFactuur}
          clients={clients ?? []}
          placements={placements}
          initial={invoice}
          submitLabel="Wijzigingen opslaan"
        />
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteFactuur}>
          <input type="hidden" name="id" value={invoice.id} />
          <button type="submit" className={btnDanger}>
            Factuurregel verwijderen
          </button>
        </form>
      </div>
    </div>
  );
}
