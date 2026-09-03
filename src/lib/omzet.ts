import { REALISED_INVOICE_STATUSES, type Invoice } from "@/lib/types";

const realisedSet = new Set<string>(REALISED_INVOICE_STATUSES);

export type OmzetSplit = {
  /** Som van de klantfacturen (partner_name leeg). */
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
 * partneraandeel) en het aandeel per partner. Partneraandelen zijn
 * factuurregels met een gevulde partner_name en (doorgaans) een
 * negatief bedrag. Alleen facturen met een gerealiseerde status
 * tellen mee.
 */
export function splitOmzet(invoices: Invoice[]): OmzetSplit {
  let bruto = 0;
  let partnerTotal = 0;
  let count = 0;
  const byPartner = new Map<string, number>();

  for (const inv of invoices) {
    if (!realisedSet.has(inv.status)) continue;
    const amount = Number(inv.amount_excl_btw);
    if (inv.partner_name) {
      partnerTotal += amount;
      byPartner.set(
        inv.partner_name,
        (byPartner.get(inv.partner_name) ?? 0) + amount,
      );
    } else {
      bruto += amount;
      count += 1;
    }
  }

  return {
    bruto,
    netto: bruto + partnerTotal,
    partners: [...byPartner.entries()]
      .map(([name, amount]) => ({ name, amount: -amount }))
      .sort((a, b) => b.amount - a.amount),
    count,
  };
}
