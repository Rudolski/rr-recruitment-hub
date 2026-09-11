"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/utils/supabase/auth";
import { nullableStr, str } from "@/lib/form";

function normalizeUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Nieuwe bewaarlijst-lead: een LinkedIn-post die nu nog niet het juiste
 * moment is om te benaderen. */
export async function addLead(fd: FormData) {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const linkedinUrl = str(fd, "linkedin_url");
  const approachOn = str(fd, "approach_on");
  if (!linkedinUrl || !approachOn) return;

  await supabase.from("acquisitie_leads").insert({
    organization_id: organizationId,
    author_id: user.id,
    linkedin_url: normalizeUrl(linkedinUrl),
    company_name: nullableStr(fd, "company_name"),
    note: nullableStr(fd, "note"),
    approach_on: approachOn,
  });

  revalidatePath("/acquisitie");
}

export async function updateLead(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const approachOn = str(fd, "approach_on");
  if (!id || !approachOn) return;

  await supabase
    .from("acquisitie_leads")
    .update({
      company_name: nullableStr(fd, "company_name"),
      note: nullableStr(fd, "note"),
      approach_on: approachOn,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/acquisitie");
}

/** Niet interessant (meer) — verdwijnt uit de lijst zonder klant aan te maken. */
export async function dismissLead(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  await supabase
    .from("acquisitie_leads")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/acquisitie");
}

/** Zet de lead om in een klant onderaan de acquisitie-funnel (status 'nieuw'). */
export async function convertLeadToClient(fd: FormData) {
  const { supabase, user, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!id || !name) return;

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      organization_id: organizationId,
      account_owner_id: user.id,
      name,
      status: "nieuw",
    })
    .select("id")
    .single();
  if (error || !client) return;

  await supabase
    .from("acquisitie_leads")
    .update({
      done: true,
      done_at: new Date().toISOString(),
      converted_client_id: client.id,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/acquisitie");
  revalidatePath("/klanten");
  redirect(`/klanten/${client.id}`);
}
