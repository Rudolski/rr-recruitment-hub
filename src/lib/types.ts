/**
 * App-niveau types: rijen uit database.types.ts, plus versmalde
 * statuswaarden en Nederlandse labels voor de UI.
 */
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type Client = Tables["clients"]["Row"];
export type Contact = Tables["contacts"]["Row"];
export type Vacancy = Tables["vacancies"]["Row"];
export type Candidate = Tables["candidates"]["Row"];
export type Application = Tables["applications"]["Row"];
export type Placement = Tables["placements"]["Row"];
export type Invoice = Tables["invoices"]["Row"];
export type FeeAgreement = Tables["fee_agreements"]["Row"];
export type MonthlyTarget = Tables["monthly_targets"]["Row"];

/* -------------------------------------------------------------- */
/* Klanten                                                        */
/* -------------------------------------------------------------- */

export const CLIENT_STATUSES = ["prospect", "actief", "inactief"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: "Prospect",
  actief: "Actief",
  inactief: "Inactief",
};

/* -------------------------------------------------------------- */
/* Vacatures                                                      */
/* -------------------------------------------------------------- */

export const VACANCY_STATUSES = [
  "open",
  "on_hold",
  "vervuld",
  "geannuleerd",
] as const;
export type VacancyStatus = (typeof VACANCY_STATUSES)[number];
export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  open: "Open",
  on_hold: "On hold",
  vervuld: "Vervuld",
  geannuleerd: "Geannuleerd",
};

/* -------------------------------------------------------------- */
/* Kandidaten                                                     */
/* -------------------------------------------------------------- */

export const CANDIDATE_STATUSES = [
  "in_proces",
  "beschikbaar",
  "geplaatst",
  "niet_beschikbaar",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  in_proces: "In proces",
  beschikbaar: "Beschikbaar",
  geplaatst: "Geplaatst",
  niet_beschikbaar: "Niet beschikbaar",
};

/* -------------------------------------------------------------- */
/* Sollicitatieprocedures                                         */
/* -------------------------------------------------------------- */

export const APPLICATION_STAGES = [
  "aangemeld",
  "voorgesteld",
  "gesprek1",
  "gesprek2",
  "aanbod",
  "geplaatst",
  "afgewezen",
  "teruggetrokken",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  aangemeld: "Aangemeld",
  voorgesteld: "Voorgesteld",
  gesprek1: "Gesprek 1",
  gesprek2: "Gesprek 2",
  aanbod: "Aanbod",
  geplaatst: "Geplaatst",
  afgewezen: "Afgewezen",
  teruggetrokken: "Teruggetrokken",
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
  "gecrediteerd",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  concept: "Concept",
  verzonden: "Verzonden",
  betaald: "Betaald",
  te_laat: "Te laat",
  gecrediteerd: "Gecrediteerd",
};

/** Facturen vanaf deze statussen tellen mee als behaalde omzet. */
export const REALISED_INVOICE_STATUSES: InvoiceStatus[] = [
  "verzonden",
  "betaald",
  "te_laat",
];

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
