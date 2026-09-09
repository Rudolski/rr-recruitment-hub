"use client";

import { VACANCY_STATUSES, VACANCY_STATUS_LABELS } from "@/lib/types";
import { updateVacatureStatus } from "./actions";

/** Statuskiezer die direct opslaat, voor in het vacatureoverzicht. */
export function VacancyStatusSelect({
  vacancyId,
  status,
  className = "",
}: {
  vacancyId: string;
  status: string;
  className?: string;
}) {
  return (
    <form action={updateVacatureStatus}>
      <input type="hidden" name="id" value={vacancyId} />
      <select
        name="status"
        defaultValue={status}
        aria-label="Status"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
      >
        {VACANCY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {VACANCY_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
