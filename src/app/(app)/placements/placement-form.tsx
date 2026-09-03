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
  initial,
  submitLabel,
  withInvoiceSection = false,
  defaultVacancyId,
  defaultClientId,
  defaultFee,
}: {
  action: Action;
  clients: Option[];
  vacancies: VacancyOption[];
  initial?: Placement;
  submitLabel: string;
  withInvoiceSection?: boolean;
  defaultVacancyId?: string;
  defaultClientId?: string;
  defaultFee?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const [clientId, setClientId] = useState(
    initial?.client_id ?? defaultClientId ?? "",
  );
  const [grossSalary, setGrossSalary] = useState(
    num(initial?.gross_annual_salary),
  );
  const [feePercentage, setFeePercentage] = useState(
    num(initial?.fee_percentage),
  );
  const [feeAmount, setFeeAmount] = useState(
    num(initial?.fee_amount) || defaultFee || "",
  );
  const [feeEdited, setFeeEdited] = useState(
    !!initial?.fee_amount || !!defaultFee,
  );

  function autoFee(salary: string, pct: string) {
    if (feeEdited) return;
    const s = Number(salary.replace(",", "."));
    const p = Number(pct.replace(",", "."));
    if (Number.isFinite(s) && Number.isFinite(p) && salary && pct) {
      setFeeAmount(String(Math.round(s * (p / 100))));
    }
  }

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
            defaultValue={initial?.vacancy_id ?? defaultVacancyId ?? ""}
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
          <label htmlFor="candidate_name" className={labelClass}>
            Kandidaat <span className="text-red-500">*</span>
          </label>
          <input
            id="candidate_name"
            name="candidate_name"
            defaultValue={initial?.candidate_name ?? ""}
            placeholder="Naam kandidaat"
            className={inputClass}
          />
          {state.fieldErrors.candidate_name && (
            <p className="text-xs text-red-600">
              {state.fieldErrors.candidate_name}
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
            value={grossSalary}
            onChange={(e) => {
              setGrossSalary(e.target.value);
              autoFee(e.target.value, feePercentage);
            }}
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
            value={feePercentage}
            onChange={(e) => {
              setFeePercentage(e.target.value);
              autoFee(grossSalary, e.target.value);
            }}
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
            onChange={(e) => {
              setFeeAmount(e.target.value);
              setFeeEdited(true);
            }}
            className={inputClass}
          />
          {!feeEdited && (
            <p className="text-xs text-zinc-400">
              Wordt berekend uit salaris × percentage; overschrijven kan.
            </p>
          )}
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
            Facturatie
          </legend>
          <p className="text-sm text-zinc-500">
            Bij opslaan maakt de Hub automatisch één factuurregel voor de fee
            aan (status concept). Je zet die daarna op de placementpagina door
            naar verstuurd en betaald, of voegt extra regels toe.
          </p>
          <div className="mt-3 max-w-xs space-y-1.5">
            <label htmlFor="commitment_invoiced" className={labelClass}>
              Reeds als commitment gefactureerd (€)
            </label>
            <input
              id="commitment_invoiced"
              name="commitment_invoiced"
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
            <p className="text-xs text-zinc-400">
              Wordt van de fee afgetrokken op de automatische factuurregel.
            </p>
          </div>
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
