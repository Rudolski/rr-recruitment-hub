"use client";

import { useActionState, useState } from "react";
import { btnPrimary, inputClass, labelClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { GeneratorField } from "@/lib/generators";
import {
  emptyGenerateResult,
  runGenerator,
  type GenerateResult,
} from "./actions";

type HistoryItem = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
};

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
          /* clipboard niet beschikbaar */
        }
      }}
      className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      {copied ? "Gekopieerd" : "Kopiëren"}
    </button>
  );
}

export function GeneratorPanel({
  generatorKey,
  fields,
  history,
}: {
  generatorKey: string;
  fields: GeneratorField[];
  history: HistoryItem[];
}) {
  const [state, formAction, pending] = useActionState<GenerateResult, FormData>(
    runGenerator,
    emptyGenerateResult,
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="__key" value={generatorKey} />
        {fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <label htmlFor={f.name} className={labelClass}>
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={f.name}
                name={f.name}
                rows={3}
                placeholder={f.placeholder}
                className={inputClass}
              />
            ) : (
              <input
                id={f.name}
                name={f.name}
                placeholder={f.placeholder}
                className={inputClass}
              />
            )}
          </div>
        ))}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met genereren…" : "Genereren"}
        </button>
        <p className="text-xs text-zinc-400">
          Controleer AI-output altijd voordat je hem gebruikt. Elke generatie
          wordt bewaard in de geschiedenis.
        </p>
      </form>

      <div className="space-y-6">
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
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
              {state.text}
            </pre>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Geschiedenis
          </h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nog niks gegenereerd.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800"
                >
                  <details>
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {h.title || "Zonder titel"}
                      </span>
                      <span className="ml-2 text-xs text-zinc-400">
                        {formatDate(h.created_at)}
                      </span>
                    </summary>
                    <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                      <div className="mb-1 flex justify-end">
                        <CopyButton text={h.content} />
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                        {h.content}
                      </pre>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
