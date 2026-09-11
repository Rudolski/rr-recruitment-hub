import { BackLink, PageHeader } from "@/components/page-header";
import { errorBox } from "@/components/ui";
import { getSessionContext } from "@/utils/supabase/auth";
import type { MonthlyTarget } from "@/lib/types";
import { TargetsForm, type MonthInput } from "./targets-form";

export const metadata = { title: "Targets · RR Recruitment Hub" };

const numStr = (v: number | null) => (v == null ? "" : String(v));

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, organizationId } = await getSessionContext();

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Targets" />
        <p className={errorBox}>
          Je account is nog niet aan een organisatie gekoppeld. Draai{" "}
          <code>supabase/seed.sql</code>.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(
    typeof params.jaar === "string" ? params.jaar : currentYear,
  );
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  const { data: targets, error } = await supabase
    .from("monthly_targets")
    .select("*")
    .eq("year", year)
    .returns<MonthlyTarget[]>();

  if (error && error.message.includes("monthly_targets")) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Targets" />
        <p className={errorBox}>
          De tabel <code>monthly_targets</code> bestaat nog niet. Draai eerst
          <code> supabase/migrations/002_monthly_targets.sql</code> in de
          Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const initial: Record<number, MonthInput> = {};
  for (const t of targets ?? []) {
    initial[t.month] = { revenue: numStr(t.target_revenue) };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/dashboard" label="Dashboard" />
      <div className="mt-3">
        <PageHeader
          title="Targets"
          description="Voer per maand een target in. Het resultaat t.o.v. deze targets (maand, kwartaal, jaar) staat op het dashboard."
        />
      </div>

      <form className="mt-6 flex items-end gap-3" method="get">
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
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toepassen
        </button>
      </form>

      <TargetsForm key={year} year={year} initial={initial} />
    </div>
  );
}
