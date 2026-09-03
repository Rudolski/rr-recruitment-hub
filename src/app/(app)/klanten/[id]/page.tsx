import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/page-header";
import { FileManager } from "@/components/file-manager";
import { InvoiceLines } from "@/components/invoice-lines";
import {
  ClientStatusBadge,
  PlacementStatusBadge,
  VacancyStatusBadge,
} from "@/components/status-badge";
import { btnDanger } from "@/components/ui";
import { eur, eur2, formatDate } from "@/lib/format";
import { splitOmzet } from "@/lib/omzet";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  FEE_AGREEMENT_TYPE_LABELS,
  type Client,
  type Contact,
  type FeeAgreement,
  type Invoice,
  type Placement,
  type StoredFile,
  type Vacancy,
} from "@/lib/types";
import { ClientForm } from "../client-form";
import { deleteKlant, updateKlant } from "../actions";

export const metadata = { title: "Klant · RR Recruitment Hub" };

const sectionTitle = "text-sm font-semibold text-zinc-900 dark:text-zinc-50";
const addLink = "text-sm text-terra underline hover:text-terra-dark";
const rowCard =
  "flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800";

export default async function KlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getSessionContext();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle<Client>();
  if (!client) notFound();

  const [
    { data: contacts },
    { data: feeAgreements },
    { data: vacancies },
    { data: placements },
    { data: invoices },
    { data: files, error: filesError },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("client_id", id)
      .order("is_primary", { ascending: false })
      .returns<Contact[]>(),
    supabase
      .from("fee_agreements")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<FeeAgreement[]>(),
    supabase
      .from("vacancies")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<Vacancy[]>(),
    supabase
      .from("placements")
      .select("*")
      .eq("client_id", id)
      .order("start_date", { ascending: false, nullsFirst: false })
      .returns<Placement[]>(),
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", id)
      .order("issue_date", { ascending: false, nullsFirst: true })
      .returns<Invoice[]>(),
    supabase
      .from("stored_files")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .returns<StoredFile[]>(),
  ]);

  const vacancyTitle = new Map((vacancies ?? []).map((v) => [v.id, v.title]));
  const omzet = splitOmzet(invoices ?? []);

  const feeSummary = (fa: FeeAgreement) => {
    if (fa.type === "percentage")
      return fa.percentage != null ? `${fa.percentage}%` : "—";
    if (fa.type === "vast_bedrag") return eur(fa.fixed_amount);
    return "Staffel";
  };
  const filesTableMissing =
    !!filesError && /stored_files/.test(filesError.message);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/klanten" label="Klanten" />
      <div className="mt-2 flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-roc)] text-2xl font-medium tracking-tight text-navy dark:text-cream">
          {client.name}
        </h1>
        <ClientStatusBadge status={client.status} />
      </div>

      {/* Omzet */}
      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Omzet</h2>
          <Link
            href={`/rapportages/omzet-per-klant/${client.id}`}
            className={addLink}
          >
            Opbouw bekijken
          </Link>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Netto{" "}
          <span className="text-lg font-semibold text-navy dark:text-cream">
            {eur2(omzet.netto)}
          </span>
          <span className="ml-2 text-xs text-zinc-400">
            bruto {eur2(omzet.bruto)}
            {omzet.partners.length > 0 &&
              ` · ${omzet.partners
                .map((p) => `${p.name} ${eur2(p.amount)}`)
                .join(", ")}`}
          </span>
        </p>
      </section>

      {/* Fee-afspraken */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Fee-afspraken</h2>
          <Link
            href={`/fee-afspraken/nieuw?klant=${client.id}`}
            className={addLink}
          >
            Toevoegen
          </Link>
        </div>
        {!feeAgreements || feeAgreements.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nog geen fee-afspraak.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {feeAgreements.map((fa) => (
              <li key={fa.id} className={rowCard}>
                <Link
                  href={`/fee-afspraken/${fa.id}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {FEE_AGREEMENT_TYPE_LABELS[
                    fa.type as keyof typeof FEE_AGREEMENT_TYPE_LABELS
                  ] ?? fa.type}{" "}
                  · {feeSummary(fa)}
                </Link>
                <span className="text-zinc-500">
                  {fa.minimum_fee != null && `min. ${eur(fa.minimum_fee)}`}
                  {fa.valid_from && ` · vanaf ${formatDate(fa.valid_from)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contactpersonen */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Contactpersonen</h2>
          <Link href={`/contactpersonen/nieuw?klant=${client.id}`} className={addLink}>
            Toevoegen
          </Link>
        </div>
        {!contacts || contacts.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nog geen contactpersonen.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className={rowCard}>
                <Link
                  href={`/contactpersonen/${c.id}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {c.name}
                  {c.is_primary && (
                    <span className="ml-2 text-xs text-terra">primair</span>
                  )}
                </Link>
                <span className="text-zinc-500">
                  {c.role ?? ""} {c.email ? `· ${c.email}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vacatures */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Vacatures</h2>
          <Link href={`/vacatures/nieuw?klant=${client.id}`} className={addLink}>
            Toevoegen
          </Link>
        </div>
        {!vacancies || vacancies.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nog geen vacatures.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {vacancies.map((v) => (
              <li key={v.id} className={rowCard}>
                <Link
                  href={`/vacatures/${v.id}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {v.title}
                </Link>
                <span className="flex items-center gap-3 text-zinc-500">
                  {v.expected_fee != null && (
                    <span className="tabular-nums">
                      {eur(v.expected_fee)}
                      {v.success_probability != null &&
                        ` · ${v.success_probability}%`}
                    </span>
                  )}
                  <VacancyStatusBadge status={v.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Placements */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Placements</h2>
          <Link href={`/placements/nieuw?klant=${client.id}`} className={addLink}>
            Toevoegen
          </Link>
        </div>
        {!placements || placements.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nog geen placements.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {placements.map((p) => (
              <li key={p.id} className={rowCard}>
                <Link
                  href={`/placements/${p.id}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {p.candidate_name || "Placement"}
                </Link>
                <span className="flex items-center gap-3 text-zinc-500">
                  <span>{vacancyTitle.get(p.vacancy_id) ?? ""}</span>
                  <span className="tabular-nums">{eur(p.fee_amount)}</span>
                  <PlacementStatusBadge status={p.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Facturen */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Facturen</h2>
          <Link href={`/facturen/nieuw?klant=${client.id}`} className={addLink}>
            Toevoegen
          </Link>
        </div>
        <InvoiceLines invoices={invoices ?? []} />
      </section>

      {/* Bestanden */}
      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className={`${sectionTitle} mb-3`}>Bestanden</h2>
        {filesTableMissing ? (
          <p className="text-sm text-zinc-500">
            Bestandsopslag nog niet ingericht — draai{" "}
            <code>supabase/migrations/004_file_storage.sql</code>.
          </p>
        ) : (
          <FileManager files={files ?? []} scope="client" clientId={client.id} />
        )}
      </section>

      {/* Gegevens bewerken */}
      <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className={`${sectionTitle} mb-3`}>Gegevens bewerken</h2>
        <ClientForm
          action={updateKlant}
          initial={client}
          submitLabel="Wijzigingen opslaan"
        />
      </section>

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <form action={deleteKlant}>
          <input type="hidden" name="id" value={client.id} />
          <button type="submit" className={btnDanger}>
            Klant verwijderen
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-400">
          Verwijderen kan niet als er nog vacatures, placements of facturen aan
          deze klant hangen.
        </p>
      </div>
    </div>
  );
}
