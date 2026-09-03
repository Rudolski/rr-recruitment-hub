import { btnPrimary, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { VacancyTask } from "@/lib/types";
import {
  addVacancyTask,
  deleteVacancyTask,
  toggleVacancyTask,
} from "./board-actions";

/** Actiepunten per vacature. Server-component met plain forms. */
export function VacancyTasks({
  tasks,
  vacancyId,
}: {
  tasks: VacancyTask[];
  vacancyId: string;
}) {
  const ordered = [
    ...tasks.filter((t) => !t.done),
    ...tasks.filter((t) => t.done),
  ];

  return (
    <div className="space-y-3">
      <form action={addVacancyTask} className="flex gap-2">
        <input type="hidden" name="vacancy_id" value={vacancyId} />
        <input
          name="body"
          required
          placeholder="Nieuw actiepunt…"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" className={btnPrimary}>
          Toevoegen
        </button>
      </form>

      {ordered.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen actiepunten.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {ordered.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <form action={toggleVacancyTask} className="flex">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="vacancy_id" value={vacancyId} />
                <button
                  type="submit"
                  aria-label={t.done ? "Weer openzetten" : "Afvinken"}
                  className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] leading-none ${
                    t.done
                      ? "border-terra bg-terra text-cream"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {t.done ? "✓" : ""}
                </button>
              </form>

              <span
                className={`flex-1 ${
                  t.done
                    ? "text-zinc-400 line-through"
                    : "text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {t.body}
              </span>

              {t.done && t.done_at && (
                <span className="text-xs text-zinc-400">
                  {formatDate(t.done_at)}
                </span>
              )}

              <form action={deleteVacancyTask} className="flex">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="vacancy_id" value={vacancyId} />
                <button
                  type="submit"
                  className="text-xs text-zinc-400 hover:text-red-600"
                >
                  verwijderen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
