import {
  btnPrimary,
  inputClass,
  table,
  tableWrap,
  tbody,
  td,
  th,
  thead,
  tr,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { StoredFile } from "@/lib/types";
import {
  deleteFile,
  openFile,
  uploadFile,
} from "@/app/(app)/bestanden/actions";

function humanSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Uploaden, tonen en verwijderen van bestanden. Server-component met
 * plain forms; werkt zonder client-side JS.
 */
export function FileManager({
  files,
  scope,
  clientId,
}: {
  files: StoredFile[];
  scope: "client" | "brand";
  clientId?: string;
}) {
  return (
    <div className="space-y-4">
      <form
        action={uploadFile}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input type="hidden" name="scope" value={scope} />
        {clientId && <input type="hidden" name="client_id" value={clientId} />}
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Bestand</span>
          <input
            type="file"
            name="file"
            required
            className="mt-1 block max-w-[16rem] text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-2 file:py-1 file:text-sm dark:file:border-zinc-700 dark:file:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-zinc-500">Label (optioneel)</span>
          <input
            name="label"
            placeholder="bijv. vacaturetekst, logo"
            className={`${inputClass} mt-1 w-52`}
          />
        </label>
        <button type="submit" className={btnPrimary}>
          Uploaden
        </button>
      </form>

      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen bestanden.</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Bestand</th>
                <th className={th}>Label</th>
                <th className={th}>Grootte</th>
                <th className={th}>Toegevoegd</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {files.map((f) => (
                <tr key={f.id} className={tr}>
                  <td className={td}>
                    <form action={openFile}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="font-medium text-terra hover:underline"
                      >
                        {f.filename}
                      </button>
                    </form>
                  </td>
                  <td className={`${td} text-zinc-600 dark:text-zinc-400`}>
                    {f.label ?? "—"}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {humanSize(f.size_bytes)}
                  </td>
                  <td className={`${td} text-zinc-500`}>
                    {formatDate(f.created_at)}
                  </td>
                  <td className={td}>
                    <form action={deleteFile}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="text-xs text-zinc-400 hover:text-red-600"
                      >
                        verwijderen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
