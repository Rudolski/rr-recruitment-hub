"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  fieldError,
  formError,
  nullableStr,
  numOrNull,
  str,
  type FormState,
} from "@/lib/form";
import {
  CONSULTANTS,
  VACANCY_KINDS,
  VACANCY_STATUSES,
  isOneOf,
} from "@/lib/types";

function monthToDate(value: string): string | null {
  // "YYYY-MM" -> "YYYY-MM-01"
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}

function clampPct(n: number | null): number | null {
  if (n == null) return null;
  return Math.min(100, Math.max(0, n));
}

function consultantOrNull(fd: FormData): string | null {
  const v = str(fd, "consultant");
  return (CONSULTANTS as readonly string[]).includes(v) ? v : null;
}

function parse(fd: FormData) {
  const clientId = str(fd, "client_id");
  const title = str(fd, "title");
  const statusRaw = str(fd, "status");
  const openedAt = str(fd, "opened_at");
  const kindRaw = str(fd, "kind");
  const kind = isOneOf(VACANCY_KINDS, kindRaw) ? kindRaw : "wervingsfee";

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!title) fieldErrors.title = "Titel is verplicht.";

  return {
    fieldErrors,
    values: {
      client_id: clientId,
      title,
      status: isOneOf(VACANCY_STATUSES, statusRaw) ? statusRaw : "open",
      kind,
      consultant: consultantOrNull(fd),
      // Fee-percentage is alleen relevant bij W&S (% van salaris).
      fee_pct: kind === "wervingsfee" ? clampPct(numOrNull(fd, "fee_pct")) : null,
      partner_pct: clampPct(numOrNull(fd, "partner_pct")),
      expected_fee: numOrNull(fd, "expected_fee"),
      expected_close_month: monthToDate(str(fd, "expected_close_month")),
      success_probability: clampPct(numOrNull(fd, "success_probability")),
      opened_at: openedAt || new Date().toISOString().slice(0, 10),
      exclusivity_until: nullableStr(fd, "exclusivity_until"),
    },
  };
}

export async function createVacature(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) {
    return formError("Je account is nog niet aan een organisatie gekoppeld.");
  }

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data, error } = await supabase
    .from("vacancies")
    .insert({ ...values, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/vacatures");
  redirect(`/vacatures/${data.id}`);
}

export async function updateVacature(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return formError("Geen organisatie.");
  const id = str(fd, "id");
  if (!id) return formError("Onbekende vacature.");

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase
    .from("vacancies")
    .update(values)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/vacatures");
  revalidatePath(`/vacatures/${id}`);
  redirect(`/vacatures/${id}`);
}

/** Status wijzigen vanuit het vacatureoverzicht. */
export async function updateVacatureStatus(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const statusRaw = str(fd, "status");
  if (!id || !isOneOf(VACANCY_STATUSES, statusRaw)) return;

  await supabase
    .from("vacancies")
    .update({ status: statusRaw })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/vacatures");
  revalidatePath(`/vacatures/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/klanten", "layout");
}

/** Snel-bewerken van de forecastvelden vanuit de lijst. */
export async function updateVacatureForecast(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  const kindRaw = str(fd, "kind");
  const kind = isOneOf(VACANCY_KINDS, kindRaw) ? kindRaw : undefined;
  const patch = {
    consultant: consultantOrNull(fd),
    partner_pct: clampPct(numOrNull(fd, "partner_pct")),
    expected_fee: numOrNull(fd, "expected_fee"),
    expected_close_month: monthToDate(str(fd, "expected_close_month")),
    success_probability: clampPct(numOrNull(fd, "success_probability")),
    ...(kind && {
      kind,
      // Fee-percentage is alleen relevant bij W&S; bij een wijziging naar
      // Interim/ZZP Marge vanuit deze snelle rij dus meteen leegmaken.
      ...(kind !== "wervingsfee" && { fee_pct: null }),
    }),
  };

  await supabase
    .from("vacancies")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/vacatures");
  revalidatePath(`/vacatures/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteVacature(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  await supabase
    .from("vacancies")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  revalidatePath("/vacatures");
  redirect("/vacatures");
}
