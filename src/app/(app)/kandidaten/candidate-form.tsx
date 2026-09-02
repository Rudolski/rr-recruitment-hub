"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  type Candidate,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function CandidateForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Candidate;
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
            defaultValue={initial?.status ?? "in_proces"}
            className={inputClass}
          >
            {CANDIDATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CANDIDATE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="current_job_title" className={labelClass}>
            Huidige functie
          </label>
          <input
            id="current_job_title"
            name="current_job_title"
            defaultValue={initial?.current_job_title ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className={labelClass}>
            Telefoon
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="source" className={labelClass}>
            Bron
          </label>
          <input
            id="source"
            name="source"
            placeholder="LinkedIn, referral, …"
            defaultValue={initial?.source ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cv_link" className={labelClass}>
            CV-link
          </label>
          <input
            id="cv_link"
            name="cv_link"
            placeholder="https://…"
            defaultValue={initial?.cv_link ?? ""}
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
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={initial ? `/kandidaten/${initial.id}` : "/kandidaten"}
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
