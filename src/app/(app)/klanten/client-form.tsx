"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  type Client,
} from "@/lib/types";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ClientForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

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
            defaultValue={initial?.status ?? "nieuw"}
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
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={initial ? `/klanten/${initial.id}` : "/klanten"}
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
