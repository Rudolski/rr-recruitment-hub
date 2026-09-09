import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  enrichVacancy,
  mapPool,
  scrapeHtmlList,
  scrapeSitemap,
  type ScrapedVacancy,
} from "./scrape";

/** Bovengrens op het aantal detailpagina's per scan (exclusief-check). */
const MAX_ENRICH = 250;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Namen waaronder het bureau zelf werft (afgeleid van de bronnaam en
 * het domein). Een vacature "op naam van" die naam is voor ons niet
 * exclusief — het bureau noemt gewoon zichzelf.
 */
function selfBrands(source: WatchSourceRow): string[] {
  const brands = [source.name];
  try {
    const host = new URL(source.fetch_url).hostname
      .replace(/^www\./, "")
      .split(".")[0];
    if (host) brands.push(host);
  } catch {
    // ongeldige url -> alleen de bronnaam
  }
  return brands.map(norm).filter((b) => b.length >= 4);
}

function isOwnBrand(company: string, brands: string[]): boolean {
  const c = norm(company);
  return brands.some((b) => c.includes(b) || b.includes(c));
}

type DB = SupabaseClient<Database>;
type WatchSourceRow = Database["public"]["Tables"]["watch_sources"]["Row"];

export type ScanResult = {
  source: string;
  ok: boolean;
  found: number;
  created: number;
  closed: number;
  note: string;
};

/** Eén bron scrapen en het verschil wegschrijven. */
export async function scanSource(
  db: DB,
  source: WatchSourceRow,
): Promise<ScanResult> {
  const now = new Date().toISOString();

  let scraped: ScrapedVacancy[];
  try {
    scraped =
      source.mode === "sitemap"
        ? await scrapeSitemap({
            url: source.fetch_url,
            pathFilter: source.path_filter,
          })
        : await scrapeHtmlList({
            url: source.fetch_url,
            linkPattern: source.link_pattern,
            maxPages: source.max_pages,
          });
  } catch (e) {
    const note = (e as Error).message.slice(0, 300);
    await db
      .from("watch_sources")
      .update({
        last_scan_at: now,
        last_scan_status: "error",
        last_scan_note: note,
      })
      .eq("id", source.id);
    return { source: source.name, ok: false, found: 0, created: 0, closed: 0, note };
  }

  const { data: existing } = await db
    .from("watch_vacancies")
    .select("id, external_key, closed_at, company")
    .eq("source_id", source.id);

  const byKey = new Map((existing ?? []).map((r) => [r.external_key, r]));

  // Exclusief-check: per vacature de detailpagina ophalen voor de
  // opdrachtgevernaam. Vacatures die we al mét naam kennen slaan we over
  // (scheelt requests); alleen mét naam blijft bewaard.
  // Niet van toepassing op een klant-bron: dat ís al de site van die
  // opdrachtgever, er staat geen externe opdrachtgever in.
  const exclusiveMode = source.exclusive_only && source.kind !== "klant";
  let enriched = 0;
  if (exclusiveMode) {
    const brands = selfBrands(source);
    // Een al bekende company die het eigen merk blijkt te zijn moet
    // alsnog opnieuw beoordeeld worden -> dan tóch de detailpagina ophalen.
    const toFetch = scraped
      .filter((v) => {
        const known = byKey.get(v.externalKey)?.company ?? null;
        return !known || isOwnBrand(known, brands);
      })
      .slice(0, MAX_ENRICH);
    const results = await mapPool(toFetch, 5, (v) => enrichVacancy(v.url));
    enriched = toFetch.length;
    const found = new Map(toFetch.map((v, i) => [v.externalKey, results[i]]));

    scraped = scraped
      .map((v) => {
        const known = byKey.get(v.externalKey)?.company ?? null;
        const fresh = found.get(v.externalKey);
        let company = fresh?.company ?? known ?? null;
        if (company && isOwnBrand(company, brands)) company = null;
        return {
          ...v,
          company,
          postedOn: fresh?.postedOn ?? v.postedOn,
        };
      })
      .filter((v) => v.company);
  }

  const seen = new Set(scraped.map((v) => v.externalKey));
  const created = scraped.filter((v) => !byKey.has(v.externalKey)).length;

  if (scraped.length > 0) {
    const rows = scraped.map((v) => ({
      organization_id: source.organization_id,
      source_id: source.id,
      url: v.url,
      external_key: v.externalKey,
      title: v.title,
      company: v.company,
      location: v.location,
      posted_on: v.postedOn,
      last_seen_at: now,
      closed_at: null as string | null,
    }));
    const { error } = await db
      .from("watch_vacancies")
      .upsert(rows, { onConflict: "source_id,external_key" });
    if (error) {
      await db
        .from("watch_sources")
        .update({
          last_scan_at: now,
          last_scan_status: "error",
          last_scan_note: error.message.slice(0, 300),
        })
        .eq("id", source.id);
      return {
        source: source.name,
        ok: false,
        found: scraped.length,
        created: 0,
        closed: 0,
        note: error.message,
      };
    }
  }

  // Vacatures die niet meer op de site staan: dichtzetten.
  const staleIds = (existing ?? [])
    .filter((r) => !seen.has(r.external_key) && !r.closed_at)
    .map((r) => r.id);
  if (staleIds.length > 0) {
    await db
      .from("watch_vacancies")
      .update({ closed_at: now })
      .in("id", staleIds);
  }

  const note =
    `${scraped.length} ${exclusiveMode ? "exclusief" : "gevonden"} · ` +
    `${created} nieuw · ${staleIds.length} gesloten` +
    (enriched ? ` · ${enriched} gecheckt` : "");
  await db
    .from("watch_sources")
    .update({ last_scan_at: now, last_scan_status: "ok", last_scan_note: note })
    .eq("id", source.id);

  return {
    source: source.name,
    ok: true,
    found: scraped.length,
    created,
    closed: staleIds.length,
    note,
  };
}

/** Alle actieve bronnen scrapen (optioneel binnen één organisatie). */
export async function scanAll(
  db: DB,
  opts: { organizationId?: string } = {},
): Promise<ScanResult[]> {
  let q = db.from("watch_sources").select("*").eq("active", true);
  if (opts.organizationId) q = q.eq("organization_id", opts.organizationId);
  const { data: sources, error } = await q.returns<WatchSourceRow[]>();
  if (error) throw error;

  const results: ScanResult[] = [];
  for (const s of sources ?? []) {
    results.push(await scanSource(db, s));
  }
  return results;
}
