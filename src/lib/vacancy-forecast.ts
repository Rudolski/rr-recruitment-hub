import type { Vacancy, VacancyKind } from "@/lib/types";

/** Alleen de velden die de forecastberekening nodig heeft. */
export type ForecastVacancy = Pick<
  Vacancy,
  "status" | "kind" | "expected_fee" | "expected_close_month" | "success_probability"
>;

export type ForecastContribution = {
  vacancy: ForecastVacancy;
  month: string;
  value: number;
};

/**
 * Open vacatures met bedrag, maand én kans ingevuld -> hun gewogen
 * bijdrage (bedrag × slagingskans) aan de prognose van die maand.
 */
export function vacancyContributions(
  vacancies: ForecastVacancy[],
): ForecastContribution[] {
  return vacancies
    .filter(
      (v) =>
        v.status === "open" &&
        v.expected_fee != null &&
        v.expected_close_month != null &&
        v.success_probability != null,
    )
    .map((v) => ({
      vacancy: v,
      month: (v.expected_close_month ?? "").slice(0, 7),
      value: Number(v.expected_fee) * (Number(v.success_probability) / 100),
    }));
}

/** Som van de bijdrages per maand, voor de gevraagde maanden. */
export function sumByMonth(
  contributions: ForecastContribution[],
  months: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of months) out[m] = 0;
  for (const c of contributions) {
    if (c.month in out) out[c.month] += c.value;
  }
  return out;
}

/**
 * Uitsplitsing per vacaturesoort, voor de gevraagde maanden. Alleen
 * soorten met een noemenswaardig bedrag (> 50 cent) komen erin.
 */
export function byKindPerMonth(
  contributions: ForecastContribution[],
  months: string[],
): Record<string, [VacancyKind, number][]> {
  const out: Record<string, [VacancyKind, number][]> = {};
  for (const m of months) {
    const acc: Record<string, number> = {};
    for (const c of contributions) {
      if (c.month !== m) continue;
      const kind = (c.vacancy.kind ?? "wervingsfee") as VacancyKind;
      acc[kind] = (acc[kind] ?? 0) + c.value;
    }
    out[m] = (Object.entries(acc) as [VacancyKind, number][]).filter(
      ([, v]) => Math.abs(v) > 0.5,
    );
  }
  return out;
}
