/**
 * Definities van de AI-generatoren (fase 3). Elke generator heeft
 * invoervelden, een systeemprompt en een functie die de
 * gebruikersprompt opbouwt. Ze delen allemaal dezelfde server-side
 * Claude-laag (src/lib/anthropic.ts). De kandidaatintroductie heeft
 * daarnaast een eigen, uitgebreidere pagina.
 */
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
      "Introductie richting de klant op basis van cv en intake-aantekeningen.",
    // Eigen pagina met cv- en aantekeningenvelden:
    // src/app/(app)/tools/generator/kandidaatintro/
    fields: [
      { name: "kandidaat", label: "Naam kandidaat", type: "text", required: true },
      { name: "vacature", label: "Voor welke vacature", type: "text" },
      { name: "cv", label: "CV (plak de tekst)", type: "textarea" },
      {
        name: "aantekeningen",
        label: "Aantekeningen / transcriptie intake",
        type: "textarea",
      },
    ],
    system: KANDIDAATINTRO_SYSTEM,
    maxTokens: 3000,
    buildPrompt: (v) =>
      `Klant: onbekend\nVacature / functie: ${v.vacature || "onbekend"}\n\n===== Kandidaat 1: ${
        v.kandidaat || "(naam onbekend)"
      } =====\n\nCV:\n${v.cv || "(geen cv aangeleverd)"}\n\nAantekeningen intakegesprek en/of transcriptie:\n${
        v.aantekeningen || "(geen aantekeningen aangeleverd)"
      }`,
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
];

export function getGenerator(key: string): Generator | undefined {
  return GENERATORS.find((g) => g.key === key);
}
