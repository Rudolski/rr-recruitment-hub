const eurFmt = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurFmtCents = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFmt = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

/** Bedrag zonder centen, bijv. "€ 11.000". */
export function eur(value: number | null | undefined): string {
  if (value == null) return "—";
  return eurFmt.format(value);
}

/** Bedrag met centen, bijv. "€ 11.000,00". */
export function eur2(value: number | null | undefined): string {
  if (value == null) return "—";
  return eurFmtCents.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) return "—";
  return monthFmt.format(new Date(value));
}

/** Maandsleutel "YYYY-MM" uit een Date. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Maandnamen, index 1-12. */
export const MONTH_NAMES = [
  "",
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

export const QUARTER_OF_MONTH = [
  0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4,
] as const;

/** Percentage behaald van een target, met een kleurtint. */
export function pctLabel(
  realised: number,
  target: number,
): { text: string; tone: string } {
  if (!target) return { text: "—", tone: "text-zinc-400" };
  const p = Math.round((realised / target) * 100);
  const tone =
    p >= 100
      ? "text-green-600 dark:text-green-400"
      : p >= 75
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-600 dark:text-zinc-400";
  return { text: `${p}%`, tone };
}
