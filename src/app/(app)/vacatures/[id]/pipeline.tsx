"use client";

import Link from "next/link";
import { inputClass } from "@/components/ui";
import { APPLICATION_STAGES, APPLICATION_STAGE_LABELS } from "@/lib/types";
import {
  addApplication,
  removeApplication,
  setApplicationStage,
} from "./applications-actions";

export type PipelineRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  stage: string;
};

export function Pipeline({
  vacancyId,
  rows,
  addableCandidates,
}: {
  vacancyId: string;
  rows: PipelineRow[];
  addableCandidates: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nog geen kandidaten in de procedure.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <Link
                href={`/kandidaten/${row.candidateId}`}
                className="flex-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {row.candidateName}
              </Link>

              <form action={setApplicationStage}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="vacancy_id" value={vacancyId} />
                <select
                  name="stage"
                  defaultValue={row.stage}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className={`${inputClass} w-auto py-1 text-xs`}
                >
                  {APPLICATION_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {APPLICATION_STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </form>

              <form action={removeApplication}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="vacancy_id" value={vacancyId} />
                <button
                  type="submit"
                  className="text-xs text-zinc-400 hover:text-red-600"
                  title="Uit procedure halen"
                >
                  verwijderen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {addableCandidates.length > 0 && (
        <form action={addApplication} className="flex items-center gap-2">
          <input type="hidden" name="vacancy_id" value={vacancyId} />
          <select
            name="candidate_id"
            defaultValue=""
            className={`${inputClass} w-auto py-1.5 text-sm`}
          >
            <option value="" disabled>
              Kandidaat toevoegen…
            </option>
            {addableCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Toevoegen
          </button>
        </form>
      )}
    </div>
  );
}
