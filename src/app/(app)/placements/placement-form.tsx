"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
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
const toNum = (v: string) => Number(v.replace(",", "."));

/** Mogelijke partners voor een omzetverdeling. Uitbreidbaar. */
const PARTNERS = ["Juul"] as const;

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
  defaultPartnerName,
  defaultPartnerPct,
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
  defaultPartnerName?: string;
  defaultPartnerPct?: string;
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

  // Fee wordt automatisch berekend uit bruto jaarsalaris × fee-percentage.
  const s = toNum(grossSalary);
  const p = toNum(feePercentage);
  const computedFee =
    grossSalary && feePercentage && Number.isFinite(s) && Number.isFinite(p)
      ? String(Math.round(s * (p / 100)))
      : num(initial?.fee_amount) || defaultFee || "";

  const [partnerName, setPartnerName] = useState(
    initial?.partner_name ?? defaultPartnerName ?? "",
  );
  const [partnerShare, setPartnerShare] = useState(
    num(initial?.partner_share_amount),
  );
  const [partnerEdited, setPartnerEdited] = useState(
    initial?.partner_share_amount != null,
  );

  // Aandeel partner automatisch uit fee × meegegeven percentage (bijv. van de
  // vacature), zolang het veld niet handmatig is aangepast.
  useEffect(() => {
    if (partnerEdited || !partnerName || !defaultPartnerPct) return;
    const fee = toNum(computedFee);
    const pct = toNum(defaultPartnerPct);
    if (Number.isFinite(fee) && Number.isFinite(pct) && computedFee) {
      setPartnerShare(String(Math.round(fee * (pct / 100))));
    }
  }, [partnerName, defaultPartnerPct, computedFee, partnerEdited]);

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
            onChange={(e) => setGrossSalary(e.target.value)}
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
            inputMode="decimal"
            value={feePercentage}
            onChange={(e) => setFeePercentage(e.target.value)}
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
            readOnly
            value={computedFee}
            className={`${inputClass} bg-zinc-50 dark:bg-zinc-900/60`}
          />
          <p className="text-xs text-zinc-400">
            Automatisch: bruto jaarsalaris × fee-percentage.
          </p>
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Verdeling
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="partner_name" className={labelClass}>
              Aandeel naar
            </label>
            <select
              id="partner_name"
              name="partner_name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className={inputClass}
            >
              <option value="">— Niemand —</option>
              {PARTNERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="partner_share_amount" className={labelClass}>
              Bedrag partner (€)
            </label>
            <input
              id="partner_share_amount"
              name="partner_share_amount"
              inputMode="numeric"
              value={partnerShare}
              onChange={(e) => {
                setPartnerShare(e.target.value);
                setPartnerEdited(true);
              }}
              disabled={!partnerName}
              className={inputClass}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Wordt bij opslaan als negatieve factuurregel voor deze partner
          vastgelegd, zodat de netto-omzet (zonder partneraandeel) klopt.
        </p>
      </fieldset>

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
