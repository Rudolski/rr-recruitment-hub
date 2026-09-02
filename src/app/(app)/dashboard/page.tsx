import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { eur, eur2, formatMonth } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  REALISED_INVOICE_STATUSES,
  type Client,
  type Invoice,
  type Vacancy,
} from "@/lib/types";

export const metadata = { title: "Dashboard · RR Recruitment Hub" };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Dashboard" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code> in de Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = Number(
    typeof params.jaar === "string" ? params.jaar : currentYear,
  );
  const clientFilter =
    typeof params.klant === "string" && params.klant ? params.klant : null;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .order("name")
    .returns<Pick<Client, "id" | "name">[]>();

  /* -------- Behaalde omzet -------- */
  let invoiceQuery = supabase
    .from("invoices")
    .select("*")
    .in("status", REALISED_INVOICE_STATUSES)
    .gte("issue_date", `${year}-01-01`)
    .lte("issue_date", `${year}-12-31`);
  if (clientFilter) invoiceQuery = invoiceQuery.eq("client_id", clientFilter);

  const { data: invoices } = await invoiceQuery.returns<Invoice[]>();
  const realised = (invoices ?? []).reduce(
    (sum, i) => sum + Number(i.amount_excl_btw),
    0,
  );

  /* -------- Prognose lopende + volgende maand -------- */
  const thisMonth = monthKey(now);
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = monthKey(nextMonthDate);

  let vacancyQuery = supabase
    .from("vacancies")
    .select("*")
    .eq("status", "open")
    .not("expected_fee", "is", null)
    .not("expected_close_month", "is", null)
    .not("success_probability", "is", null);
  if (clientFilter) vacancyQuery = vacancyQuery.eq("client_id", clientFilter);

  const { data: openVacancies } = await vacancyQuery.returns<Vacancy[]>();

  const contributions = (openVacancies ?? []).map((v) => ({
    vacancy: v,
    month: (v.expected_close_month ?? "").slice(0, 7),
    value:
      Number(v.expected_fee ?? 0) * (Number(v.success_probability ?? 0) / 100),
  }));

  const forecastThis = contributions
    .filter((c) => c.month === thisMonth)
    .reduce((s, c) => s + c.value, 0);
  const forecastNext = contributions
    .filter((c) => c.month === nextMonth)
    .reduce((s, c) => s + c.value, 0);

  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Behaalde omzet (facturen vanaf verzonden, excl. btw) en de prognose voor de lopende en volgende maand."
      />

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Jaar</span>
          <select
            name="jaar"
            defaultValue={String(year)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Klant</span>
          <select
            name="klant"
            defaultValue={clientFilter ?? ""}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Alle klanten</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Behaalde omzet {year}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur2(realised)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {(invoices ?? []).length} facturen · excl. btw
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Prognose {formatMonth(`${thisMonth}-01`)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(forecastThis)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">fee × slagingskans</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Prognose {formatMonth(`${nextMonth}-01`)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {eur(forecastNext)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">fee × slagingskans</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Vacatures in de prognose
        </h2>
        {contributions.filter((c) => c.month === thisMonth || c.month === nextMonth)
          .length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Geen open vacatures met verwachte fee, maand en slagingskans voor
            deze twee maanden.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {contributions
              .filter((c) => c.month === thisMonth || c.month === nextMonth)
              .sort((a, b) => a.month.localeCompare(b.month))
              .map(({ vacancy, month, value }) => (
                <li
                  key={vacancy.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <Link
                    href={`/vacatures/${vacancy.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {vacancy.title}
                  </Link>
                  <span className="flex items-center gap-4 text-zinc-500">
                    <span>{formatMonth(`${month}-01`)}</span>
                    <span>
                      {eur(vacancy.expected_fee)} × {vacancy.success_probability}
                      %
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {eur(value)}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
