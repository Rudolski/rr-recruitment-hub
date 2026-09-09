/**
 * Vacature-scrapers. Twee modi, allebei met een gewone fetch (geen
 * headless browser):
 *  - sitemap : haal een sitemap (of sitemap-index) op en filter <loc>'s
 *  - html    : haal een lijstpagina op en trek de vacature-links eruit
 *
 * Alleen server-side gebruiken.
 */

export type ScrapedVacancy = {
  url: string;
  /** Stabiele sleutel voor deduplicatie — de genormaliseerde URL. */
  externalKey: string;
  title: string;
  /** Naam van de opdrachtgever, indien de vacature die concreet noemt. */
  company: string | null;
  location: string | null;
  /** yyyy-mm-dd, indien bekend (sitemap <lastmod> of JSON-LD datePosted). */
  postedOn: string | null;
};

// Sommige sites (o.a. VIA Logistics) serveren een uitgeklede pagina aan
// niet-browser user-agents; daarom een gewone Chrome-UA.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml,text/xml",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} bij ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(href: string, base: string): string {
  try {
    const u = new URL(href, base);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/+$/, "");
  } catch {
    return href.trim();
  }
}

function lastSegment(url: string): string {
  return url.split("/").filter(Boolean).pop() ?? url;
}

/** Slug → leesbare titel. Strip id-achtige prefixes en suffixes. */
export function titleFromSlug(slug: string): string {
  const s = slug
    .replace(/^[a-z0-9]{15,}-/i, "") // Salesforce-achtige id-prefix
    .replace(/-vacancies?-\d+-?[a-z]?$/i, "") // Personato -vacancies-5445-c
    .replace(/-\d{3,}$/i, "") // los id achteraan
    .replace(/\.(x?html?|aspx?|php)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return slug;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedupe(list: ScrapedVacancy[]): ScrapedVacancy[] {
  const map = new Map<string, ScrapedVacancy>();
  for (const v of list) {
    const cur = map.get(v.externalKey);
    if (!cur || v.title.length > cur.title.length) map.set(v.externalKey, v);
  }
  return [...map.values()];
}

/* -------------------- sitemap / RSS / Atom -------------------- */

/** yyyy-mm-dd uit een ISO- of RFC-822-datum. */
function toDateOnly(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

function cleanFeedTitle(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(vacature|vacancy|job opening|job)[:\s-]+/i, "")
    .trim();
}

type FeedEntry = { loc: string; lastmod: string | null; title: string | null };

/**
 * Leest een sitemap (`<url>`/`<sitemap>`), RSS (`<item>`) of Atom
 * (`<entry>`). Volgt één niveau van een sitemap-index.
 */
export async function scrapeSitemap(
  opts: { url: string; pathFilter: string | null },
  depth = 0,
): Promise<ScrapedVacancy[]> {
  const xml = await fetchText(opts.url);
  const filter = opts.pathFilter?.toLowerCase().trim() || null;

  const entries: FeedEntry[] = [];

  // Sitemap
  for (const m of xml.matchAll(
    /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/gi,
  )) {
    const b = m[1];
    const loc = b.match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.[1];
    if (loc)
      entries.push({
        loc,
        lastmod: b.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i)?.[1] ?? null,
        title: null,
      });
  }
  // RSS
  for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    const loc = b.match(/<link>\s*([^<\s]+)\s*<\/link>/i)?.[1];
    if (loc)
      entries.push({
        loc,
        lastmod:
          b.match(/<pubDate>\s*([^<]+?)\s*<\/pubDate>/i)?.[1] ??
          b.match(/<dc:date>\s*([^<]+?)\s*<\/dc:date>/i)?.[1] ??
          null,
        title: b.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null,
      });
  }
  // Atom
  for (const m of xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)) {
    const b = m[1];
    const loc =
      b.match(/<link[^>]*\bhref=["']([^"']+)["']/i)?.[1] ??
      b.match(/<link>\s*([^<\s]+)\s*<\/link>/i)?.[1];
    if (loc)
      entries.push({
        loc,
        lastmod:
          b.match(/<updated>\s*([^<]+?)\s*<\/updated>/i)?.[1] ??
          b.match(/<published>\s*([^<]+?)\s*<\/published>/i)?.[1] ??
          null,
        title: b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
      });
  }

  // Sitemap-index: één niveau dieper op de relevante sub-sitemaps.
  if (/<sitemapindex/i.test(xml) && depth < 2) {
    const subs = entries
      .map((e) => e.loc)
      .filter(
        (u) =>
          /sitemap|vac/i.test(u) &&
          (!filter || u.toLowerCase().includes(filter) || /vac/i.test(u)),
      )
      .slice(0, 12);
    const out: ScrapedVacancy[] = [];
    for (const sub of subs) {
      try {
        out.push(
          ...(await scrapeSitemap({ url: sub, pathFilter: filter }, depth + 1)),
        );
      } catch {
        // sla een kapotte sub-sitemap over
      }
    }
    return dedupe(out);
  }

  const SKIP_SLUG =
    /\/(open-sollicitatie|open-application|open-aanmelding|vacature-plaatsen|vacature-melden|talentpool|talent-pool)\/?$/i;

  const hits = entries.filter(
    (e) =>
      !SKIP_SLUG.test(e.loc) &&
      (filter ? e.loc.toLowerCase().includes(filter) : true),
  );

  return dedupe(
    hits.map((e) => {
      const url = normalizeUrl(e.loc, opts.url);
      const feedTitle = e.title ? cleanFeedTitle(e.title) : "";
      return {
        url,
        externalKey: url,
        title: feedTitle || titleFromSlug(lastSegment(url)),
        company: null,
        location: null,
        postedOn: toDateOnly(e.lastmod),
      };
    }),
  );
}

