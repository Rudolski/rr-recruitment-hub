"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  fieldError,
  formError,
  nullableStr,
  str,
  type FormState,
} from "@/lib/form";
import { CANDIDATE_STATUSES, isOneOf } from "@/lib/types";

function parse(fd: FormData) {
  const name = str(fd, "name");
  const statusRaw = str(fd, "status");

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Naam is verplicht.";
  if (!isOneOf(CANDIDATE_STATUSES, statusRaw))
    fieldErrors.status = "Kies een geldige status.";

  return {
    fieldErrors,
    values: {
      name,
      status: isOneOf(CANDIDATE_STATUSES, statusRaw)
        ? statusRaw
        : "in_proces",
      email: nullableStr(fd, "email"),
      phone: nullableStr(fd, "phone"),
      current_job_title: nullableStr(fd, "current_job_title"),
      source: nullableStr(fd, "source"),
      cv_link: nullableStr(fd, "cv_link"),
      notes: nullableStr(fd, "notes"),
    },
  };
}

export async function createKandidaat(
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
    .from("candidates")
    .insert({ ...values, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/kandidaten");
  redirect(`/kandidaten/${data.id}`);
}

export async function updateKandidaat(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende kandidaat.");

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase
    .from("candidates")
    .update(values)
    .eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/kandidaten");
  revalidatePath(`/kandidaten/${id}`);
  redirect(`/kandidaten/${id}`);
}

export async function deleteKandidaat(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("candidates").delete().eq("id", id);
  revalidatePath("/kandidaten");
  redirect("/kandidaten");
}
