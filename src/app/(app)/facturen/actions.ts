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
import { INVOICE_KINDS, INVOICE_STATUSES, isOneOf } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Meestal één partner (naam + bedrag). Zeldzame uitzondering: meerdere
 * partners op één factuur, elk met een eigen bedrag — namen en
 * bedragen dan allebei gescheiden met ";" (niet ",", dat is al het
 * decimaalteken elders in de app).
 */
function parsePartnerFields(fd: FormData): {
  error?: string;
  partner_name: string | null;
  partner_share_amount: number | null;
  partner_breakdown: { name: string; amount: number }[] | null;
} {
  const rawName = str(fd, "partner_name");
  if (!rawName) {
    return {
      partner_name: null,
      partner_share_amount: null,
      partner_breakdown: null,
    };
  }

  const names = rawName
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const amountParts = str(fd, "partner_share_amount")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s.replace(",", ".")));

  if (names.length > 1) {
    if (
      amountParts.length !== names.length ||
      amountParts.some((n) => !Number.isFinite(n))
    ) {
      return {
        error: `Vul evenveel bedragen als partnernamen in (${names.length}), gescheiden met ";".`,
        partner_name: null,
        partner_share_amount: null,
        partner_breakdown: null,
      };
    }
    const breakdown = names.map((name, i) => ({
      name,
      amount: Math.abs(amountParts[i]),
    }));
    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    return {
      partner_name: names.join(", "),
      partner_share_amount: total || null,
      partner_breakdown: total ? breakdown : null,
    };
  }

  const amount = Math.abs(amountParts[0] ?? 0) || null;
  return {
    partner_name: amount ? names[0] : null,
    partner_share_amount: amount,
    partner_breakdown: null,
  };
}

function parse(fd: FormData) {
  const clientId = str(fd, "client_id");
  const amountExcl = numOrNull(fd, "amount_excl_btw");
  const statusRaw = str(fd, "status");
  const kindRaw = str(fd, "kind");

  const fieldErrors: Record<string, string> = {};
  if (!clientId) fieldErrors.client_id = "Kies een klant.";
  if (amountExcl == null) fieldErrors.amount_excl_btw = "Vul een bedrag in.";

  const partnerFields = parsePartnerFields(fd);
  if (partnerFields.error) {
    fieldErrors.partner_share_amount = partnerFields.error;
  }

  return {
    fieldErrors,
    status: isOneOf(INVOICE_STATUSES, statusRaw) ? statusRaw : "concept",
    values: {
      client_id: clientId,
      kind: isOneOf(INVOICE_KINDS, kindRaw) ? kindRaw : "wervingsfee",
      placement_id: nullableStr(fd, "placement_id"),
      vacancy_label: nullableStr(fd, "vacancy_label"),
      invoice_number: nullableStr(fd, "invoice_number"),
      entity_name: nullableStr(fd, "entity_name"),
      partner_name: partnerFields.partner_name,
      partner_share_amount: partnerFields.partner_share_amount,
      partner_breakdown: partnerFields.partner_breakdown,
      amount_excl_btw: amountExcl ?? 0,
      btw_percentage: numOrNull(fd, "btw_percentage") ?? 21,
      issue_date: nullableStr(fd, "issue_date"),
      due_date: nullableStr(fd, "due_date"),
      paid_date: nullableStr(fd, "paid_date"),
      notes: nullableStr(fd, "notes"),
    },
  };
}

/** Snel doorzetten van de factuurstatus vanaf een placement/klant. */
export async function advanceInvoiceStatus(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const to = str(fd, "to");
  if (!id || !isOneOf(INVOICE_STATUSES, to)) return;

  const { data: current } = await supabase
    .from("invoices")
    .select("sent_at, paid_date")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const patch: {
    status: string;
    sent_at?: string;
    paid_date?: string;
  } = { status: to };
  if ((to === "verzonden" || to === "betaald") && !current?.sent_at) {
    patch.sent_at = new Date().toISOString();
  }
  if (to === "betaald" && !current?.paid_date) patch.paid_date = today();

  await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/facturen");
  revalidatePath(`/facturen/${id}`);
  revalidatePath("/placements", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/klanten", "layout");
}

export async function createFactuur(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) {
    return formError("Je account is nog niet aan een organisatie gekoppeld.");
  }

  const { fieldErrors, values, status } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      ...values,
      organization_id: organizationId,
      status,
      // sent_at wordt pas gezet wanneer de status echt op verzonden staat
      sent_at: status === "verzonden" ? new Date().toISOString() : null,
      paid_date:
        status === "betaald" && !values.paid_date ? today() : values.paid_date,
    })
    .select("id")
    .single();

  if (error || !data) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/facturen");
  redirect(`/facturen/${data.id}`);
}

export async function updateFactuur(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return formError("Geen organisatie.");
  const id = str(fd, "id");
  if (!id) return formError("Onbekende factuur.");

  const { fieldErrors, values, status } = parse(fd);
  if (Object.keys(fieldErrors).length > 0) return fieldError(fieldErrors);

  const { data: current } = await supabase
    .from("invoices")
    .select("sent_at, paid_date")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  // sent_at wordt eenmalig vastgelegd op het moment dat de factuur
  // voor het eerst op 'verzonden' gaat.
  const sent_at =
    status === "verzonden" && !current?.sent_at
      ? new Date().toISOString()
      : (current?.sent_at ?? null);

  const paid_date =
    status === "betaald" && !values.paid_date && !current?.paid_date
      ? today()
      : values.paid_date;

  const { error } = await supabase
    .from("invoices")
    .update({ ...values, status, sent_at, paid_date })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) return formError("Opslaan mislukt. Probeer het opnieuw.");

  revalidatePath("/facturen");
  revalidatePath(`/facturen/${id}`);
  redirect(`/facturen/${id}`);
}

export async function deleteFactuur(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  if (!id) return;

  await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  revalidatePath("/facturen");
  redirect("/facturen");
}
