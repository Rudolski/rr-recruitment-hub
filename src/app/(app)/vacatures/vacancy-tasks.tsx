"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { btnPrimary, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { VacancyTask } from "@/lib/types";
import {
  addVacancyTask,
  deleteVacancyTask,
  toggleVacancyTask,
} from "./board-actions";

/** Actiepunten per vacature, met duidelijke bevestiging na toevoegen. */
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

  const [state, formAction, pending] = useActionState(addVacancyTask, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    const showTimer = setTimeout(() => setJustSaved(true), 0);
    const hideTimer = setTimeout(() => setJustSaved(false), 2500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [state]);

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="vacancy_id" value={vacancyId} />
        <input
          name="body"
          required
          placeholder="Nieuw actiepunt…"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig…" : "Toevoegen"}
        </button>
        {justSaved && (
          <span className="whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-500">
            Toegevoegd ✓
          </span>
        )}
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
