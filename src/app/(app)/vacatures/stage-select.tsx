"use client";

import { CANDIDATE_STAGES, CANDIDATE_STAGE_LABELS } from "@/lib/types";
import { moveVacancyCandidate } from "./board-actions";

export function StageSelect({
  id,
  vacancyId,
  stage,
}: {
  id: string;
  vacancyId: string;
  stage: string;
}) {
  return (
    <form action={moveVacancyCandidate}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="vacancy_id" value={vacancyId} />
      <select
        name="stage"
        defaultValue={stage}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px] text-zinc-600 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {CANDIDATE_STAGES.map((s) => (
          <option key={s} value={s}>
            {CANDIDATE_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
