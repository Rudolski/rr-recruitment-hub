import { REALISED_INVOICE_STATUSES, type Invoice } from "@/lib/types";

const realisedSet = new Set<string>(REALISED_INVOICE_STATUSES);

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
  /** Som van de volledige klantfacturen (excl. btw). */
  bruto: number;
  /** Bruto minus alle partneraandelen — de eigen omzet van RR. */
  netto: number;
  /** Per partner het uitbetaalde bedrag (positief weergegeven). */
  partners: { name: string; amount: number }[];
  /** Aantal meegetelde klantfacturen. */
  count: number;
};

/**
 * Splitst een set facturen in bruto omzet, netto omzet (na
 * partneraandeel) en het aandeel per partner. Een factuurregel bevat
 * het volledige bedrag in amount_excl_btw en, als een deel naar een
 * partner gaat, dat deel in partner_share_amount. Alleen facturen met
 * een gerealiseerde status tellen mee.
 */
export function splitOmzet(invoices: Invoice[]): OmzetSplit {
  let bruto = 0;
  let partnerTotal = 0;
  let count = 0;
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
  }

  return {
    bruto,
    netto: bruto - partnerTotal,
    partners: [...byPartner.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    count,
  };
}