/* -------------------- html-lijst -------------------- */

// Matcht zowel /vacature/functie als /vacature-servicekantoor/functie
// e.d. Een dieptefilter hieronder gooit lijst-/categoriepagina's er weer
// uit.
const DEFAULT_LINK_RE =
  "(vacature|vacatures|vacancy|vacancies|job|jobs|career|careers|werken-?bij)[-/][a-z0-9]";

const SKIP_TEXT_RE =
  /^(bekijk|lees meer|meer info(rmatie)?|apply|solliciteer|view|details?|open sollicitatie|vacature plaatsen)\b/i;

function pathDepth(url: string): number {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).length;
  } catch {
    return 0;
  }
}

export async function scrapeHtmlList(opts: {
  url: string;
  linkPattern: string | null;
  maxPages: number;
}): Promise<ScrapedVacancy[]> {
  let re: RegExp;
  try {
    re = new RegExp(opts.linkPattern || DEFAULT_LINK_RE, "i");
  } catch {
    re = new RegExp(DEFAULT_LINK_RE, "i");
  }

  const pages = Math.max(1, Math.min(opts.maxPages || 1, 10));
  const listingUrl = normalizeUrl(opts.url, opts.url);
  // Detailpagina's zitten dieper in het pad dan de lijstpagina; alleen
  // een aangepast linkpatroon zet dit filter opzij.
  const minDepth = opts.linkPattern ? 0 : pathDepth(listingUrl) + 1;
  const found = new Map<string, ScrapedVacancy>();

  for (let p = 1; p <= pages; p++) {
    const pageUrl =
      p === 1
        ? opts.url
        : `${opts.url}${opts.url.includes("?") ? "&" : "?"}page=${p}`;

    let html: string;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      if (p === 1) throw e;
      break;
    }

    for (const m of html.matchAll(
      /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const href = m[1];
      if (!re.test(href)) continue;

      const url = normalizeUrl(href, opts.url);
      if (url === listingUrl) continue;
      if (/\/(vacatures|vacancies|jobs|careers|werken-?bij)$/i.test(url))
        continue;
      // Geen echte vacature: open sollicitatie, feeds, vacature plaatsen.
      if (
        /\/(open-sollicitatie|open-application|vacature-plaatsen|vacature-melden|rss|feed)(\.\w+)?$/i.test(
          url,
        ) ||
        /\.(xml|rss|json)$/i.test(url)
      )
        continue;
      // Externe links en te ondiepe (lijst/categorie) links overslaan.
      if (!url.startsWith(new URL(opts.url).origin)) continue;
      if (pathDepth(url) < minDepth) continue;

      const text = m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const clean = text.replace(/^lees meer over\s*/i, "").trim();
      const title =
        clean && clean.length > 2 && !SKIP_TEXT_RE.test(clean)
          ? clean
          : titleFromSlug(lastSegment(url));

      const cur = found.get(url);
      if (!cur || title.length > cur.title.length) {
        found.set(url, {
          url,
          externalKey: url,
          title,
          company: null,
          location: null,
          postedOn: null,
        });
      }
    }
  }

  return [...found.values()];
}

/* -------------------- verrijken (exclusief-check) -------------------- */

/**
 * Haalt de detailpagina op en probeert de opdrachtgevernaam te vinden.
 * Alleen als die concreet genoemd wordt is een vacature "exclusief".
 * Pakt onderweg ook een betere plaatsingsdatum mee (JSON-LD datePosted).
 */
export async function enrichVacancy(
  url: string,
): Promise<{ company: string | null; postedOn: string | null }> {
  let html: string;
  try {
    html = await fetchText(url, 12000);
  } catch {
    return { company: null, postedOn: null };
  }

  const postedOn =
    html.match(/"datePosted"\s*:\s*"(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;

  let company: string | null = null;

  // 1) VIA Logistics e.d.: <li class="meta-organization"><i>..</i> Naam</li>
  const li = html.match(
    /<li[^>]*class=["'][^"']*meta-organization[^"']*["'][^>]*>([\s\S]*?)<\/li>/i,
  );
  if (li) {
    const txt = li[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (txt) company = txt;
  }

  // 2) Personato e.d.: .../CmsData/images/Opdrachtgevers/<Naam>/logo...
  if (!company) {
    const seg = html.match(/\/Opdrachtgevers\/([^/"'\\]+)\//i)?.[1];
    if (seg && !/^(default|geen|onbekend)$/i.test(seg)) {
      company = decodeURIComponent(seg).replace(/[-_]+/g, " ").trim();
    }
  }

  // Geen betrouwbare naam gevonden -> als anoniem behandelen. Bewust
  // geen JSON-LD hiringOrganization-fallback: bureaus zetten daar vaak
  // hun eigen naam neer, wat een vals-positieve "exclusief" oplevert.
  if (
    company &&
    (company.length > 120 || /^onze opdrachtgever/i.test(company))
  ) {
    company = null;
  }
  return { company: company || null, postedOn };
}

/** Voert `fn` uit over `items` met maximaal `limit` tegelijk. */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        out[idx] = await fn(items[idx]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}
