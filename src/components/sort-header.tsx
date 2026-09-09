import Link from "next/link";
import { th } from "@/components/ui";

export type SortDir = "asc" | "desc";

/**
 * Klikbare kolomkop die sorteert via ?sort=<key>&dir=<asc|desc>.
 * Zelfde key nog eens aanklikken draait de richting om; een andere
 * kolom start op oplopend. Puur links, geen client-side JS.
 */
export function SortHeader({
  label,
  columnKey,
  activeKey,
  dir,
  basePath,
  align = "left",
}: {
  label: string;
  columnKey: string;
  activeKey: string;
  dir: SortDir;
  basePath: string;
  align?: "left" | "right";
}) {
  const isActive = activeKey === columnKey;
  const nextDir: SortDir = isActive && dir === "asc" ? "desc" : "asc";
  const arrow = isActive ? (dir === "asc" ? "▲" : "▼") : "↕";
  // basePath mag al een querystring bevatten (bijv. een actief filter).
  const sep = basePath.includes("?") ? "&" : "?";

  return (
    <th className={th}>
      <Link
        href={`${basePath}${sep}sort=${columnKey}&dir=${nextDir}`}
        className={`inline-flex items-center gap-1 hover:underline ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <span className="text-zinc-400">{arrow}</span>
      </Link>
    </th>
  );
}

/** Leest sort/dir uit de searchParams, met fallback. */
export function readSort<K extends string>(
  sp: { [key: string]: string | string[] | undefined },
  allowed: readonly K[],
  fallback: K,
): { sort: K; dir: SortDir } {
  const raw = typeof sp.sort === "string" ? sp.sort : "";
  const sort = (allowed as readonly string[]).includes(raw)
    ? (raw as K)
    : fallback;
  const dir: SortDir = sp.dir === "desc" ? "desc" : "asc";
  return { sort, dir };
}

/** Stringvergelijking (nl, hoofdletterongevoelig). Lege waarden sorteren
 * als "" — vooraan bij oplopend, achteraan bij aflopend. */
export function cmpText(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return (a ?? "")
    .trim()
    .localeCompare((b ?? "").trim(), "nl", { sensitivity: "base" });
}
