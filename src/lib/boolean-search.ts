/**
 * Systeemprompt en promptopbouw voor de boolean-search-generator.
 */

export const BOOLEAN_SYSTEM = `Je stelt een boolean zoekstring op voor sourcing (LinkedIn Recruiter e.d.), op basis van een vacaturetekst en de aantekeningen van de recruiter.

- Leid zelf de relevante functietitels af, met Nederlandse én Engelse varianten en gangbare synoniemen.
- Leid de belangrijkste harde vaardigheden, systemen en tools af. Kies de onderscheidende, niet elke skill uit de vacature.
- Combineer met AND, OR en NOT, met haakjes en met aanhalingstekens rond termen van meer dan één woord.
- Neem de opgegeven locatie mee als losse term (niet in de functietitel-groep) wanneer die is opgegeven.
- Sluit de opgegeven uit te sluiten termen uit met NOT.
- Houd de string gericht en bruikbaar; niet onnodig lang.

OUTPUT
Geef eerst uitsluitend de boolean zoekstring op één regel. Zet daaronder, na "Toelichting:", hooguit twee zinnen uitleg. Verder niets.`;

export function buildBooleanPrompt(input: {
  original: string;
  notes: string;
  locatie: string;
  uitsluiten: string;
}): string {
  const parts = [
    "=== Vacaturetekst ===",
    input.original.trim() || "(geen tekst aangeleverd)",
  ];
  if (input.notes.trim()) {
    parts.push("", "=== Aantekeningen / script ===", input.notes.trim());
  }
  if (input.locatie.trim()) parts.push("", `Locatie: ${input.locatie.trim()}`);
  if (input.uitsluiten.trim())
    parts.push("", `Uit te sluiten termen: ${input.uitsluiten.trim()}`);
  return parts.join("\n");
}
