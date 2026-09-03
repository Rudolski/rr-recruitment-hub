import {
  CLIENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PLACEMENT_STATUS_LABELS,
  VACANCY_STATUS_LABELS,
} from "@/lib/types";

type Tone = "green" | "amber" | "red" | "blue" | "zinc";

const TONE_CLASS: Record<Tone, string> = {
  green:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-300 dark:ring-green-400/20",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/20",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/20",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

function pick<T extends Record<string, string>>(
  map: T,
  value: string,
): string {
  return map[value] ?? value;
}

export function ClientStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "actief"
      ? "green"
      : status === "warm" ||
          status === "afspraak_gepland" ||
          status === "voorstel_gestuurd"
        ? "amber"
        : status === "in_outreach"
          ? "blue"
          : status === "inactief"
            ? "zinc"
            : "zinc";
  return <Badge label={pick(CLIENT_STATUS_LABELS, status)} tone={tone} />;
}

export function VacancyStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "open"
      ? "green"
      : status === "on_hold"
        ? "amber"
        : status === "geannuleerd"
          ? "red"
          : "zinc";
  return <Badge label={pick(VACANCY_STATUS_LABELS, status)} tone={tone} />;
}

export function PlacementStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "actief"
      ? "green"
      : status === "uitval_in_garantie"
        ? "red"
        : "zinc";
  return <Badge label={pick(PLACEMENT_STATUS_LABELS, status)} tone={tone} />;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "betaald"
      ? "green"
      : status === "verzonden"
        ? "blue"
        : status === "te_laat"
          ? "red"
          : status === "gecrediteerd"
            ? "zinc"
            : "amber";
  return <Badge label={pick(INVOICE_STATUS_LABELS, status)} tone={tone} />;
}
