"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import {
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
  const candidateName = str(fd, "candidate_name");
  const statusRaw = str(fd, "status");

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!vacancyId) fieldErrors.vacancy_id = "Kies een vacature.";
  if (!candidateName) fieldErrors.candidate_name = "Vul de kandidaatnaam in.";

  return {
    clientId,
    fieldErrors,
    values: {
      client_id: clientId,
      vacancy_id: vacancyId,
      candidate_name: candidateName,
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

  const { fieldErrors, values, clientId } = parsePlacement(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data: placement, error } = await supabase
    .from("placements")
    .insert({ ...values, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !placement) {
    return formError("Opslaan mislukt. Probeer het opnieuw.");
  }

  // Automatisch één factuurregel voor de placement-fee (op concept),
  // eventueel verminderd met een al gefactureerde commitment fee.
  if (values.fee_amount != null) {
    const commitment = numOrNull(fd, "commitment_invoiced") ?? 0;
    const amount = values.fee_amount - commitment;
    await supabase.from("invoices").insert({
      organization_id: organizationId,
      client_id: clientId,
      placement_id: placement.id,
      amount_excl_btw: amount,
      btw_percentage: 21,
      status: "concept",
      notes:
        commitment > 0
          ? `Placement-fee (na aftrek commitment € ${commitment})`
          : "Placement-fee",
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

  // Facturen behouden, maar loskoppelen van de placement.
  await supabase
    .from("invoices")
    .update({ placement_id: null })
    .eq("placement_id", id);
  await supabase.from("placements").delete().eq("id", id);

  revalidatePath("/placements");
  revalidatePath("/facturen");
  redirect("/placements");
}
