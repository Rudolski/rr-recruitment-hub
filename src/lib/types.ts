/**
 * Handmatige typedefinities voor de databasetabellen die de app nu
 * gebruikt. Kan later vervangen worden door gegenereerde types
 * (`supabase gen types typescript`).
 */

export const CLIENT_STATUSES = ["prospect", "actief", "inactief"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: "Prospect",
  actief: "Actief",
  inactief: "Inactief",
};

export type Client = {
  id: string;
  organization_id: string;
  name: string;
  kvk_number: string | null;
  sector: string | null;
  region: string | null;
  status: ClientStatus;
  account_owner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Velden die via het klantformulier bewerkt worden. */
export type ClientInput = Pick<
  Client,
  "name" | "kvk_number" | "sector" | "region" | "status" | "notes"
>;
