"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navItems } from "@/lib/nav";
import {
  globalSearch,
  type SearchHit,
  type SearchResults,
} from "@/app/(app)/search-actions";

type Group = { label: string; items: SearchHit[] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults | null>(null);
  const [pending, setPending] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const term = q.trim();

  // Statische treffers: pagina's en tools uit de navigatie
  const staticHits = useMemo<SearchHit[]>(() => {
    const nq = term.toLowerCase();
    if (nq.length < 2) return [];
    const words = nq.split(/\s+/).filter(Boolean);
    const hit = (hay: string) => {
      const h = hay.toLowerCase();
      return h.includes(nq) || words.some((w) => w.length >= 4 && h.includes(w));
    };
    return navItems
      .filter((i) => !i.external && hit(`${i.label} ${i.description}`))
      .slice(0, 6)
      .map((i) => ({
        id: i.href,
        title: i.label,
        subtitle: i.description,
        href: i.href,
      }));
  }, [term]);

  const groups = useMemo<Group[]>(() => {
    const g: Group[] = [];
    const add = (label: string, items: SearchHit[]) => {
      if (items.length) g.push({ label, items });
    };
    if (res) {
      add("Klanten", res.clients);
      add("Contactpersonen", res.contacts);
      add("Vacatures", res.vacancies);
      add("Placements", res.placements);
      add("Facturen", res.invoices);
    }
    add("Pagina's", staticHits);
    return g;
  }, [res, staticHits]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const go = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      setQ("");
      setRes(null);
      router.push(hit.href);
    },
    [router],
  );

  // Debounced serverquery
  useEffect(() => {
    if (!open) return;
    if (term.length < 2) {
      setRes(null);
      setPending(false);
      return;
    }
    setPending(true);
    const rid = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const r = await globalSearch(term);
        if (rid === reqId.current) {
          setRes(r);
          setSel(0);
        }
      } finally {
        if (rid === reqId.current) setPending(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [term, open]);

  // Sneltoetsen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = flat[sel];
        if (hit) go(hit);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, sel, go]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-300 bg-white/70 px-2.5 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-600"
      >
        <span>Zoeken…</span>
        <kbd className="rounded border border-zinc-300 px-1 text-[10px] text-zinc-400 dark:border-zinc-700">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/40 px-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-fit w-full max-w-xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek klant, contactpersoon, vacature, factuur, pagina…"
              className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800"
            />

            <div className="max-h-[60vh] overflow-y-auto py-1">
              {term.length < 2 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-400">
                  Typ minstens 2 tekens. Zoekt in klanten, contactpersonen,
                  vacatures, placements, facturen en pagina&rsquo;s.
                </p>
              )}
              {term.length >= 2 && flat.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-zinc-400">
                  {pending ? "Zoeken…" : `Niets gevonden voor “${term}”.`}
                </p>
              )}

              {groups.map((group) => (
                <div key={group.label} className="py-1">
                  <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    {group.label}
                  </p>
                  {group.items.map((hit) => {
                    const active = flat.indexOf(hit) === sel;
                    return (
                      <button
                        key={`${group.label}-${hit.id}`}
                        type="button"
                        onClick={() => go(hit)}
                        className={`flex w-full flex-col items-start px-4 py-2 text-left ${
                          active
                            ? "bg-terra/10 dark:bg-terra/20"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {hit.title}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {hit.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
