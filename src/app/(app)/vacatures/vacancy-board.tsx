import {
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABELS,
  type VacancyCandidate,
} from "@/lib/types";
import { addVacancyCandidate, deleteVacancyCandidate } from "./board-actions";
import { StageSelect } from "./stage-select";

/**
 * Mini-funnel per vacature: alleen voornamen (AVG-proof), één stap per
 * kandidaat. Bord scrollt horizontaal; per kolom snel een naam toevoegen
 * (typen + Enter). Stap wijzigen via de dropdown op de kaart.
 */
export function VacancyBoard({
  candidates,
  vacancyId,
}: {
  candidates: VacancyCandidate[];
  vacancyId: string;
}) {
  const byStage = new Map<string, VacancyCandidate[]>();
  for (const c of candidates) {
    const list = byStage.get(c.stage) ?? [];
    list.push(c);
    byStage.set(c.stage, list);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3">
        {CANDIDATE_STAGES.map((stage) => {
          const list = byStage.get(stage) ?? [];
          return (
            <div
              key={stage}
              className="flex w-44 shrink-0 flex-col rounded-lg border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="flex items-baseline justify-between border-b border-zinc-200 px-2.5 py-2 dark:border-zinc-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {CANDIDATE_STAGE_LABELS[stage]}
                </p>
                <span className="text-[11px] text-zinc-400">{list.length}</span>
              </div>

              <div className="flex-1 space-y-2 p-2">
                {list.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {c.first_name}
                      </span>
                      <form action={deleteVacancyCandidate}>
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="vacancy_id"
                          value={vacancyId}
                        />
                        <button
                          type="submit"
                          aria-label="Verwijderen"
                          className="text-sm leading-none text-zinc-300 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                    <div className="mt-1.5">
                      <StageSelect
                        id={c.id}
                        vacancyId={vacancyId}
                        stage={c.stage}
                      />
                    </div>
                  </div>
                ))}

                <form action={addVacancyCandidate}>
                  <input type="hidden" name="vacancy_id" value={vacancyId} />
                  <input type="hidden" name="stage" value={stage} />
                  <input
                    name="first_name"
                    required
                    placeholder="+ voornaam"
                    aria-label={`Voornaam toevoegen aan ${CANDIDATE_STAGE_LABELS[stage]}`}
                    className="w-full rounded border border-dashed border-zinc-300 bg-transparent px-1.5 py-1 text-xs outline-none placeholder:text-zinc-400 focus:border-solid focus:border-zinc-400 dark:border-zinc-700"
                  />
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
