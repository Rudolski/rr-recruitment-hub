"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/utils/supabase/auth";
import { nullableStr, str, checkbox } from "@/lib/form";
import { confirmMatch, syncOrganization } from "@/lib/snelstart/sync";

export async function updateSnelstartSettings(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;

  const enabled = checkbox(fd, "enabled");
  const syncSince = nullableStr(fd, "sync_since") ?? new Date().toISOString().slice(0, 10);

  await supabase.from("snelstart_settings").upsert({
    organization_id: organizationId,
    enabled,
    sync_since: syncSince,
  });

  revalidatePath("/facturen/snelstart");
}

export async function triggerSnelstartSync() {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;

  try {
    await syncOrganization(supabase, organizationId);
  } catch {
    // Fout staat al in snelstart_settings.last_sync_error, hier
    // niets meer nodig — de pagina toont 'm na revalidatie.
  }
  revalidatePath("/facturen/snelstart");
}

export async function confirmSalesMatch(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id || !vacancyId) return;

  await confirmMatch(
    supabase,
    "snelstart_sales_invoices",
    id,
    organizationId,
    vacancyId,
  );
  revalidatePath("/facturen/snelstart");
}

export async function confirmPurchaseMatch(fd: FormData) {
  const { supabase, organizationId } = await getSessionContext();
  if (!organizationId) return;
  const id = str(fd, "id");
  const vacancyId = str(fd, "vacancy_id");
  if (!id || !vacancyId) return;

  await confirmMatch(
    supabase,
    "snelstart_purchase_invoices",
    id,
    organizationId,
    vacancyId,
  );
  revalidatePath("/facturen/snelstart");
}
