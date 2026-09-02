"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import {
  PLACEMENT_STATUSES,
  PLACEMENT_STATUS_LABELS,
  type Placement,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Option = { id: string; name: string };
type VacancyOption = { id: string; title: string; client_id: string };

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function PlacementForm({
  action,
  clients,
  vacancies,
  candidates,
  initial,
  submitLabel,
  withInvoiceSection = false,
}: {
  action: Action;
  clients: Option[];
  vacancies: VacancyOption[];
  candidates: Option[];
  initial?: Placement;
  submitLabel: string;
  withInvoiceSection?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [feeAmount, setFeeAmount] = useState(num(initial?.fee_amount));
  const [createInvoice, setCreateInvoice] = useState(false);

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
          <label htmlFor="vacancy_id" className={labelClass}>
            Vacature <span className="text-red-500">*</span>
          </label>
          <select
            id="vacancy_id"
            name="vacancy_id"
            defaultValue={initial?.vacancy_id ?? ""}
            onChange={(e) => {
              const v = vacancies.find((x) => x.id === e.target.value);
              if (v) setClientId(v.client_id);
            }}
            className={inputClass}
          >
            <option value="">— Kies een vacature —</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
          {state.fieldErrors.vacancy_id && (
            <p className="text-xs text-red-600">
              {state.fieldErrors.vacancy_id}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="candidate_id" className={labelClass}>
            Kandidaat <span className="text-red-500">*</span>
          </label>
          <select
            id="candidate_id"
            name="candidate_id"
            defaultValue={initial?.candidate_id ?? ""}
            className={inputClass}
          >
            <option value="">— Kies een kandidaat —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {state.fieldErrors.candidate_id && (
            <p className="text-xs text-red-600">
              {state.fieldErrors.candidate_id}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="client_id" className={labelClass}>
            Klant <span className="text-red-500">*</span>
          </label>
          <select
            id="client_id"
            name="client_id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Kies een klant —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
            defaultValue={initial?.status ?? "actief"}
            className={inputClass}
          >
            {PLACEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PLACEMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="start_date" className={labelClass}>
            Startdatum
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={initial?.start_date ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gross_annual_salary" className={labelClass}>
            Bruto jaarsalaris (€)
          </label>
          <input
            id="gross_annual_salary"
            name="gross_annual_salary"
            inputMode="numeric"
            defaultValue={num(initial?.gross_annual_salary)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fee_amount" className={labelClass}>
            Fee (€)
          </label>
          <input
            id="fee_amount"
            name="fee_amount"
            inputMode="numeric"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fee_percentage" className={labelClass}>
            Fee-percentage (%)
          </label>
          <input
            id="fee_percentage"
            name="fee_percentage"
            inputMode="numeric"
            defaultValue={num(initial?.fee_percentage)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="guarantee_months" className={labelClass}>
            Garantie (maanden)
          </label>
          <input
            id="guarantee_months"
            name="guarantee_months"
            inputMode="numeric"
            defaultValue={num(initial?.guarantee_months)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="guarantee_end_date" className={labelClass}>
            Einde garantie
          </label>
          <input
            id="guarantee_end_date"
            name="guarantee_end_date"
            type="date"
            defaultValue={initial?.guarantee_end_date ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {withInvoiceSection && (
        <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Factuurregistratie
          </legend>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="create_invoice"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Meteen een factuurregel aanmaken (status concept)
          </label>

          {createInvoice && (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="invoice_number" className={labelClass}>
                  Factuurnummer
                </label>
                <input
                  id="invoice_number"
                  name="invoice_number"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invoice_entity_name" className={labelClass}>
                  Entiteitsnaam (indien afwijkend)
                </label>
                <input
                  id="invoice_entity_name"
                  name="invoice_entity_name"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="invoice_amount_excl_btw"
                  className={labelClass}
                >
                  Bedrag excl. btw (€)
                </label>
                <input
                  id="invoice_amount_excl_btw"
                  name="invoice_amount_excl_btw"
                  inputMode="numeric"
                  defaultValue={feeAmount}
                  className={inputClass}
                />
                <p className="text-xs text-zinc-400">
                  Leeg = de fee hierboven wordt gebruikt.
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="invoice_btw_percentage"
                  className={labelClass}
                >
                  Btw %
                </label>
                <input
                  id="invoice_btw_percentage"
                  name="invoice_btw_percentage"
                  inputMode="numeric"
                  defaultValue="21"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invoice_issue_date" className={labelClass}>
                  Factuurdatum
                </label>
                <input
                  id="invoice_issue_date"
                  name="invoice_issue_date"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invoice_due_date" className={labelClass}>
                  Vervaldatum
                </label>
                <input
                  id="invoice_due_date"
                  name="invoice_due_date"
                  type="date"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="invoice_notes" className={labelClass}>
                  Notitie bij de factuur
                </label>
                <input
                  id="invoice_notes"
                  name="invoice_notes"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </fieldset>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : submitLabel}
        </button>
        <Link
          href={initial ? `/placements/${initial.id}` : "/placements"}
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
