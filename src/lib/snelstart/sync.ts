import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchPurchaseInvoicesSince,
  fetchSalesInvoicesSince,
} from "./client";
import {
  suggestPurchaseMatch,
  suggestSalesMatch,
  type MatchCandidate,
} from "./matching";

type Db = SupabaseClient<Database>;

/**
 * Haalt verkoop- en inkoopfacturen op sinds `sync_since`, zet ze weg
 * (upsert op snelstart_id) en berekent een matchsuggestie voor nieuwe,
 * nog niet gekoppelde facturen. Koppelt nooit definitief zelf — de
 * gebruiker bevestigt elke match in het scherm.
 *
 * Wordt zowel door de dagelijkse cron als door de "Nu synchroniseren"
 * -knop aangeroepen, altijd voor één organisatie tegelijk.
 */
export async function syncOrganization(db: Db, organizationId: string) {
  const { data: settings } = await db
    .from("snelstart_settings")
    .select("enabled, sync_since")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!settings?.enabled) {
    return { skipped: true as const };
  }

  try {
    const [sales, purchases] = await Promise.all([
      fetchSalesInvoicesSince(settings.sync_since),
      fetchPurchaseInvoicesSince(settings.sync_since),
    ]);

    const { data: candidateRows } = await db
      .from("vacancies")
      .select("id, client_id, closed_at, title, clients(name)")
      .eq("organization_id", organizationId)
      .eq("status", "vervuld")
      .returns<
        {
          id: string;
          client_id: string;
          closed_at: string | null;
          title: string;
          clients: { name: string } | null;
        }[]
      >();

    const candidates: MatchCandidate[] = (candidateRows ?? []).map((v) => ({
      id: v.id,
      clientId: v.client_id,
      clientName: v.clients?.name ?? "",
      title: v.title,
      closedAt: v.closed_at,
    }));

    const { data: alreadyMatchedSales } = await db
      .from("snelstart_sales_invoices")
      .select("matched_vacancy_id")
      .eq("organization_id", organizationId)
      .not("matched_vacancy_id", "is", null);
    const matchedSalesIds = new Set(
      (alreadyMatchedSales ?? []).map((r) => r.matched_vacancy_id),
    );

    const { data: alreadyMatchedPurchases } = await db
      .from("snelstart_purchase_invoices")
      .select("matched_vacancy_id")
      .eq("organization_id", organizationId)
      .not("matched_vacancy_id", "is", null);
    const matchedPurchaseIds = new Set(
      (alreadyMatchedPurchases ?? []).map((r) => r.matched_vacancy_id),
    );

    if (sales.length > 0) {
      const salesCandidates = candidates.filter(
        (c) => !matchedSalesIds.has(c.id),
      );
      const rows = sales.map((inv) => ({
        organization_id: organizationId,
        snelstart_id: inv.id,
        invoice_number: inv.factuurnummer,
        client_name: inv.klantnaam,
        amount: inv.bedrag,
        status: inv.status,
        issue_date: inv.factuurdatum,
        paid_date: inv.betaaldatum,
        suggested_vacancy_id: suggestSalesMatch(
          { clientName: inv.klantnaam, issueDate: inv.factuurdatum },
          salesCandidates,
        ),
        raw: inv.raw as Record<string, unknown>,
      }));
      await db
        .from("snelstart_sales_invoices")
        .upsert(rows, { onConflict: "organization_id,snelstart_id" });
    }

    if (purchases.length > 0) {
      const purchaseCandidates = candidates.filter(
        (c) => !matchedPurchaseIds.has(c.id),
      );
      const rows = purchases.map((inv) => ({
        organization_id: organizationId,
        snelstart_id: inv.id,
        invoice_number: inv.factuurnummer,
        relation_name: inv.leverancienaam,
        amount: inv.bedrag,
        status: inv.status,
        issue_date: inv.factuurdatum,
        paid_date: inv.betaaldatum,
        suggested_vacancy_id: suggestPurchaseMatch(
          { issueDate: inv.factuurdatum },
          purchaseCandidates,
        ),
        raw: inv.raw as Record<string, unknown>,
      }));
      await db
        .from("snelstart_purchase_invoices")
        .upsert(rows, { onConflict: "organization_id,snelstart_id" });
    }

    await db
      .from("snelstart_settings")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("organization_id", organizationId);

    return { skipped: false as const, sales: sales.length, purchases: purchases.length };
  } catch (e) {
    await db
      .from("snelstart_settings")
      .update({ last_sync_error: (e as Error).message })
      .eq("organization_id", organizationId);
    throw e;
  }
}

/** Voor de cron: synchroniseert elke organisatie met enabled = true. */
export async function syncAllEnabled(db: Db) {
  const { data: orgs } = await db
    .from("snelstart_settings")
    .select("organization_id")
    .eq("enabled", true);

  const results = [];
  for (const { organization_id } of orgs ?? []) {
    try {
      results.push({
        organizationId: organization_id,
        ...(await syncOrganization(db, organization_id)),
      });
    } catch (e) {
      results.push({
        organizationId: organization_id,
        skipped: false as const,
        error: (e as Error).message,
      });
    }
  }
  return results;
}

/** Zet de verkoopfactuur-suggestie voor de matched_vacancy_id kolom om
 * naar een echte, door de gebruiker bevestigde koppeling. */
export async function confirmMatch(
  db: Db,
  table: "snelstart_sales_invoices" | "snelstart_purchase_invoices",
  id: string,
  organizationId: string,
  vacancyId: string,
) {
  await db
    .from(table)
    .update({ matched_vacancy_id: vacancyId, matched_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
}
