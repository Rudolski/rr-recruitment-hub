import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  btnPrimary,
  emptyState,
  errorBox,
  table,
  tableWrap,
  tbody,
  th,
  thead,
} from "@/components/ui";
import { SortHeader, cmpText, readSort } from "@/components/sort-header";
import { eur, formatMonth } from "@/lib/format";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  VACANCY_KIND_LABELS,
  VACANCY_STATUSES,
  VACANCY_STATUS_LABELS,
  isOneOf,
  type Client,
  type Vacancy,
  type VacancyKind,
} from "@/lib/types";
import { ForecastRow } from "./forecast-row";
import { VacancyStatusSelect } from "./vacancy-status-select";

const VAC_SORT_KEYS = [
  "title",
  "client",
  "status",
  "kind",
  "consultant",
  "partner_pct",
  "expected_fee",
  "expected_close_month",
  "success_probability",
] as const;
const statusRank = (s: string) => {
  const i = (VACANCY_STATUSES as readonly string[]).indexOf(s);
  return i === -1 ? 99 : i;
};

export const metadata = { title: "Vacatures · RR Recruitment Hub" };

export default async function VacaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Vacatures" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  // Standaard alleen openstaande vacatures; ?status=alle toont alles.
  const statusParam =
    typeof sp.status === "string" ? sp.status : "open";
  const status =
    statusParam === "alle"
      ? "alle"
      : isOneOf(VACANCY_STATUSES, statusParam)
        ? statusParam
        : "open";

  const { sort, dir } = readSort(sp, VAC_SORT_KEYS, "title");

  let vq = supabase
    .from("vacancies")
    .select("*")
    .order("created_at", { ascending: false });
  if (status !== "alle") vq = vq.eq("status", status);

  const [{ data: vacancies, error }, { data: clients }] = await Promise.all([
    vq.returns<Vacancy[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const num = (v: number | null) => (v == null ? -Infinity : Number(v));
  const sorted = [...(vacancies ?? [])].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "client":
        cmp = cmpText(clientName.get(a.client_id), clientName.get(b.client_id));
        break;
      case "status":
        cmp = statusRank(a.status) - statusRank(b.status);
        break;
      case "kind":
        cmp = cmpText(a.kind, b.kind);
        break;
      case "consultant":
        cmp = cmpText(a.consultant, b.consultant);
        break;
      case "partner_pct":
        cmp = num(a.partner_pct) - num(b.partner_pct);
        break;
      case "expected_fee":
        cmp = num(a.expected_fee) - num(b.expected_fee);
        break;
      case "expected_close_month":
        cmp = cmpText(a.expected_close_month, b.expected_close_month);
        break;
      case "success_probability":
        cmp = num(a.success_probability) - num(b.success_probability);
        break;
      default:
        cmp = cmpText(a.title, b.title);
    }
    if (cmp === 0) cmp = cmpText(a.title, b.title);
    return dir === "desc" ? -cmp : cmp;
  });
  const headerProps = {
    activeKey: sort,
    dir,
    basePath: `/vacatures?status=${status}`,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={status === "open" ? "Vacatures openstaand" : "Vacatures"}
        description={
          <>
            Vacatures aanmaken en beheren. Voor de prognose en de
            dagelijkse voortgang per vacature, zie{" "}
            <Link href="/procedures" className="underline">
              Procedures
            </Link>
            .
          </>
        }
        action={
          <Link href="/vacatures/nieuw" className={btnPrimary}>
            Nieuwe vacature
          </Link>
        }
      />

      <form className="mt-6 flex items-end gap-3" method="get">
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {VACANCY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VACANCY_STATUS_LABELS[s]}
              </option>
            ))}
            <option value="alle">Alle</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      {error && <p className={errorBox}>Laden mislukt: {error.message}</p>}

      {!error && (!vacancies || vacancies.length === 0) && (
        <div className={emptyState}>
          {status === "alle" ? (
            <>
              Nog geen vacatures.{" "}
              <Link
                href="/vacatures/nieuw"
                className="font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Voeg de eerste toe
              </Link>
              .
            </>
          ) : (
            "Geen vacatures met deze status."
          )}
        </div>
      )}

      {/* Mobiel: kaart per vacature (forecast bewerk je via de detailpagina) */}
      {!error && vacancies && vacancies.length > 0 && (
        <ul className="mt-4 space-y-2 md:hidden">
          {sorted.map((v) => (
            <li
              key={v.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/vacatures/${v.id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {v.title}
                </Link>
                <VacancyStatusSelect
                  vacancyId={v.id}
                  status={v.status}
                />
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {clientName.get(v.client_id) ?? "—"}
                {v.kind && v.kind !== "wervingsfee" && (
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {VACANCY_KIND_LABELS[v.kind as VacancyKind] ?? v.kind}
                  </span>
                )}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-500">
                {v.expected_fee != null && (
                  <span className="tabular-nums">
                    {eur(v.expected_fee)}
                  </span>
                )}
                {v.expected_close_month && (
                  <span>{formatMonth(v.expected_close_month)}</span>
                )}
                {v.success_probability != null && (
                  <span>{v.success_probability}% kans</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Tablet en breder: tabel met direct-bewerkbare velden */}
      {!error && vacancies && vacancies.length > 0 && (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <SortHeader label="Titel" columnKey="title" {...headerProps} />
                <SortHeader label="Klant" columnKey="client" {...headerProps} />
                <SortHeader
                  label="Status"
                  columnKey="status"
                  {...headerProps}
                />
                <SortHeader label="Soort" columnKey="kind" {...headerProps} />
                <SortHeader
                  label="Consultant"
                  columnKey="consultant"
                  {...headerProps}
                />
                <SortHeader
                  label="Partner %"
                  columnKey="partner_pct"
                  {...headerProps}
                />
                <SortHeader
                  label="Verw. fee"
                  columnKey="expected_fee"
                  {...headerProps}
                />
                <SortHeader
                  label="Verw. maand"
                  columnKey="expected_close_month"
                  {...headerProps}
                />
                <SortHeader
                  label="Kans %"
                  columnKey="success_probability"
                  {...headerProps}
                />
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {sorted.map((v) => (
                <ForecastRow
                  key={v.id}
                  vacancy={v}
                  clientName={clientName.get(v.client_id) ?? "—"}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
