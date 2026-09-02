"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import {
  VACANCY_STATUSES,
  VACANCY_STATUS_LABELS,
  type Vacancy,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function VacancyForm({
  action,
  clients,
  feeAgreements = [],
  initial,
  submitLabel,
  lockedClientId,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  feeAgreements?: { id: string; label: string }[];
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

      {feeAgreements.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="fee_agreement_id" className={labelClass}>
            Fee-afspraak
          </label>
          <select
            id="fee_agreement_id"
            name="fee_agreement_id"
            defaultValue={initial?.fee_agreement_id ?? ""}
            className={inputClass}
          >
            <option value="">— Geen —</option>
            {feeAgreements.map((fa) => (
              <option key={fa.id} value={fa.id}>
                {fa.label}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <label htmlFor="function_group" className={labelClass}>
            Functiegroep
          </label>
          <input
            id="function_group"
            name="function_group"
            defaultValue={initial?.function_group ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="location" className={labelClass}>
            Locatie
          </label>
          <input
            id="location"
            name="location"
            defaultValue={initial?.location ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="employment_type" className={labelClass}>
            Dienstverband
          </label>
          <input
            id="employment_type"
            name="employment_type"
            placeholder="Vast, interim, …"
            defaultValue={initial?.employment_type ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="salary_min" className={labelClass}>
            Salaris min (€/jr)
          </label>
          <input
            id="salary_min"
            name="salary_min"
            inputMode="numeric"
            defaultValue={num(initial?.salary_min)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="salary_max" className={labelClass}>
            Salaris max (€/jr)
          </label>
          <input
            id="salary_max"
            name="salary_max"
            inputMode="numeric"
            defaultValue={num(initial?.salary_max)}
            className={inputClass}
          />
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
          <label htmlFor="closed_at" className={labelClass}>
            Gesloten op
          </label>
          <input
            id="closed_at"
            name="closed_at"
            type="date"
            defaultValue={initial?.closed_at ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>
          Omschrijving
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="requirements" className={labelClass}>
          Functie-eisen
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={3}
          defaultValue={initial?.requirements ?? ""}
          className={inputClass}
        />
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
