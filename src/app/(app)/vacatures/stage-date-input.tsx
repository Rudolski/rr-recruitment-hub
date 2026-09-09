"use client";

import { setCandidateStageDate } from "./board-actions";

/** Datumveldje bij de huidige stap van een kandidaat; slaat direct op. */
export function StageDateInput({
  id,
  vacancyId,
  stageDate,
}: {
  id: string;
  vacancyId: string;
  stageDate: string | null;
}) {
  return (
    <form action={setCandidateStageDate}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="vacancy_id" value={vacancyId} />
      <input
        type="date"
        name="stage_date"
        defaultValue={stageDate ?? ""}
        aria-label="Datum bij deze stap"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px] text-zinc-600 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      />
    </form>
  );
}
