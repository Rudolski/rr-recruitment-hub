"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  type Client,
} from "@/lib/types";
import { emptyClientFormState, type ClientFormState } from "./form-state";

type Action = (
  prev: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function ClientForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    emptyClientFormState,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className={labelClass}>
          Naam <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className={inputClass}
        />
        {state.fieldErrors.name && (
          <p className="text-xs text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="status" className={labelClass}>
            Status <span className="text-red-500">*</span>
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "prospect"}
            className={inputClass}
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CLIENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {state.fieldErrors.status && (
            <p className="text-xs text-red-600">{state.fieldErrors.status}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kvk_number" className={labelClass}>
            KvK-nummer
          </label>
          <input
            id="kvk_number"
            name="kvk_number"
            defaultValue={initial?.kvk_number ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sector" className={labelClass}>
            Sector
          </label>
          <input
            id="sector"
            name="sector"
            defaultValue={initial?.sector ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="region" className={labelClass}>
            Regio
          </label>
          <input
            id="region"
            name="region"
            defaultValue={initial?.region ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notities
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initial?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={initial ? `/klanten/${initial.id}` : "/klanten"}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
