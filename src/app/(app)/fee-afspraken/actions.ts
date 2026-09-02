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
import { FEE_AGREEMENT_TYPES, isOneOf } from "@/lib/types";

function parse(fd: FormData) {
  const clientId = str(fd, "client_id");
  const typeRaw = str(fd, "type");

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!isOneOf(FEE_AGREEMENT_TYPES, typeRaw))
    fieldErrors.type = "Kies een geldig type.";

  return {
    fieldErrors,
    values: {
      client_id: clientId,
      type: isOneOf(FEE_AGREEMENT_TYPES, typeRaw) ? typeRaw : "percentage",
      percentage: numOrNull(fd, "percentage"),
      fixed_amount: numOrNull(fd, "fixed_amount"),
      minimum_fee: numOrNull(fd, "minimum_fee"),
      valid_from: nullableStr(fd, "valid_from"),
      valid_until: nullableStr(fd, "valid_until"),
      notes: nullableStr(fd, "notes"),
    },
  };
}

export async function createFeeAfspraak(
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
    .from("fee_agreements")
    .insert({ ...values, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/fee-afspraken");
  redirect(`/fee-afspraken/${data.id}`);
}

export async function updateFeeAfspraak(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende fee-afspraak.");

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase
    .from("fee_agreements")
    .update(values)
    .eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/fee-afspraken");
  revalidatePath(`/fee-afspraken/${id}`);
  redirect(`/fee-afspraken/${id}`);
}

export async function deleteFeeAfspraak(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("fee_agreements").delete().eq("id", id);
  revalidatePath("/fee-afspraken");
  redirect("/fee-afspraken");
}
