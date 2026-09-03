"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navItems } from "@/lib/nav";
import {
  globalSearch,
  type SearchHit,
  type SearchResults,
} from "@/app/(app)/search-actions";

type Group = { label: string; icon: IconName; items: SearchHit[] };
type IconName =
  | "search"
  | "klant"
  | "contact"
  | "vacature"
  | "placement"
  | "factuur"
  | "pagina";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="6" />
          <path d="m17 17-3.5-3.5" />
        </svg>
      );
    case "klant":
      return (
        <svg {...common}>
          <path d="M4 17V5.5A1.5 1.5 0 0 1 5.5 4h6A1.5 1.5 0 0 1 13 5.5V17" />
          <path d="M13 9h2.5A1.5 1.5 0 0 1 17 10.5V17M2 17h16M7 7h3M7 10h3M7 13h3" />
        </svg>
      );
    case "contact":
      return (
        <svg {...common}>
          <circle cx="10" cy="7" r="3" />
          <path d="M4.5 16.5a5.5 5.5 0 0 1 11 0" />
        </svg>
      );
    case "vacature":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="14" height="10" rx="1.5" />
          <path d="M7.5 6V5A1.5 1.5 0 0 1 9 3.5h2A1.5 1.5 0 0 1 12.5 5v1M3 10.5h14" />
        </svg>
      );
    case "placement":
      return (
        <svg {...common}>
          <path d="M10 2.5 12 4l2.4-.3.6 2.3 2 1.4-1 2.2 1 2.2-2 1.4-.6 2.3L12 17l-2 1.5L8 17l-2.4.3-.6-2.3-2-1.4 1-2.2-1-2.2 2-1.4.6-2.3L8 4z" />
          <path d="m7.5 10 1.8 1.8L13 8" />
        </svg>
      );
    case "factuur":
      return (
        <svg {...common}>
          <path d="M5 2.5h7L16 6v11.5H5z" />
          <path d="M12 2.5V6h4M7.5 10h6M7.5 13h6" />
        </svg>
      );
    case "pagina":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="11" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="11" width="6" height="6" rx="1" />
          <rect x="11" y="11" width="6" height="6" rx="1" />
        </svg>
      );
  }
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResults | null>(null);
  const [pending, setPending] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const reqId = useRef(0);

  const term = q.trim();

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
    const add = (label: string, icon: IconName, items: SearchHit[]) => {
      if (items.length) g.push({ label, icon, items });
    };
    if (res) {
      add("Klanten", "klant", res.clients);
      add("Contactpersonen", "contact", res.contacts);
      add("Vacatures", "vacature", res.vacancies);
      add("Placements", "placement", res.placements);
      add("Facturen", "factuur", res.invoices);
    }
    add("Pagina's", "pagina", staticHits);
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
    if (open) {
      inputRef.current?.focus();
      const r = requestAnimationFrame(() => setShown(true));
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        cancelAnimationFrame(r);
        document.body.style.overflow = prev;
      };
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2 rounded-lg border border-zinc-300/80 bg-white/50 px-2.5 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700/80 dark:bg-black/20 dark:hover:border-zinc-600 dark:hover:bg-black/30"
      >
        <Icon name="search" className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="flex-1 text-left">Zoeken</span>
        <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex justify-center bg-navy/40 px-4 pt-[12vh] backdrop-blur-sm transition-opacity duration-150 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        >
          <div
            className={`h-fit w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5 transition duration-150 dark:border-zinc-800 dark:bg-zinc-950 ${
              shown
                ? "translate-y-0 scale-100 opacity-100"
                : "-translate-y-1 scale-[0.98] opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
              <Icon name="search" className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek klant, contact, vacature, factuur, pagina…"
                className="flex-1 bg-transparent py-3.5 text-[15px] outline-none placeholder:text-zinc-400"
              />
              {pending && (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-zinc-300 border-t-terra" />
              )}
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2">
              {term.length < 2 && (
                <p className="px-3 py-8 text-center text-sm text-zinc-400">
                  Typ minstens 2 tekens om te zoeken.
                </p>
              )}
              {term.length >= 2 && flat.length === 0 && !pending && (
                <p className="px-3 py-8 text-center text-sm text-zinc-400">
                  Niets gevonden voor &ldquo;{term}&rdquo;.
                </p>
              )}

              {groups.map((group) => (
                <div key={group.label} className="mb-1 last:mb-0">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {group.label}
                  </p>
                  {group.items.map((hit) => {
                    const active = flat.indexOf(hit) === sel;
                    return (
                      <button
                        key={`${group.label}-${hit.id}`}
                        ref={active ? activeRef : undefined}
                        type="button"
                        onClick={() => go(hit)}
                        onMouseMove={() => setSel(flat.indexOf(hit))}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          active
                            ? "bg-terra/10 dark:bg-terra/20"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            active
                              ? "bg-terra/15 text-terra dark:text-cream"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                          }`}
                        >
                          <Icon name={group.icon} className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">
                            {hit.title}
                          </span>
                          <span className="block truncate text-xs text-zinc-400">
                            {hit.subtitle}
                          </span>
                        </span>
                        {active && (
                          <kbd className="shrink-0 rounded border border-zinc-300 px-1 text-[10px] text-zinc-400 dark:border-zinc-700">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
              <span>
                <kbd className="rounded border border-zinc-300 px-1 dark:border-zinc-700">
                  ↑
                </kbd>{" "}
                <kbd className="rounded border border-zinc-300 px-1 dark:border-zinc-700">
                  ↓
                </kbd>{" "}
                navigeren
              </span>
              <span>
                <kbd className="rounded border border-zinc-300 px-1 dark:border-zinc-700">
                  ↵
                </kbd>{" "}
                openen
              </span>
              <span>
                <kbd className="rounded border border-zinc-300 px-1 dark:border-zinc-700">
                  esc
                </kbd>{" "}
                sluiten
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
