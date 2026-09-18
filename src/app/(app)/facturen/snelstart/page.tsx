import { BackLink, PageHeader } from "@/components/page-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  inputClass,
  labelClass,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { eur2, formatDate } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  confirmPurchaseMatch,
  confirmSalesMatch,
  triggerSnelstartSync,
  updateSnelstartSettings,
} from "./actions";

export const metadata = { title: "SnelStart-koppeling · RR Recruitment Hub" };

type VacancyOption = { id: string; label: string };

function VacancySelect({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: VacancyOption[];
  defaultValue: string | null;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="">Kies een vacature…</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default async function SnelstartPage() {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="SnelStart-koppeling" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const { data: settings, error: settingsError } = await supabase
    .from("snelstart_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (settingsError) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="SnelStart-koppeling" />
        <p className={errorBox}>
          De tabellen voor de SnelStart-koppeling bestaan nog niet. Draai
          eerst <code>supabase/migrations/024_snelstart_integration.sql</code>{" "}
          in de Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const [{ data: vacancies }, { data: unmatchedSales }, { data: unmatchedPurchases }] =
    await Promise.all([
      supabase
        .from("vacancies")
        .select("id, title, closed_at, clients(name)")
        .eq("organization_id", organizationId)
        .eq("status", "vervuld")
        .order("closed_at", { ascending: false })
        .returns<{ id: string; title: string; closed_at: string | null; clients: { name: string } | null }[]>(),
      supabase
        .from("snelstart_sales_invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .is("matched_vacancy_id", null)
        .order("issue_date", { ascending: false }),
      supabase
        .from("snelstart_purchase_invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .is("matched_vacancy_id", null)
        .order("issue_date", { ascending: false }),
    ]);

  const vacancyOptions: VacancyOption[] = (vacancies ?? []).map((v) => ({
    id: v.id,
    label: `${v.clients?.name ?? "?"} — ${v.title}${v.closed_at ? ` (${formatDate(v.closed_at)})` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/facturen" label="Facturen" />
      <div className="mt-3">
        <PageHeader
          title="SnelStart-koppeling"
          description="Leest verkoopfacturen (klant, 100%) en inkoopfacturen (partnerkosten) uit SnelStart en koppelt ze aan de vacature. De hub schrijft nooit iets terug naar SnelStart."
        />
      </div>

      <form
        action={updateSnelstartSettings}
        className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings?.enabled ?? false}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Koppeling actief
        </label>
        <label className="text-sm">
          <span className={labelClass}>Synchroniseer vanaf</span>
          <input
            type="date"
            name="sync_since"
            defaultValue={settings?.sync_since ?? new Date().toISOString().slice(0, 10)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <button type="submit" className={btnPrimary}>
          Instellingen opslaan
        </button>
        <p className="w-full text-xs text-zinc-500">
          Facturen van vóór deze datum worden niet opgehaald — zo blijft alles
          wat je al handmatig hebt verwerkt buiten schot.
        </p>
      </form>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <div className="text-zinc-500">
          {settings?.last_synced_at ? (
            <>Laatst gesynchroniseerd: {formatDate(settings.last_synced_at)}</>
          ) : (
            <>Nog niet gesynchroniseerd.</>
          )}
          {settings?.last_sync_error && (
            <p className="mt-1 text-red-600 dark:text-red-400">
              Laatste fout: {settings.last_sync_error}
            </p>
          )}
        </div>
        <form action={triggerSnelstartSync}>
          <button type="submit" className={btnPrimary}>
            Nu synchroniseren
          </button>
        </form>
      </div>

      <h2 className="mt-8 font-[family-name:var(--font-roc)] text-lg font-medium text-navy dark:text-cream">
        Verkoopfacturen te koppelen
      </h2>
      {!unmatchedSales || unmatchedSales.length === 0 ? (
        <p className={emptyState}>Geen openstaande verkoopfacturen.</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Factuur</th>
                <th className={th}>Klant</th>
                <th className={th}>Bedrag</th>
                <th className={th}>Datum</th>
                <th className={th}>Koppel aan vacature</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {unmatchedSales.map((inv) => (
                <tr key={inv.id} className={tr}>
                  <td className={td}>{inv.invoice_number ?? "—"}</td>
                  <td className={td}>{inv.client_name ?? "—"}</td>
                  <td className={td}>{eur2(inv.amount)}</td>
                  <td className={td}>{formatDate(inv.issue_date)}</td>
                  <td className={td}>
                    <form action={confirmSalesMatch} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={inv.id} />
                      <VacancySelect
                        name="vacancy_id"
                        options={vacancyOptions}
                        defaultValue={inv.suggested_vacancy_id}
                      />
                      <button type="submit" className={btnPrimary}>
                        Koppelen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 font-[family-name:var(--font-roc)] text-lg font-medium text-navy dark:text-cream">
        Inkoopfacturen (partners) te koppelen
      </h2>
      {!unmatchedPurchases || unmatchedPurchases.length === 0 ? (
        <p className={emptyState}>Geen openstaande inkoopfacturen.</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Factuur</th>
                <th className={th}>Partner</th>
                <th className={th}>Bedrag</th>
                <th className={th}>Datum</th>
                <th className={th}>Koppel aan vacature</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {unmatchedPurchases.map((inv) => (
                <tr key={inv.id} className={tr}>
                  <td className={td}>{inv.invoice_number ?? "—"}</td>
                  <td className={td}>{inv.relation_name ?? "—"}</td>
                  <td className={td}>{eur2(inv.amount)}</td>
                  <td className={td}>{formatDate(inv.issue_date)}</td>
                  <td className={td}>
                    <form action={confirmPurchaseMatch} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={inv.id} />
                      <VacancySelect
                        name="vacancy_id"
                        options={vacancyOptions}
                        defaultValue={inv.suggested_vacancy_id}
                      />
                      <button type="submit" className={btnPrimary}>
                        Koppelen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
