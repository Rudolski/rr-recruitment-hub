import {
  REALISED_INVOICE_STATUSES,
  WS_INVOICE_KINDS,
  type Invoice,
  type InvoiceKind,
} from "@/lib/types";

const realisedSet = new Set<string>(REALISED_INVOICE_STATUSES);
const wsSet = new Set<string>(WS_INVOICE_KINDS);

type PartnerAware = Pick<
  Invoice,
  "amount_excl_btw" | "partner_name" | "partner_share_amount"
>;

/**
 * Netto bijdrage van één factuur aan de eigen omzet van RR:
 * het volledige factuurbedrag minus het partneraandeel.
 *
 * Ondersteunt ook de oude opzet, waarin een partneruitbetaling een
 * losse regel was met een negatief bedrag en zonder partner_share_amount.
 */
export function nettoAmount(inv: PartnerAware): number {
  const amount = Number(inv.amount_excl_btw);
  const share = Number(inv.partner_share_amount ?? 0);
  if (inv.partner_name && !share) return amount; // oude losse (negatieve) regel
  return amount - share;
}

export type OmzetSplit = {
  /** Som van de volledige klantfacturen (excl. btw), alle soorten. */
  bruto: number;
  /** Bruto minus alle partneraandelen — de eigen omzet van RR (alle soorten). */
  netto: number;
  /** Netto omzet die als W&S telt (wervingsfee + commitment). */
  wsNetto: number;
  /** Netto omzet per factuursoort. */
  byKind: Record<InvoiceKind, number>;
  /** Aantal plaatsingen = aantal gerealiseerde 'wervingsfee'-facturen. */
  placements: number;
  /** Per partner het uitbetaalde bedrag (positief weergegeven). */
  partners: { name: string; amount: number }[];
  /** Aantal meegetelde klantfacturen. */
  count: number;
};

/**
 * Splitst een set facturen in bruto/netto omzet, W&S-omzet, een
 * verdeling per soort, het aantal plaatsingen (wervingsfee-facturen) en
 * het aandeel per partner. Alleen facturen met een gerealiseerde status
 * tellen mee.
 */
export function splitOmzet(invoices: Invoice[]): OmzetSplit {
  let bruto = 0;
  let partnerTotal = 0;
  let count = 0;
  let wsNetto = 0;
  let placements = 0;
  const byKind: Record<InvoiceKind, number> = {
    wervingsfee: 0,
    commitment: 0,
    interim: 0,
    zzp_marge: 0,
  };
  const byPartner = new Map<string, number>();

  for (const inv of invoices) {
    if (!realisedSet.has(inv.status)) continue;
    const amount = Number(inv.amount_excl_btw);
    const share = Number(inv.partner_share_amount ?? 0);

    if (inv.partner_name && !share) {
      // Oude opzet: losse uitbetalingsregel met een negatief bedrag.
      const payout = -amount;
      partnerTotal += payout;
      byPartner.set(
        inv.partner_name,
        (byPartner.get(inv.partner_name) ?? 0) + payout,
      );
      continue;
    }

    bruto += amount;
    count += 1;
    if (inv.partner_name && share) {
      partnerTotal += share;
      byPartner.set(
        inv.partner_name,
        (byPartner.get(inv.partner_name) ?? 0) + share,
      );
    }

    const kind = (inv.kind ?? "wervingsfee") as InvoiceKind;
    const netto = amount - (inv.partner_name && share ? share : 0);
    if (kind in byKind) byKind[kind] += netto;
    if (wsSet.has(kind)) wsNetto += netto;
    if (kind === "wervingsfee") placements += 1;
  }

  return {
    bruto,
    netto: bruto - partnerTotal,
    wsNetto,
    byKind,
    placements,
    partners: [...byPartner.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    count,
  };
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Gemiddelde W&S-fee per plaatsing over een periode.
 *
 * Een plaatsing = één gerealiseerde 'wervingsfee'-factuur met
 * factuurdatum in de periode. De fee van die plaatsing is het bedrag
 * van die factuur plus een eventuele bijbehorende commitment-fee —
 * ook als die eerder (buiten de periode) is gefactureerd. Koppeling
 * gebeurt op `placement_id` of anders op klant + vacature-label.
 *
 * Commitment-facturen zonder bijbehorende plaatsing (vacature niet
 * ingevuld) tellen NIET mee — niet in het totaal en niet in het aantal.
 *
 * @param periodInvoices  gerealiseerde facturen met factuurdatum in de periode
 * @param commitmentPool  álle gerealiseerde commitment-facturen (elke datum)
 */
export function averageWsFee(
  periodInvoices: Invoice[],
  commitmentPool: Invoice[],
): { placements: number; total: number; avg: number | null } {
  const placementInvoices = periodInvoices.filter(
    (i) =>
      realisedSet.has(i.status) &&
      (i.kind ?? "wervingsfee") === "wervingsfee",
  );

  const commitments = commitmentPool
    .filter((i) => realisedSet.has(i.status) && i.kind === "commitment")
    .map((inv) => ({ inv, used: false }));

  let total = 0;
  for (const pi of placementInvoices) {
    let fee = nettoAmount(pi);
    const piLabel = norm(pi.vacancy_label);
    for (const c of commitments) {
      if (c.used) continue;
      const byPlacement =
        !!pi.placement_id && c.inv.placement_id === pi.placement_id;
      const byLabel =
        piLabel !== "" &&
        c.inv.client_id === pi.client_id &&
        norm(c.inv.vacancy_label) === piLabel;
      if (byPlacement || byLabel) {
        fee += nettoAmount(c.inv);
        c.used = true;
        break;
      }
    }
    total += fee;
  }

  return {
    placements: placementInvoices.length,
    total,
    avg:
      placementInvoices.length > 0
        ? total / placementInvoices.length
        : null,
  };
}
