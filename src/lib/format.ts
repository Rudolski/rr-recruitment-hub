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

const shortMonthFmt = new Intl.DateTimeFormat("nl-NL", {
  month: "short",
  year: "numeric",
});

/**
 * Opties voor een maandkeuze (value "YYYY-MM", label "sep 2026"): van twee
 * maanden terug tot vijftien vooruit, plus een eventuele bestaande waarde
 * die buiten dat bereik valt zodat die niet verdwijnt.
 */
export function monthOptions(
  current?: string | null,
): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = -2; i <= 15; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
    opts.push({ value, label: shortMonthFmt.format(d) });
  }
  if (
    current &&
    /^\d{4}-\d{2}$/.test(current) &&
    !opts.some((o) => o.value === current)
  ) {
    const [y, m] = current.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    opts.unshift({ value: current, label: shortMonthFmt.format(d) });
  }
  return opts;
}

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
