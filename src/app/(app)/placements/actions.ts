"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  checkbox,
  fieldError,
  formError,
  intOrNull,
  nullableStr,
  numOrNull,
  str,
  type FormState,
} from "@/lib/form";
import { PLACEMENT_STATUSES, isOneOf } from "@/lib/types";

function parsePlacement(fd: FormData) {
  const clientId = str(fd, "client_id");
  const vacancyId = str(fd, "vacancy_id");
  const candidateId = str(fd, "candidate_id");
  const statusRaw = str(fd, "status");

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!vacancyId) fieldErrors.vacancy_id = "Kies een vacature.";
  if (!candidateId) fieldErrors.candidate_id = "Kies een kandidaat.";

  return {
    clientId,
    vacancyId,
    candidateId,
    fieldErrors,
    values: {
      client_id: clientId,
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      start_date: nullableStr(fd, "start_date"),
      gross_annual_salary: numOrNull(fd, "gross_annual_salary"),
      fee_amount: numOrNull(fd, "fee_amount"),
      fee_percentage: numOrNull(fd, "fee_percentage"),
      guarantee_months: intOrNull(fd, "guarantee_months"),
      guarantee_end_date: nullableStr(fd, "guarantee_end_date"),
      status: isOneOf(PLACEMENT_STATUSES, statusRaw) ? statusRaw : "actief",
    },
  };
}

export async function createPlacement(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) {
    return formError("Je account is nog niet aan een organisatie gekoppeld.");
  }

  const { fieldErrors, values, vacancyId, candidateId, clientId } =
    parsePlacement(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  // Koppel automatisch aan de bestaande sollicitatieprocedure en zet
  // die op 'geplaatst'.
  const { data: application } = await supabase
    .from("applications")
    .select("id")
    .eq("vacancy_id", vacancyId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  const { data: placement, error } = await supabase
    .from("placements")
    .insert({
      ...values,
      application_id: application?.id ?? null,
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (error || !placement) {
    return formError("Opslaan mislukt. Probeer het opnieuw.");
  }

  if (application?.id) {
    await supabase
      .from("applications")
      .update({ stage: "geplaatst", stage_updated_at: new Date().toISOString() })
      .eq("id", application.id);
  }
  await supabase
    .from("candidates")
    .update({ status: "geplaatst" })
    .eq("id", candidateId);

  // Optioneel: meteen een factuurregel (altijd op concept).
  if (checkbox(fd, "create_invoice")) {
    const amountExcl = numOrNull(fd, "invoice_amount_excl_btw");
    await supabase.from("invoices").insert({
      organization_id: organizationId,
      client_id: clientId,
      placement_id: placement.id,
      invoice_number: nullableStr(fd, "invoice_number"),
      entity_name: nullableStr(fd, "invoice_entity_name"),
      amount_excl_btw: amountExcl ?? values.fee_amount ?? 0,
      btw_percentage: numOrNull(fd, "invoice_btw_percentage") ?? 21,
      status: "concept",
      issue_date: nullableStr(fd, "invoice_issue_date"),
      due_date: nullableStr(fd, "invoice_due_date"),
      notes: nullableStr(fd, "invoice_notes"),
    });
  }

  revalidatePath("/placements");
  revalidatePath("/facturen");
  redirect(`/placements/${placement.id}`);
}

export async function updatePlacement(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende placement.");

  const { fieldErrors, values } = parsePlacement(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase
    .from("placements")
    .update(values)
    .eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/placements");
  revalidatePath(`/placements/${id}`);
  redirect(`/placements/${id}`);
}

export async function deletePlacement(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("placements").delete().eq("id", id);
  revalidatePath("/placements");
  redirect("/placements");
}
