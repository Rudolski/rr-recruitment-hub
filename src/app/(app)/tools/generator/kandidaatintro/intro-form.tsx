"use client";

import { useActionState, useState } from "react";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { emptyGenerateResult, type GenerateResult } from "../[key]/result";
import { runKandidaatintro } from "./actions";

type Candidate = { naam: string; cv: string; aantekeningen: string };
const empty: Candidate = { naam: "", cv: "", aantekeningen: "" };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* geen clipboard */
        }
      }}
      className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      {copied ? "Gekopieerd" : "Kopiëren"}
    </button>
  );
}

export function IntroForm() {
  const [state, formAction, pending] = useActionState<GenerateResult, FormData>(
    runKandidaatintro,
    emptyGenerateResult,
  );
  const [candidates, setCandidates] = useState<Candidate[]>([{ ...empty }]);

  const update = (i: number, patch: Partial<Candidate>) =>
    setCandidates((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="count" value={candidates.length} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="klant" className={labelClass}>
              Klant <span className="text-red-500">*</span>
            </label>
            <input id="klant" name="klant" required className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="vacature" className={labelClass}>
              Vacature / functie <span className="text-red-500">*</span>
            </label>
            <input
              id="vacature"
              name="vacature"
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="taal" className={labelClass}>
              Taal
            </label>
            <select
              id="taal"
              name="taal"
              defaultValue="nl"
              className={inputClass}
            >
              <option value="nl">Nederlands</option>
              <option value="en">Engels</option>
              <option value="auto">Automatisch bepalen</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="extra" className={labelClass}>
            Aanvullende info over de vacature, hiring manager of klant
            (optioneel)
          </label>
          <textarea
            id="extra"
            name="extra"
            rows={3}
            className={inputClass}
          />
        </div>

        {candidates.map((c, i) => (
          <fieldset
            key={i}
            className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <legend className="flex items-center gap-3 px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Kandidaat {i + 1}
              {candidates.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setCandidates((cs) => cs.filter((_, j) => j !== i))
                  }
                  className="text-zinc-400 hover:text-red-600"
                >
                  verwijderen
                </button>
              )}
            </legend>

            <div className="space-y-1.5">
              <label htmlFor={`naam_${i}`} className={labelClass}>
                Naam kandidaat
              </label>
              <input
                id={`naam_${i}`}
                name={`naam_${i}`}
                value={c.naam}
                onChange={(e) => update(i, { naam: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`cv_${i}`} className={labelClass}>
                CV (plak de tekst)
              </label>
              <textarea
                id={`cv_${i}`}
                name={`cv_${i}`}
                rows={8}
                value={c.cv}
                onChange={(e) => update(i, { cv: e.target.value })}
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`notes_${i}`} className={labelClass}>
                Aantekeningen intakegesprek en/of transcriptie
              </label>
              <textarea
                id={`notes_${i}`}
                name={`notes_${i}`}
                rows={8}
                value={c.aantekeningen}
                onChange={(e) =>
                  update(i, { aantekeningen: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => setCandidates((cs) => [...cs, { ...empty }])}
          className={btnGhost}
        >
          + Nog een kandidaat
        </button>

        <div className="pt-1">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Bezig met schrijven…" : "Introductie schrijven"}
          </button>
          <p className="mt-2 text-xs text-zinc-400">
            Controleer de tekst altijd voordat je hem verstuurt. Elke
            generatie wordt bewaard in de geschiedenis.
          </p>
        </div>
      </form>

      <div className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
        {state.text && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Resultaat
              </span>
              <CopyButton text={state.text} />
            </div>
            <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
              {state.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
