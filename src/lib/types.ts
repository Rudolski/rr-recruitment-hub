/**
 * App-niveau types: rijen uit database.types.ts, plus versmalde
 * statuswaarden en Nederlandse labels voor de UI.
 */
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type Client = Tables["clients"]["Row"];
export type Contact = Tables["contacts"]["Row"];
export type ClientNote = Tables["client_notes"]["Row"];
export type Vacancy = Tables["vacancies"]["Row"];
export type Placement = Tables["placements"]["Row"];
export type Invoice = Tables["invoices"]["Row"];
export type FeeAgreement = Tables["fee_agreements"]["Row"];
export type MonthlyTarget = Tables["monthly_targets"]["Row"];
export type StoredFile = Tables["stored_files"]["Row"];
export type VacancyTask = Tables["vacancy_tasks"]["Row"];
export type VacancyCandidate = Tables["vacancy_candidates"]["Row"];
export type WatchSource = Tables["watch_sources"]["Row"];
export type WatchVacancy = Tables["watch_vacancies"]["Row"];
export type AcquisitieLead = Tables["acquisitie_leads"]["Row"];

/* -------------------------------------------------------------- */
/* Vacature-radar                                                 */
/* -------------------------------------------------------------- */

export const WATCH_KINDS = ["klant", "concurrent", "prospect"] as const;
export type WatchKind = (typeof WATCH_KINDS)[number];
export const WATCH_KIND_LABELS: Record<WatchKind, string> = {
  klant: "Klant",
  concurrent: "Concurrent",
  prospect: "Prospect",
};

export const WATCH_MODES = ["html", "sitemap"] as const;
export type WatchMode = (typeof WATCH_MODES)[number];
export const WATCH_MODE_LABELS: Record<WatchMode, string> = {
  html: "HTML-lijst",
  sitemap: "Sitemap / RSS",
};

/* -------------------------------------------------------------- */
/* Klanten                                                        */
/* -------------------------------------------------------------- */

export const CLIENT_STATUSES = [
  "nieuw",
  "in_outreach",
  "warm",
  "afspraak_gepland",
  "voorstel_gestuurd",
  "actief",
  "inactief",
] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  nieuw: "Nieuw",
  in_outreach: "In outreach",
  warm: "Warm",
  afspraak_gepland: "Afspraak gepland",
  voorstel_gestuurd: "Voorstel gestuurd",
  actief: "Klant",
  inactief: "Inactief",
};

/** Volgorde van de acquisitie-funnel (zonder inactief). */
export const ACQUISITION_FUNNEL: ClientStatus[] = [
  "nieuw",
  "in_outreach",
  "warm",
  "afspraak_gepland",
  "voorstel_gestuurd",
  "actief",
];

/** Prospect-statussen = funnel vóór 'actief'. */
export const PROSPECT_STATUSES: ClientStatus[] = [
  "nieuw",
  "in_outreach",
  "warm",
  "afspraak_gepland",
  "voorstel_gestuurd",
];

/* -------------------------------------------------------------- */
/* Vacatures                                                      */
/* -------------------------------------------------------------- */

/** Wie de opdracht doet. Uitbreidbaar zodra er meer consultants zijn. */
export const CONSULTANTS = ["ruud", "juul"] as const;
export type Consultant = (typeof CONSULTANTS)[number];
export const CONSULTANT_LABELS: Record<Consultant, string> = {
  ruud: "Ruud Reinhoud",
  juul: "Juul Grubben",
};

export const VACANCY_STATUSES = [
  "concept",
  "open",
  "on_hold",
  "vervuld",
  "geannuleerd",
] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];
export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  concept: "Concept",
  open: "Open",
  on_hold: "On hold",
  vervuld: "Vervuld",
  geannuleerd: "Geannuleerd",
};

/** Mini-funnel per vacature (alleen voornamen, AVG-proof). */
export const CANDIDATE_STAGES = [
  "intake",
  "voorgesteld",
  "gesprek_1",
  "gesprek_2",
  "abvw",
  "aangenomen",
  "afgewezen",
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];
export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  intake: "Intake kandidaat",
  voorgesteld: "Voorgesteld bij klant",
  gesprek_1: "1e gesprek bij klant",
  gesprek_2: "2e gesprek bij klant",
  abvw: "ABVW",
  aangenomen: "Aangenomen",
  afgewezen: "Afgewezen",
};

/* -------------------------------------------------------------- */
/* Placements                                                     */
/* -------------------------------------------------------------- */

export const PLACEMENT_STATUSES = [
  "actief",
  "uitval_in_garantie",
  "afgerond",
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];
export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  actief: "Actief",
  uitval_in_garantie: "Uitval in garantie",
  afgerond: "Afgerond",
};

/* -------------------------------------------------------------- */
/* Facturen                                                       */
/* -------------------------------------------------------------- */

export const INVOICE_STATUSES = [
  "concept",
  "verzonden",
  "betaald",
  "te_laat",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  concept: "Concept",
  verzonden: "Verzonden",
  betaald: "Betaald",
  te_laat: "Te laat",
};

/**
 * Facturen vanaf deze statussen tellen mee als behaalde omzet. Ook
 * 'concept' telt al mee: het bedrag staat vast zodra de factuurregel
 * bestaat, ook al is 'ie nog niet verstuurd.
 */
export const REALISED_INVOICE_STATUSES: InvoiceStatus[] = [
  "concept",
  "verzonden",
  "betaald",
  "te_laat",
];

export const INVOICE_KINDS = [
  "wervingsfee",
  "commitment",
  "interim",
  "zzp_marge",
] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];
export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  wervingsfee: "Wervingsfee",
  commitment: "Commitment fee",
  interim: "Interim (eigen uren)",
  zzp_marge: "ZZP Marge",
};
/** Soorten die meetellen als W&S-omzet (target, prognose, fee/plaatsing). */
export const WS_INVOICE_KINDS: InvoiceKind[] = ["wervingsfee", "commitment"];

/* -------------------------------------------------------------- */
/* Fee-afspraken                                                  */
/* -------------------------------------------------------------- */

export const FEE_AGREEMENT_TYPES = [
  "percentage",
  "staffel",
  "vast_bedrag",
] as const;
export type FeeAgreementType = (typeof FEE_AGREEMENT_TYPES)[number];
export const FEE_AGREEMENT_TYPE_LABELS: Record<FeeAgreementType, string> = {
  percentage: "Percentage",
  staffel: "Staffel",
  vast_bedrag: "Vast bedrag",
};

/* -------------------------------------------------------------- */
/* Helpers                                                        */
/* -------------------------------------------------------------- */

export function isOneOf<T extends readonly string[]>(
  list: T,
  value: string,
): value is T[number] {
  return (list as readonly string[]).includes(value);
}
