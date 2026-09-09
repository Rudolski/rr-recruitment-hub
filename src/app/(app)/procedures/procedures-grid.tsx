"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import {
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABELS,
  CONSULTANT_LABELS,
} from "@/lib/types";
import {
  addVacancyCandidate,
  deleteVacancyCandidate,
  moveVacancyCandidate,
  renameVacancyCandidate,
  setCandidateStageDate,
} from "@/app/(app)/vacatures/board-actions";

type Cand = {
  id: string;
  first_name: string;
  stage: string;
  stage_date: string | null;
};
export type ProcedureRow = {
  vacancyId: string;
  title: string;
  client: string;
  consultant: string | null;
  exclusivityUntil: string | null;
  cands: Cand[];
};

type OptAction =
  | { type: "move"; vacancyId: string; candId: string; stage: string }
  | { type: "rename"; vacancyId: string; candId: string; name: string }
  | { type: "date"; vacancyId: string; candId: string; date: string | null }
  | { type: "delete"; vacancyId: string; candId: string }
  | { type: "add"; vacancyId: string; cand: Cand };

function reducer(state: ProcedureRow[], a: OptAction): ProcedureRow[] {
  return state.map((r) => {
    if (r.vacancyId !== a.vacancyId) return r;
    switch (a.type) {
      case "move":
        return {
          ...r,
          cands: r.cands.map((c) =>
            c.id === a.candId ? { ...c, stage: a.stage, stage_date: null } : c,
          ),
        };
      case "rename":
        return {
          ...r,
          cands: r.cands.map((c) =>
            c.id === a.candId ? { ...c, first_name: a.name } : c,
          ),
        };
      case "date":
        return {
          ...r,
          cands: r.cands.map((c) =>
            c.id === a.candId ? { ...c, stage_date: a.date } : c,
          ),
        };
      case "delete":
        return { ...r, cands: r.cands.filter((c) => c.id !== a.candId) };
      case "add":
        return { ...r, cands: [...r.cands, a.cand] };
    }
  });
}

const headBase =
  "border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left align-bottom text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900";
const cellBase =
  "border-b border-zinc-100 px-1.5 py-1 align-top dark:border-zinc-800";
const smallInput =
  "w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px] text-zinc-700 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

