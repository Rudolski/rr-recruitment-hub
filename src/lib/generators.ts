/**
 * Definities van de AI-generatoren (fase 3). Elke generator heeft
 * invoervelden, een systeemprompt en een functie die de
 * gebruikersprompt opbouwt. Ze delen allemaal dezelfde server-side
 * Claude-laag (src/lib/anthropic.ts). De kandidaatintroductie heeft
 * daarnaast een eigen, uitgebreidere pagina.
 */
import { BOOLEAN_SYSTEM, buildBooleanPrompt } from "@/lib/boolean-search";
import { KANDIDAATINTRO_SYSTEM } from "@/lib/kandidaatintro";

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
      "Herschrijf de originele vacature naar een tekst voor de RR-website (met naam / anoniem) of een banensite.",
    // Eigen pagina: src/app/(app)/tools/generator/vacaturetekst/
    fields: [
      {
        name: "origineel",
        label: "Originele vacaturetekst",
        type: "textarea",
        required: true,
      },
    ],
    system: `${HOUSE_STYLE}`,
    buildPrompt: (v) => `Herschrijf deze vacaturetekst.\n\n${v.origineel ?? ""}`,
    maxTokens: 4000,
  },
  {
    key: "kandidaatintro",
    label: "Kandidaatintroductie",
    description:
      "Introductie richting de klant op basis van cv en gespreksaantekeningen.",
    // Eigen pagina: src/app/(app)/tools/generator/kandidaatintro/
    fields: [
      { name: "cv", label: "CV / profieltekst", type: "textarea", required: true },
    ],
    system: KANDIDAATINTRO_SYSTEM,
    maxTokens: 3000,
    buildPrompt: (v) =>
      `Klant: onbekend\nVacature: onbekend\n\n=== CV van de kandidaat ===\n${
        v.cv ?? ""
      }`,
  },
  {
    key: "boolean",
    label: "Boolean search",
    description:
      "Boolean zoekstring op basis van de vacaturetekst, aantekeningen, locatie en uit te sluiten termen.",
    // Eigen pagina: src/app/(app)/tools/generator/boolean/
    fields: [
      {
        name: "origineel",
        label: "Vacaturetekst",
        type: "textarea",
        required: true,
      },
      { name: "locatie", label: "Locatie", type: "text" },
      { name: "uitsluiten", label: "Uit te sluiten termen", type: "text" },
    ],
    system: BOOLEAN_SYSTEM,
    buildPrompt: (v) =>
      buildBooleanPrompt({
        original: v.origineel ?? "",
        notes: "",
        locatie: v.locatie ?? "",
        uitsluiten: v.uitsluiten ?? "",
      }),
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
];

export function getGenerator(key: string): Generator | undefined {
  return GENERATORS.find((g) => g.key === key);
}
