import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

/**
 * Vult de Word-template voor de samenwerkingsovereenkomst met de
 * opgegeven waarden en geeft de gevulde .docx terug.
 *
 * De Nederlandse en Engelse template gebruiken andere placeholdernamen
 * ({bedrijf} vs {company}, {voornaam} vs {first name}, ...), en Word kan
 * één placeholder over meerdere "runs" verdelen — daarom wordt per
 * alinea over de samengevoegde tekst gezocht en worden de runs
 * (opmaak) zoveel mogelijk behouden.
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

/** placeholdernaam (lowercase, spaties als _) -> waarde-sleutel */
const PLACEHOLDERS: Record<ContractLang, Record<string, keyof ContractValues>> = {
  nl: {
    bedrijf: "bedrijf",
    voornaam: "voornaam",
    achternaam: "achternaam",
    titel: "titel",
    adres: "adres",
    postcode: "postcode",
    plaats: "plaats",
    vacature: "vacature",
    datum: "datum",
    percentage: "percentage",
    exclusief_tm: "exclusief_tm",
  },
  en: {
    company: "bedrijf",
    first_name: "voornaam",
    surname: "achternaam",
    title: "titel",
    address: "adres",
    postcode: "postcode",
    town: "plaats",
    vacancy: "vacature",
    date: "datum",
    percentage: "percentage",
    exclusively_until: "exclusief_tm",
  },
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

const normKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");

/**
 * Vervangt placeholders in één alinea (<w:p>…</w:p>), ook als Word ze over
 * meerdere <w:t>-runs heeft verdeeld. De vervangende tekst komt in de run
 * waar de placeholder begint; de rest van de placeholder wordt uit de
 * volgende runs gehaald, zodat de overige opmaak blijft staan.
 */
function fillParagraph(
  para: string,
  lookup: (key: string) => string | undefined,
): string {
  const runRe = /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g;
  const runs: { start: number; end: number; open: string; text: string; close: string }[] = [];
  for (let m = runRe.exec(para); m; m = runRe.exec(para)) {
    runs.push({
      start: m.index,
      end: m.index + m[0].length,
      open: m[1],
      text: m[2],
      close: m[3],
    });
  }
  if (runs.length === 0) return para;

  const joined = runs.map((r) => r.text).join("");
  if (!joined.includes("{")) return para;

  // Begin-offset van elke run in de samengevoegde tekst.
  const offsets: number[] = [];
  let acc = 0;
  for (const r of runs) {
    offsets.push(acc);
    acc += r.text.length;
  }

  const matches = [...joined.matchAll(/\{([^{}]{1,40})\}/g)];
  let changed = false;
  // Van achter naar voren, zodat eerdere offsets geldig blijven.
  for (const m of matches.reverse()) {
    const value = lookup(m[1]);
    if (value === undefined) continue;
    changed = true;
    const s = m.index as number;
    const e = s + m[0].length;
    let placed = false;
    runs.forEach((r, i) => {
      const rs = offsets[i];
      const re = rs + r.text.length;
      if (re <= s || rs >= e) return;
      const from = Math.max(s, rs) - rs;
      const to = Math.min(e, re) - rs;
      r.text =
        r.text.slice(0, from) + (placed ? "" : value) + r.text.slice(to);
      placed = true;
    });
  }
  if (!changed) return para;

  let out = "";
  let last = 0;
  for (const r of runs) {
    out += para.slice(last, r.start);
    const open = /xml:space=/.test(r.open)
      ? r.open
      : r.open.replace(/^<w:t/, '<w:t xml:space="preserve"');
    out += open + r.text + r.close;
    last = r.end;
  }
  return out + para.slice(last);
}

export async function fillContract(
  lang: ContractLang,
  v: ContractValues,
): Promise<Uint8Array> {
  const buf = await readFile(
    path.join(TEMPLATE_DIR, TEMPLATES[lang] ?? TEMPLATES.nl),
  );
  const zip = await JSZip.loadAsync(buf);

  const map = PLACEHOLDERS[lang] ?? PLACEHOLDERS.nl;
  const lookup = (raw: string): string | undefined => {
    const key = map[normKey(raw)];
    if (!key) return undefined;
    const value =
      key === "datum" || key === "exclusief_tm"
        ? fmtDate(v[key], lang)
        : v[key];
    return xmlEsc(value);
  };

  for (const entryPath of [
    "word/document.xml",
    "word/header1.xml",
    "word/footer1.xml",
  ]) {
    const entry = zip.file(entryPath);
    if (!entry) continue;
    const content = await entry.async("string");
    zip.file(
      entryPath,
      content.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => fillParagraph(p, lookup)),
    );
  }

  return zip.generateAsync({ type: "uint8array" });
}
