import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

/**
 * Vult de Word-template voor de samenwerkingsovereenkomst met de
 * opgegeven waarden en geeft de gevulde .docx terug. Zelfde
 * placeholders als de losse contract-generator.
 */

const TEMPLATE_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "contract-templates",
);

const TEMPLATES: Record<"nl" | "en", string> = {
  nl: "samenwerkingsovereenkomst-nl.docx",
  en: "samenwerkingsovereenkomst-en.docx",
};

export type ContractLang = "nl" | "en";

export type ContractValues = {
  bedrijf: string;
  voornaam: string;
  achternaam: string;
  titel: string;
  adres: string;
  postcode: string;
  plaats: string;
  vacature: string;
  datum: string; // ISO yyyy-mm-dd
  percentage: string;
  exclusief_tm: string; // ISO yyyy-mm-dd
};

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string, lang: ContractLang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export async function fillContract(
  lang: ContractLang,
  v: ContractValues,
): Promise<Uint8Array> {
  const buf = await readFile(
    path.join(TEMPLATE_DIR, TEMPLATES[lang] ?? TEMPLATES.nl),
  );
  const zip = await JSZip.loadAsync(buf);

  const replacements: [string, string][] = [
    ["{bedrijf}", xmlEsc(v.bedrijf)],
    ["{voornaam}", xmlEsc(v.voornaam)],
    ["{achternaam}", xmlEsc(v.achternaam)],
    ["{Titel}", xmlEsc(v.titel)],
    ["{adres}", xmlEsc(v.adres)],
    ["{postcode}", xmlEsc(v.postcode)],
    ["{plaats}", xmlEsc(v.plaats)],
    ["{vacature}", xmlEsc(v.vacature)],
    ["{datum}", xmlEsc(fmtDate(v.datum, lang))],
    ["{percentage}", xmlEsc(v.percentage)],
    ["{exclusief_tm}", xmlEsc(fmtDate(v.exclusief_tm, lang))],
  ];

  for (const entryPath of [
    "word/document.xml",
    "word/header1.xml",
    "word/footer1.xml",
  ]) {
    const entry = zip.file(entryPath);
    if (!entry) continue;
    let content = await entry.async("string");
    for (const [ph, value] of replacements) {
      content = content.split(ph).join(value);
    }
    zip.file(entryPath, content);
  }

  return zip.generateAsync({ type: "uint8array" });
}
