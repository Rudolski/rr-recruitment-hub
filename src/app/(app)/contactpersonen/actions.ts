"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import {
  checkbox,
  fieldError,
  formError,
  nullableStr,
  str,
  type FormState,
} from "@/lib/form";

function parse(fd: FormData) {
  const clientId = str(fd, "client_id");
  const name = str(fd, "name");

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (!name) fieldErrors.name = "Naam is verplicht.";

  return {
    clientId,
    isPrimary: checkbox(fd, "is_primary"),
    fieldErrors,
    values: {
      client_id: clientId,
      name,
      role: nullableStr(fd, "role"),
      email: nullableStr(fd, "email"),
      phone: nullableStr(fd, "phone"),
      is_primary: checkbox(fd, "is_primary"),
      notes: nullableStr(fd, "notes"),
    },
  };
}

/** Zet is_primary uit bij de andere contacten van dezelfde klant. */
async function clearOtherPrimaries(
  supabase: Awaited<ReturnType<typeof getSessionContext>>["supabase"],
  clientId: string,
  keepId: string,
) {
  await supabase
    .from("contacts")
    .update({ is_primary: false })
    .eq("client_id", clientId)
    .neq("id", keepId);
}

export async function createContact(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) {
    return formError("Je account is nog niet aan een organisatie gekoppeld.");
  }

  const { fieldErrors, values, isPrimary, clientId } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...values, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  if (isPrimary) await clearOtherPrimaries(supabase, clientId, data.id);

  revalidatePath("/contactpersonen");
  redirect(`/contactpersonen/${data.id}`);
}

export async function updateContact(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return formError("Onbekende contactpersoon.");

  const { fieldErrors, values, isPrimary, clientId } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { error } = await supabase.from("contacts").update(values).eq("id", id);
  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  if (isPrimary) await clearOtherPrimaries(supabase, clientId, id);

  revalidatePath("/contactpersonen");
  revalidatePath(`/contactpersonen/${id}`);
  redirect(`/contactpersonen/${id}`);
}

export async function deleteContact(fd: FormData) {
  const { supabase } = await getSessionContext();
  const id = str(fd, "id");
  if (!id) return;

  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/contactpersonen");
  redirect("/contactpersonen");
}
