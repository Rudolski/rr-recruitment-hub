import {
  WATCH_KINDS,
  WATCH_KIND_LABELS,
  WATCH_MODES,
  WATCH_MODE_LABELS,
  type Client,
  type WatchSource,
} from "@/lib/types";
import { addSource, deleteSource, toggleSource, updateSource } from "./actions";

const field =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const labelCls = "block text-xs text-zinc-500";

function SourceFields({
  source,
  clients,
}: {
  source?: WatchSource;
  clients: Pick<Client, "id" | "name">[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className={labelCls}>Naam</span>
        <input
          name="name"
          required
          defaultValue={source?.name ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm">
        <span className={labelCls}>Soort</span>
        <select
          name="kind"
          defaultValue={source?.kind ?? "concurrent"}
          className={field}
        >
          {WATCH_KINDS.filter((k) => k !== "prospect").map((k) => (
            <option key={k} value={k}>
              {WATCH_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm sm:col-span-2">
        <span className={labelCls}>URL (sitemap of lijstpagina)</span>
        <input
          name="fetch_url"
          required
          type="url"
          placeholder="https://www.voorbeeld.nl/sitemap.xml"
          defaultValue={source?.fetch_url ?? ""}
          className={field}
        />
      </label>

      <label className="text-sm">
        <span className={labelCls}>Modus</span>
        <select
          name="mode"
          defaultValue={source?.mode ?? "sitemap"}
          className={field}
        >
          {WATCH_MODES.map((m) => (
            <option key={m} value={m}>
              {WATCH_MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className={labelCls}>Klant koppelen (alleen bij soort Klant)</span>
        <select
          name="client_id"
          defaultValue={source?.client_id ?? ""}
          className={field}
        >
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className={labelCls}>
          Padfilter (sitemap) — bijv. logistiek-supply-chain
        </span>
        <input
          name="path_filter"
          defaultValue={source?.path_filter ?? ""}
          className={field}
        />
      </label>

      <label className="text-sm">
        <span className={labelCls}>
          Linkpatroon (html, regex) — leeg = standaard
        </span>
        <input
          name="link_pattern"
          defaultValue={source?.link_pattern ?? ""}
          className={field}
        />
      </label>

      <label className="text-sm">
        <span className={labelCls}>Max. pagina&apos;s (html)</span>
        <input
          name="max_pages"
          type="number"
          min={1}
          max={10}
          defaultValue={source?.max_pages ?? 1}
          className={field}
        />
      </label>

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="exclusive_only"
          defaultChecked={source?.exclusive_only ?? false}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Alleen exclusieve vacatures</span>
          <span className="block text-xs text-zinc-500">
            Alleen zinvol bij concurrenten. Haalt per vacature de
            detailpagina op en bewaart alleen die waar een opdrachtgever
            met naam in staat; anonieme vacatures worden overgeslagen. Bij
            een klant-bron wordt dit genegeerd (dat ís al hun eigen site).
          </span>
        </span>
      </label>
    </div>
  );
}

export function RadarSources({
  sources,
  clients,
  clientName,
}: {
  sources: WatchSource[];
  clients: Pick<Client, "id" | "name">[];
  clientName: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <form action={addSource} className="space-y-3">
        <p className="text-sm font-medium">Bron toevoegen</p>
        <SourceFields clients={clients} />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Toevoegen
        </button>
      </form>

      {sources.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {sources.map((s) => (
            <div key={s.id} className="px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="text-xs text-zinc-400">
                    {WATCH_KIND_LABELS[s.kind as keyof typeof WATCH_KIND_LABELS] ??
                      s.kind}{" "}
                    · {s.mode}
                    {s.exclusive_only ? " · exclusief" : ""}
                    {s.client_id && clientName[s.client_id]
                      ? ` · ${clientName[s.client_id]}`
                      : ""}
                    {s.active ? "" : " · uit"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <form action={toggleSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={String(s.active)}
                    />
                    <button
                      type="submit"
                      className="text-xs text-zinc-500 hover:underline"
                    >
                      {s.active ? "Uitzetten" : "Aanzetten"}
                    </button>
                  </form>
                  <form action={deleteSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      Verwijderen
                    </button>
                  </form>
                </span>
              </div>

              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-zinc-500">
                  Bewerken
                </summary>
                <form action={updateSource} className="mt-2 space-y-3">
                  <input type="hidden" name="id" value={s.id} />
                  <SourceFields source={s} clients={clients} />
                  <button
                    type="submit"
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Opslaan
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