export function ProceduresGrid({ rows: initial }: { rows: ProcedureRow[] }) {
  const router = useRouter();
  const [rows, applyOpt] = useOptimistic(initial, reducer);
  const [, start] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const tmpSeq = useRef(0);

  function run(opt: OptAction, action: (fd: FormData) => Promise<void>, fd: FormData) {
    start(async () => {
      applyOpt(opt);
      await action(fd);
      router.refresh();
    });
  }

  function move(vacancyId: string, candId: string, stage: string) {
    const fd = new FormData();
    fd.set("id", candId);
    fd.set("vacancy_id", vacancyId);
    fd.set("stage", stage);
    run({ type: "move", vacancyId, candId, stage }, moveVacancyCandidate, fd);
  }
  function rename(vacancyId: string, candId: string, name: string) {
    const fd = new FormData();
    fd.set("id", candId);
    fd.set("vacancy_id", vacancyId);
    fd.set("first_name", name);
    run({ type: "rename", vacancyId, candId, name }, renameVacancyCandidate, fd);
  }
  function setDate(vacancyId: string, candId: string, date: string) {
    const fd = new FormData();
    fd.set("id", candId);
    fd.set("vacancy_id", vacancyId);
    fd.set("stage_date", date);
    run(
      { type: "date", vacancyId, candId, date: date || null },
      setCandidateStageDate,
      fd,
    );
  }
  function remove(vacancyId: string, candId: string) {
    const fd = new FormData();
    fd.set("id", candId);
    fd.set("vacancy_id", vacancyId);
    run({ type: "delete", vacancyId, candId }, deleteVacancyCandidate, fd);
  }
  function add(vacancyId: string, stage: string, name: string) {
    const n = name.trim();
    if (!n) return;
    const fd = new FormData();
    fd.set("vacancy_id", vacancyId);
    fd.set("first_name", n);
    fd.set("stage", stage);
    run(
      {
        type: "add",
        vacancyId,
        cand: {
          id: `tmp-${(tmpSeq.current += 1)}`,
          first_name: n,
          stage,
          stage_date: null,
        },
      },
      addVacancyCandidate,
      fd,
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              className={`${headBase} sticky left-0 z-20 min-w-[11rem] border-r`}
            >
              Vacature
            </th>
            {CANDIDATE_STAGES.map((s) => (
              <th key={s} className={`${headBase} min-w-[11rem]`}>
                {CANDIDATE_STAGE_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.vacancyId}>
              <td
                className={`${cellBase} sticky left-0 z-10 w-[13rem] min-w-[13rem] border-r bg-white px-2.5 py-1.5 leading-tight dark:bg-zinc-950`}
              >
                <Link
                  href={`/vacatures/${r.vacancyId}`}
                  className="font-medium text-navy hover:underline dark:text-cream"
                >
                  {r.title}
                </Link>
                <span className="text-xs text-zinc-500">
                  {" "}
                  · {r.client}
                </span>
                {(r.consultant || r.exclusivityUntil) && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {r.consultant && (
                      <span className="rounded bg-zinc-100 px-1 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {CONSULTANT_LABELS[
                          r.consultant as keyof typeof CONSULTANT_LABELS
                        ] ?? r.consultant}
                      </span>
                    )}
                    {r.exclusivityUntil && (
                      <span className="rounded bg-amber-50 px-1 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        excl. t/m {formatDate(r.exclusivityUntil)}
                      </span>
                    )}
                  </div>
                )}
              </td>

              {CANDIDATE_STAGES.map((stage) => {
                const key = `${r.vacancyId}:${stage}`;
                const inStage = r.cands.filter((c) => c.stage === stage);
                return (
                  <td
                    key={stage}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOver(key);
                    }}
                    onDragLeave={() =>
                      setDragOver((k) => (k === key ? null : k))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      try {
                        const d = JSON.parse(
                          e.dataTransfer.getData("text/plain"),
                        ) as {
                          candId: string;
                          vacancyId: string;
                          fromStage: string;
                        };
                        if (
                          d.vacancyId === r.vacancyId &&
                          d.fromStage !== stage
                        )
                          move(r.vacancyId, d.candId, stage);
                      } catch {
                        // geen geldige sleep-payload
                      }
                    }}
                    className={`${cellBase} ${
                      dragOver === key
                        ? "bg-terra/10"
                        : ""
                    }`}
                  >
                    <div className="space-y-0.5">
                      {inStage.map((c) => (
                        <CandChip
                          key={c.id}
                          cand={c}
                          vacancyId={r.vacancyId}
                          editing={editingId === c.id}
                          onToggle={() =>
                            setEditingId((id) => (id === c.id ? null : c.id))
                          }
                          onRename={(name) => rename(r.vacancyId, c.id, name)}
                          onDate={(date) => setDate(r.vacancyId, c.id, date)}
                          onStage={(st) => {
                            setEditingId(null);
                            move(r.vacancyId, c.id, st);
                          }}
                          onDelete={() => {
                            setEditingId(null);
                            remove(r.vacancyId, c.id);
                          }}
                        />
                      ))}
                      <AddInput
                        onAdd={(name) => add(r.vacancyId, stage, name)}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandChip({
  cand,
  vacancyId,
  editing,
  onToggle,
  onRename,
  onDate,
  onStage,
  onDelete,
}: {
  cand: Cand;
  vacancyId: string;
  editing: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDate: (date: string) => void;
  onStage: (stage: string) => void;
  onDelete: () => void;
}) {
  // Strak: alleen naam + datum. Klik = uitklappen om te bewerken.
  if (!editing) {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              candId: cand.id,
              vacancyId,
              fromStage: cand.stage,
            }),
          );
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={onToggle}
        className="group flex cursor-pointer items-baseline justify-between gap-2 rounded px-1 py-0.5 leading-tight hover:bg-zinc-100 active:cursor-grabbing dark:hover:bg-zinc-800"
      >
        <span className="truncate text-zinc-800 dark:text-zinc-200">
          {cand.first_name}
        </span>
        {cand.stage_date && (
          <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">
            {formatDate(cand.stage_date)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded border border-terra/50 bg-terra/5 p-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          Bewerken
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          klaar
        </button>
      </div>
      <input
        defaultValue={cand.first_name}
        aria-label="Voornaam"
        autoFocus
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== cand.first_name) onRename(v);
        }}
        className={smallInput}
      />
      <input
        type="date"
        defaultValue={cand.stage_date ?? ""}
        aria-label="Datum"
        onChange={(e) => onDate(e.target.value)}
        className={`${smallInput} mt-1`}
      />
      <select
        value={cand.stage}
        aria-label="Stap"
        onChange={(e) => onStage(e.target.value)}
        className={`${smallInput} mt-1`}
      >
        {CANDIDATE_STAGES.map((s) => (
          <option key={s} value={s}>
            {CANDIDATE_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onDelete}
        className="mt-1 text-[11px] text-zinc-400 hover:text-red-600"
      >
        verwijderen
      </button>
    </div>
  );
}

function AddInput({ onAdd }: { onAdd: (name: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = ref.current?.value ?? "";
        onAdd(v);
        if (ref.current) ref.current.value = "";
      }}
    >
      <input
        ref={ref}
        placeholder="+ naam"
        aria-label="Voornaam toevoegen"
        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] leading-tight outline-none placeholder:text-zinc-300 hover:border-zinc-200 focus:border-dashed focus:border-zinc-400 dark:placeholder:text-zinc-600 dark:hover:border-zinc-700"
      />
    </form>
  );
}
