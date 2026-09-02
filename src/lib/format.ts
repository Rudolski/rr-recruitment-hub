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
