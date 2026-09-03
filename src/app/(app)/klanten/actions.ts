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
import { CLIENT_STATUSES, isOneOf } from "@/lib/types";

function parse(fd: FormData) {
  const name = str(fd, "name");
  const statusRaw = str(fd, "status");

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Naam is verplicht.";
  if (!isOneOf(CLIENT_STATUSES, statusRaw))
    fieldErrors.status = "Kies een geldige status.";

  return {
    fieldErrors,
    values: {
      name,
      status: isOneOf(CLIENT_STATUSES, statusRaw) ? statusRaw : "nieuw",
      notes: nullableStr(fd, "notes"),
    },
  };
}

export async function createKlant(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) {
    return formError(
      "Je account is nog niet aan een organisatie gekoppeld. Draai supabase/seed.sql.",
    );
  }

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...values,
      organization_id: organizationId,
      account_owner_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/klanten");
  redirect(`/klanten/${data.id}`);
}

export async function updateKlant(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende klant.");

  const { fieldErrors, values } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase.from("clients").update(values).eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/klanten");
  revalidatePath(`/klanten/${id}`);
  redirect(`/klanten/${id}`);
}

/** Snel wijzigen van de acquisitiestatus vanaf de klant- of acquisitiepagina. */
export async function setClientStatus(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !isOneOf(CLIENT_STATUSES, status)) return;

  await supabase.from("clients").update({ status }).eq("id", id);
  revalidatePath("/klanten");
  revalidatePath(`/klanten/${id}`);
  revalidatePath("/acquisitie");
}

export async function deleteKlant(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/klanten");
  redirect("/klanten");
}
