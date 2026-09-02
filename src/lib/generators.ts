/**
 * Definities van de vijf AI-generatoren (fase 3). Elke generator
 * heeft invoervelden, een systeemprompt en een functie die de
 * gebruikersprompt opbouwt. Ze delen allemaal dezelfde server-side
 * Claude-laag (src/lib/anthropic.ts).
 */

export type GeneratorField = {
  name: string;
  label: string;
  type: "text" | "textarea";
  required?: boolean;
  placeholder?: string;
};

export type Generator = {
  key: string;
  label: string;
  description: string;
  fields: GeneratorField[];
  system: string;
  buildPrompt: (values: Record<string, string>) => string;
  maxTokens?: number;
};

const HOUSE_STYLE =
  "Je schrijft voor RR Recruitment, een recruitmentbureau. Schrijf in het Nederlands, zakelijk maar persoonlijk en to the point. Geen overdreven marketingtaal. Lever alleen de gevraagde tekst, zonder inleidende opmerkingen of uitleg.";

function block(values: Record<string, string>, keys: [string, string][]) {
  return keys
    .filter(([k]) => values[k]?.trim())
    .map(([k, label]) => `${label}: ${values[k].trim()}`)
    .join("\n");
}

export const GENERATORS: Generator[] = [
  {
    key: "vacaturetekst",
    label: "Vacaturetekst",
    description:
      "Een wervende maar realistische vacaturetekst op basis van de kernpunten.",
    fields: [
      { name: "functietitel", label: "Functietitel", type: "text", required: true },
      { name: "bedrijf", label: "Bedrijf / opdrachtgever", type: "text" },
      { name: "locatie", label: "Locatie", type: "text" },
      { name: "taken", label: "Belangrijkste taken", type: "textarea" },
      { name: "eisen", label: "Functie-eisen", type: "textarea" },
      { name: "voorwaarden", label: "Arbeidsvoorwaarden", type: "textarea" },
      { name: "toon", label: "Gewenste toon", type: "text", placeholder: "bijv. informeel, formeel" },
    ],
    system: `${HOUSE_STYLE} Structureer de vacaturetekst met korte alinea's en waar nuttig opsommingstekens: intro over de rol, wat je gaat doen, wat we vragen, wat we bieden, en een korte call to action.`,
    buildPrompt: (v) =>
      `Schrijf een vacaturetekst.\n\n${block(v, [
        ["functietitel", "Functietitel"],
        ["bedrijf", "Bedrijf"],
        ["locatie", "Locatie"],
        ["taken", "Taken"],
        ["eisen", "Eisen"],
        ["voorwaarden", "Arbeidsvoorwaarden"],
        ["toon", "Gewenste toon"],
      ])}`,
  },
  {
    key: "kandidaatintro",
    label: "Kandidaatintroductie",
    description:
      "Een introductie van een kandidaat richting de opdrachtgever.",
    fields: [
      { name: "kandidaat", label: "Naam kandidaat", type: "text", required: true },
      { name: "vacature", label: "Voor welke vacature", type: "text" },
      { name: "huidige_functie", label: "Huidige functie", type: "text" },
      { name: "sterke_punten", label: "Sterke punten", type: "textarea" },
      { name: "motivatie", label: "Motivatie", type: "textarea" },
      { name: "beschikbaarheid", label: "Beschikbaarheid", type: "text" },
      { name: "salaris", label: "Salarisindicatie", type: "text" },
    ],
    system: `${HOUSE_STYLE} Schrijf 3 tot 5 korte alinea's: wie is de kandidaat, waarom past die bij deze rol, motivatie, en praktische zaken (beschikbaarheid, salarisindicatie). Enthousiast maar eerlijk.`,
    buildPrompt: (v) =>
      `Schrijf een kandidaatintroductie voor de opdrachtgever.\n\n${block(v, [
        ["kandidaat", "Kandidaat"],
        ["vacature", "Vacature"],
        ["huidige_functie", "Huidige functie"],
        ["sterke_punten", "Sterke punten"],
        ["motivatie", "Motivatie"],
        ["beschikbaarheid", "Beschikbaarheid"],
        ["salaris", "Salarisindicatie"],
      ])}`,
  },
  {
    key: "boolean",
    label: "Boolean search",
    description:
      "Een LinkedIn/Recruiter boolean zoekstring op basis van functie en skills.",
    fields: [
      { name: "functies", label: "Functietitels en synoniemen", type: "textarea", required: true },
      { name: "skills", label: "Vaardigheden / keywords", type: "textarea" },
      { name: "locatie", label: "Locatie", type: "text" },
      { name: "uitsluiten", label: "Uit te sluiten termen", type: "text" },
    ],
    system: `${HOUSE_STYLE} Lever uitsluitend één boolean zoekstring terug, met AND, OR, NOT, haakjes en aanhalingstekens waar nodig. Geef daarna op een nieuwe regel na "Toelichting:" hooguit twee zinnen uitleg.`,
    buildPrompt: (v) =>
      `Stel een boolean zoekstring op.\n\n${block(v, [
        ["functies", "Functietitels/synoniemen"],
        ["skills", "Vaardigheden"],
        ["locatie", "Locatie"],
        ["uitsluiten", "Uitsluiten"],
      ])}`,
    maxTokens: 700,
  },
  {
    key: "outreach",
    label: "Outreach / InMail",
    description:
      "Een kort, persoonlijk eerste bericht aan een kandidaat.",
    fields: [
      { name: "kandidaat", label: "Naam kandidaat", type: "text", required: true },
      { name: "functie", label: "Functie waarvoor je benadert", type: "text", required: true },
      { name: "waarom", label: "Waarom deze kandidaat", type: "textarea" },
      { name: "opdrachtgever", label: "Opdrachtgever (indien te noemen)", type: "text" },
      { name: "kanaal", label: "Kanaal", type: "text", placeholder: "LinkedIn InMail of e-mail" },
      { name: "toon", label: "Toon", type: "text" },
    ],
    system: `${HOUSE_STYLE} Maximaal ~120 woorden. Persoonlijke aanhef, één concrete reden waarom je juist deze persoon benadert, kort wat de rol inhoudt, en een laagdrempelige vraag om contact. Geen opsommingstekens.`,
    buildPrompt: (v) =>
      `Schrijf een outreach-bericht.\n\n${block(v, [
        ["kandidaat", "Kandidaat"],
        ["functie", "Functie"],
        ["waarom", "Waarom deze kandidaat"],
        ["opdrachtgever", "Opdrachtgever"],
        ["kanaal", "Kanaal"],
        ["toon", "Toon"],
      ])}`,
    maxTokens: 700,
  },
  {
    key: "contract",
    label: "Contract / bevestiging",
    description:
      "Een plaatsingsbevestiging tussen RR Recruitment en de opdrachtgever.",
    fields: [
      { name: "opdrachtgever", label: "Opdrachtgever", type: "text", required: true },
      { name: "kandidaat", label: "Kandidaat", type: "text", required: true },
      { name: "functie", label: "Functie", type: "text", required: true },
      { name: "startdatum", label: "Startdatum", type: "text" },
      { name: "salaris", label: "Bruto jaarsalaris", type: "text" },
      { name: "fee", label: "Fee (bedrag of %)", type: "text" },
      { name: "garantie", label: "Garantietermijn", type: "text" },
      { name: "bijzonderheden", label: "Bijzonderheden", type: "textarea" },
    ],
    system: `${HOUSE_STYLE} Schrijf een zakelijke plaatsingsbevestiging: aanhef, bevestiging van de plaatsing met de kerngegevens, de fee-afspraak en betaaltermijn, de garantieregeling, en een afsluiting. Zet duidelijk bovenaan dat dit een concept is dat juridisch gecontroleerd moet worden.`,
    buildPrompt: (v) =>
      `Schrijf een plaatsingsbevestiging.\n\n${block(v, [
        ["opdrachtgever", "Opdrachtgever"],
        ["kandidaat", "Kandidaat"],
        ["functie", "Functie"],
        ["startdatum", "Startdatum"],
        ["salaris", "Bruto jaarsalaris"],
        ["fee", "Fee"],
        ["garantie", "Garantietermijn"],
        ["bijzonderheden", "Bijzonderheden"],
      ])}`,
  },
];

export function getGenerator(key: string): Generator | undefined {
  return GENERATORS.find((g) => g.key === key);
}
