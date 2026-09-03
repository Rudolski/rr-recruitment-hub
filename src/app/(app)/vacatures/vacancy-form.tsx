"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import {
  CONSULTANTS,
  CONSULTANT_LABELS,
  VACANCY_STATUSES,
  VACANCY_STATUS_LABELS,
  type Vacancy,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function VacancyForm({
  action,
  clients,
  initial,
  submitLabel,
  lockedClientId,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  initial?: Vacancy;
  submitLabel: string;
  lockedClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const clientId = initial?.client_id ?? lockedClientId ?? "";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
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
              defaultValue={clientId}
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
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "open"}
            className={inputClass}
          >
            {VACANCY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VACANCY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className={labelClass}>
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={inputClass}
        />
        {state.fieldErrors.title && (
          <p className="text-xs text-red-600">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="consultant" className={labelClass}>
            Consultant
          </label>
          <select
            id="consultant"
            name="consultant"
            defaultValue={initial?.consultant ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {CONSULTANTS.map((c) => (
              <option key={c} value={c}>
                {CONSULTANT_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="fee_pct" className={labelClass}>
            Fee-percentage (%)
          </label>
          <input
            id="fee_pct"
            name="fee_pct"
            inputMode="decimal"
            defaultValue={num(initial?.fee_pct)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="partner_pct" className={labelClass}>
            Aandeel partner (%)
          </label>
          <input
            id="partner_pct"
            name="partner_pct"
            inputMode="decimal"
            placeholder="0"
            defaultValue={num(initial?.partner_pct)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Deel van de fee dat naar de andere consultant (bijv. Juul) gaat.
          </p>
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Forecast
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="expected_fee" className={labelClass}>
              Verwachte fee (€)
            </label>
            <input
              id="expected_fee"
              name="expected_fee"
              inputMode="numeric"
              defaultValue={num(initial?.expected_fee)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="expected_close_month" className={labelClass}>
              Verwachte maand
            </label>
            <input
              id="expected_close_month"
              name="expected_close_month"
              type="month"
              defaultValue={initial?.expected_close_month?.slice(0, 7) ?? ""}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="success_probability" className={labelClass}>
              Slagingskans (%)
            </label>
            <input
              id="success_probability"
              name="success_probability"
              inputMode="numeric"
              defaultValue={num(initial?.success_probability)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Prognosebijdrage = verwachte fee × slagingskans, opgeteld per maand
          op het dashboard.
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="opened_at" className={labelClass}>
            Geopend op
          </label>
          <input
            id="opened_at"
            name="opened_at"
            type="date"
            defaultValue={initial?.opened_at ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="exclusivity_until" className={labelClass}>
            Einddatum exclusiviteit
          </label>
          <input
            id="exclusivity_until"
            name="exclusivity_until"
            type="date"
            defaultValue={initial?.exclusivity_until ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={initial ? `/vacatures/${initial.id}` : "/vacatures"}
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
