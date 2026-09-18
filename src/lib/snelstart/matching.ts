/** Kandidaat-vacature om een SnelStart-factuur aan te koppelen. */
export type MatchCandidate = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  closedAt: string | null;
};

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Suggestie voor een verkoopfactuur (klant, 100%): eerst op klantnaam
 * matchen, bij meerdere kandidaten de dichtstbijzijnde afsluitdatum.
 */
export function suggestSalesMatch(
  invoice: { clientName: string | null; issueDate: string | null },
  candidates: MatchCandidate[],
): string | null {
  if (!invoice.clientName) return null;
  const needle = normalize(invoice.clientName);
  const byClient = candidates.filter(
    (c) => normalize(c.clientName) === needle,
  );
  if (byClient.length === 0) return null;
  if (byClient.length === 1) return byClient[0].id;
  if (!invoice.issueDate) return byClient[0].id;

  return byClient.reduce((best, c) => {
    if (!c.closedAt) return best;
    if (!best.closedAt) return c;
    return daysBetween(c.closedAt, invoice.issueDate!) <
      daysBetween(best.closedAt, invoice.issueDate!)
      ? c
      : best;
  }, byClient[0]).id;
}

/**
 * Suggestie voor een inkoopfactuur van een partner: geen naam-signaal
 * beschikbaar (SnelStart kent het begrip vacature niet), dus de
 * vervulde vacature met de dichtstbijzijnde afsluitdatum die zelf nog
 * geen gekoppelde inkoopfactuur heeft. Altijd een voorstel — de
 * gebruiker bevestigt of corrigeert 'm.
 */
export function suggestPurchaseMatch(
  invoice: { issueDate: string | null },
  candidates: MatchCandidate[],
): string | null {
  if (candidates.length === 0) return null;
  if (!invoice.issueDate) return candidates[0].id;

  return candidates.reduce((best, c) => {
    if (!c.closedAt) return best;
    if (!best.closedAt) return c;
    return daysBetween(c.closedAt, invoice.issueDate!) <
      daysBetween(best.closedAt, invoice.issueDate!)
      ? c
      : best;
  }, candidates[0]).id;
}
