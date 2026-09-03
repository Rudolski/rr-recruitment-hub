/** Gedeelde Tailwind-klassen zodat formulieren en knoppen consistent zijn. */

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800";

export const labelClass =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export const btnPrimary =
  "rounded-md bg-terra px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terra-dark disabled:opacity-60";

export const btnGhost =
  "text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

/** Kop in het huisstijl-lettertype (Roc Grotesk). */
export const heading =
  "font-[family-name:var(--font-roc)] tracking-tight";

export const btnDanger =
  "rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950";

export const tableWrap =
  "mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800";

export const table = "w-full text-left text-sm";

export const thead =
  "border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900";

export const th = "px-4 py-2.5 font-medium";

export const tbody = "divide-y divide-zinc-100 dark:divide-zinc-800";

export const tr = "hover:bg-zinc-50 dark:hover:bg-zinc-900";

export const td = "px-4 py-3";

export const emptyState =
  "mt-8 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

export const errorBox =
  "mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300";
