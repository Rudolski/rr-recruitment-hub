"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import { CLIENT_STATUSES, type ClientStatus } from "@/lib/types";
import type { ClientFormState } from "./form-state";

function parseForm(formData: FormData) {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const nullable = (key: string) => {
    const value = str(key);
    return value === "" ? null : value;
  };

  const name = str("name");
  const statusRaw = str("status");
  const status = CLIENT_STATUSES.includes(statusRaw as ClientStatus)
    ? (statusRaw as ClientStatus)
    : null;

  const fieldErrors: ClientFormState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Naam is verplicht.";
  if (!status) fieldErrors.status = "Kies een geldige status.";

  return {
    fieldErrors,
    values: {
      name,
      status: (status ?? "prospect") as ClientStatus,
      kvk_number: nullable("kvk_number"),
      sector: nullable("sector"),
      region: nullable("region"),
      notes: nullable("notes"),
    },
  };
}

export async function createKlant(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { supabase, user, organizationId } = await getSessionContext();

  if (!organizationId) {
    return {
      error:
        "Je account is nog niet aan een organisatie gekoppeld. Draai supabase/seed.sql.",
      fieldErrors: {},
    };
  }

  const { fieldErrors, values } = parseForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...values,
      organization_id: organizationId,
      account_owner_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: "Opslaan mislukt. Probeer het opnieuw.",
      fieldErrors: {},
    };
  }

  revalidatePath("/klanten");
  redirect(`/klanten/${data.id}`);
}

export async function updateKlant(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { supabase } = await getSessionContext();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Onbekende klant.", fieldErrors: {} };
  }

  const { fieldErrors, values } = parseForm(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors };
  }

  // RLS beperkt de update al tot de eigen organisatie.
  const { error } = await supabase.from("clients").update(values).eq("id", id);

  if (error) {
    return { error: "Opslaan mislukt. Probeer het opnieuw.", fieldErrors: {} };
  }

  revalidatePath("/klanten");
  revalidatePath(`/klanten/${id}`);
  redirect(`/klanten/${id}`);
}

export async function deleteKlant(formData: FormData) {
  const { supabase } = await getSessionContext();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("clients").delete().eq("id", id);

  revalidatePath("/klanten");
  redirect("/klanten");
}
