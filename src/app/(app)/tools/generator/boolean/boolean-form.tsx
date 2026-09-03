"use client";

import { useActionState, useState } from "react";
import { btnPrimary, inputClass, labelClass } from "@/components/ui";
import { emptyGenerateResult, type GenerateResult } from "../[key]/result";
import { runBoolean } from "./actions";

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

export function BooleanForm() {
  const [state, formAction, pending] = useActionState<GenerateResult, FormData>(
    runBoolean,
    emptyGenerateResult,
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="original_file" className={labelClass}>
            Originele vacature — pdf of tekstbestand
          </label>
          <input
            id="original_file"
            name="original_file"
            type="file"
            accept=".pdf,.txt,text/plain,application/pdf"
            className="block text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-2 file:py-1 file:text-sm dark:file:border-zinc-700 dark:file:bg-zinc-900"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="original_text" className={labelClass}>
            …of plak de vacaturetekst
          </label>
          <textarea
            id="original_text"
            name="original_text"
            rows={8}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notes" className={labelClass}>
            Aantekeningen / script (optioneel)
          </label>
          <textarea id="notes" name="notes" rows={5} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="locatie" className={labelClass}>
              Locatie
            </label>
            <input id="locatie" name="locatie" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="uitsluiten" className={labelClass}>
              Uit te sluiten termen
            </label>
            <input
              id="uitsluiten"
              name="uitsluiten"
              placeholder="stage, junior, …"
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-1">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Bezig…" : "Boolean opstellen"}
          </button>
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
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
              {state.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
