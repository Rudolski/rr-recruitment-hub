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
import { CONSULTANTS, VACANCY_STATUSES, isOneOf } from "@/lib/types";

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

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!title) fieldErrors.title = "Titel is verplicht.";

  return {
    fieldErrors,
    values: {
      client_id: clientId,
      title,
      status: isOneOf(VACANCY_STATUSES, statusRaw) ? statusRaw : "open",
      consultant: consultantOrNull(fd),
      fee_pct: clampPct(numOrNull(fd, "fee_pct")),
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
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende vacature.");

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase
    .from("vacancies")
    .update(values)
    .eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/vacatures");
  revalidatePath(`/vacatures/${id}`);
  redirect(`/vacatures/${id}`);
}

/** Snel-bewerken van de drie forecastvelden vanuit de lijst. */
export async function updateVacatureForecast(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase
    .from("vacancies")
    .update({
      consultant: consultantOrNull(fd),
      partner_pct: clampPct(numOrNull(fd, "partner_pct")),
      expected_fee: numOrNull(fd, "expected_fee"),
      expected_close_month: monthToDate(str(fd, "expected_close_month")),
      success_probability: clampPct(numOrNull(fd, "success_probability")),
    })
    .eq("id", id);

  revalidatePath("/vacatures");
  revalidatePath(`/vacatures/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteVacature(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("vacancies").delete().eq("id", id);
  revalidatePath("/vacatures");
  redirect("/vacatures");
}
