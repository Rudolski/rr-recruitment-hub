"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import {
  FEE_AGREEMENT_TYPES,
  FEE_AGREEMENT_TYPE_LABELS,
  type FeeAgreement,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function FeeAgreementForm({
  action,
  clients,
  initial,
  submitLabel,
  lockedClientId,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  initial?: FeeAgreement;
  submitLabel: string;
  lockedClientId?: string;
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="client_id" className={labelClass}>
            Klant <span className="text-red-500">*</span>
          </label>
          {lockedClientId ? (
            <>
              <input type="hidden" name="client_id" value={lockedClientId} />
              <input
                className={inputClass}
                disabled
                value={
                  clients.find((c) => c.id === lockedClientId)?.name ?? "—"
                }
              />
            </>
          ) : (
            <select
              id="client_id"
              name="client_id"
              defaultValue={initial?.client_id ?? ""}
              className={inputClass}
            >
              <option value="">— Kies een klant —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {state.fieldErrors.client_id && (
            <p className="text-xs text-red-600">
              {state.fieldErrors.client_id}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="type" className={labelClass}>
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? "percentage"}
            className={inputClass}
          >
            {FEE_AGREEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {FEE_AGREEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="percentage" className={labelClass}>
            Percentage (%)
          </label>
          <input
            id="percentage"
            name="percentage"
            inputMode="numeric"
            defaultValue={num(initial?.percentage)}
            placeholder="Bijv. 22"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fixed_amount" className={labelClass}>
            Vast bedrag (€)
          </label>
          <input
            id="fixed_amount"
            name="fixed_amount"
            inputMode="numeric"
            defaultValue={num(initial?.fixed_amount)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="minimum_fee" className={labelClass}>
            Minimum fee (€)
          </label>
          <input
            id="minimum_fee"
            name="minimum_fee"
            inputMode="numeric"
            defaultValue={num(initial?.minimum_fee)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="valid_from" className={labelClass}>
            Geldig vanaf
          </label>
          <input
            id="valid_from"
            name="valid_from"
            type="date"
            defaultValue={initial?.valid_from ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="valid_until" className={labelClass}>
            Geldig tot
          </label>
          <input
            id="valid_until"
            name="valid_until"
            type="date"
            defaultValue={initial?.valid_until ?? ""}
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
          placeholder="Bij een staffel: de treden hier beschrijven."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={
            initial ? `/fee-afspraken/${initial.id}` : "/fee-afspraken"
          }
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
