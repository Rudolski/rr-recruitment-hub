import { btnPrimary, inputClass, labelClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { ClientNote } from "@/lib/types";
import {
  addClientNote,
  deleteClientNote,
  toggleFollowUp,
} from "@/app/(app)/klanten/notes-actions";

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Notities per klant met een optionele opvolgdatum. Server-component
 * met plain forms.
 */
export function ClientNotes({
  notes,
  clientId,
}: {
  notes: ClientNote[];
  clientId: string;
}) {
  return (
    <div className="space-y-4">
      <form
        action={addClientNote}
        className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input type="hidden" name="client_id" value={clientId} />
        <div className="space-y-1.5">
          <label htmlFor="note-body" className={labelClass}>
            Notitie
          </label>
          <textarea
            id="note-body"
            name="body"
            required
            rows={2}
            placeholder="Gebeld, teruggbellen in oktober · LinkedIn-bericht gestuurd, geen reactie…"
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="note-followup" className={labelClass}>
              Opvolgen op (optioneel)
            </label>
            <input
              id="note-followup"
              name="follow_up_on"
              type="date"
              min={todayIso()}
              className={`${inputClass} w-44`}
            />
          </div>
          <button type="submit" className={btnPrimary}>
            Toevoegen
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen notities.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const overdue =
              n.follow_up_on != null &&
              !n.follow_up_done &&
              n.follow_up_on <= todayIso();
            return (
              <li
                key={n.id}
                className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                  {n.body}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-zinc-400">
                    {formatDate(n.created_at)}
                  </span>

                  {n.follow_up_on && (
                    <form action={toggleFollowUp}>
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-0.5 ${
                          n.follow_up_done
                            ? "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800"
                            : overdue
                              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        Opvolgen: {formatDate(n.follow_up_on)}
                        {n.follow_up_done ? " ✓" : ""}
                      </button>
                    </form>
                  )}

                  <form action={deleteClientNote} className="ml-auto">
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="client_id" value={clientId} />
                    <button
                      type="submit"
                      className="text-zinc-400 hover:text-red-600"
                    >
                      verwijderen
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
