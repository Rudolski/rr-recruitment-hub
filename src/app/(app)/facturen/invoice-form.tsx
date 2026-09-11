"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { eur2 } from "@/lib/format";
import {
  INVOICE_KINDS,
  INVOICE_KIND_LABELS,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type Invoice,
} from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Option = { id: string; name: string };

const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function InvoiceForm({
  action,
  clients,
  initial,
  submitLabel,
  lockedPlacementId,
  defaultClientId,
  defaultVacancyLabel,
}: {
  action: Action;
  clients: Option[];
  initial?: Invoice;
  submitLabel: string;
  lockedPlacementId?: string;
  defaultClientId?: string;
  defaultVacancyLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const [amount, setAmount] = useState(num(initial?.amount_excl_btw));
  const [btw, setBtw] = useState(num(initial?.btw_percentage ?? 21));
  const initialBreakdown = initial?.partner_breakdown ?? null;
  const [partnerName, setPartnerName] = useState(
    initialBreakdown && initialBreakdown.length > 0
      ? initialBreakdown.map((b) => b.name).join("; ")
      : (initial?.partner_name ?? ""),
  );
  const [partnerShare, setPartnerShare] = useState(
    initialBreakdown && initialBreakdown.length > 0
      ? initialBreakdown.map((b) => num(b.amount)).join("; ")
      : num(initial?.partner_share_amount),
  );

  // Meerdere partners op één factuur: namen en bedragen elk met ";"
  // gescheiden (niet met "," — dat is al het decimaalteken). Zeldzaam;
  // normaal gesproken staat hier maar één naam en één bedrag.
  const parseAmounts = (s: string) =>
    s
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => Number(p.replace(",", ".")))
      .filter((n) => Number.isFinite(n));

  const netto = useMemo(() => {
    const a = Number(amount.replace(",", "."));
    if (!Number.isFinite(a)) return null;
    const totalShare = partnerName.trim()
      ? parseAmounts(partnerShare).reduce((s, n) => s + n, 0)
      : 0;
    return a - totalShare;
  }, [amount, partnerShare, partnerName]);

  const inclBtw = useMemo(() => {
    const a = Number(amount.replace(",", "."));
    const b = Number(btw.replace(",", "."));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round(a * (1 + b / 100) * 100) / 100;
  }, [amount, btw]);

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
          <select
            id="client_id"
            name="client_id"
            defaultValue={initial?.client_id ?? defaultClientId ?? ""}
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
          <label htmlFor="vacancy_label" className={labelClass}>
            Vacature
          </label>
          <input
            id="vacancy_label"
            name="vacancy_label"
            defaultValue={initial?.vacancy_label ?? defaultVacancyLabel ?? ""}
            placeholder="Welke vacature is vervuld"
            className={inputClass}
          />
        </div>

        {(lockedPlacementId ?? initial?.placement_id) && (
          <input
            type="hidden"
            name="placement_id"
            value={lockedPlacementId ?? initial?.placement_id ?? ""}
          />
        )}

        <div className="space-y-1.5">
          <label htmlFor="invoice_number" className={labelClass}>
            Factuurnummer
          </label>
          <input
            id="invoice_number"
            name="invoice_number"
            defaultValue={initial?.invoice_number ?? ""}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Handmatig invoeren, zoals in Snelstart. De Hub telt niet door.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="entity_name" className={labelClass}>
            Entiteitsnaam (indien afwijkend)
          </label>
          <input
            id="entity_name"
            name="entity_name"
            defaultValue={initial?.entity_name ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kind" className={labelClass}>
            Soort factuur
          </label>
          <select
            id="kind"
            name="kind"
            defaultValue={initial?.kind ?? "wervingsfee"}
            className={inputClass}
          >
            {INVOICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {INVOICE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">
            Wervingsfee en commitment fee tellen als W&amp;S-omzet; interim
            en ZZP-marge niet.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="amount_excl_btw" className={labelClass}>
            Bedrag excl. btw (€) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount_excl_btw"
            name="amount_excl_btw"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Het volledige factuurbedrag aan de klant.
          </p>
          {state.fieldErrors.amount_excl_btw && (
            <p className="text-xs text-red-600">
              {state.fieldErrors.amount_excl_btw}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="partner_name" className={labelClass}>
            Aandeel naar partner(s)
          </label>
          <input
            id="partner_name"
            name="partner_name"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="leeg = volledig voor RR, bv. Juul of Juul; Sven"
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Meerdere partners op één factuur: namen scheiden met &ldquo;;&rdquo;.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="partner_share_amount" className={labelClass}>
            Bedrag partner(s) (€ excl. btw)
          </label>
          <input
            id="partner_share_amount"
            name="partner_share_amount"
            value={partnerShare}
            onChange={(e) => setPartnerShare(e.target.value)}
            disabled={!partnerName.trim()}
            placeholder={
              partnerName.includes(";") ? "bv. 2000; 2500" : "bv. 2500"
            }
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Bij meerdere partners: bedragen in dezelfde volgorde, ook
            gescheiden met &ldquo;;&rdquo;. Gaat van de netto-omzet af. Netto
            voor RR: {netto == null ? "—" : eur2(netto)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="btw_percentage" className={labelClass}>
            Btw %
          </label>
          <input
            id="btw_percentage"
            name="btw_percentage"
            inputMode="numeric"
            value={btw}
            onChange={(e) => setBtw(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400">
            Incl. btw: {inclBtw == null ? "—" : eur2(inclBtw)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "concept"}
            className={inputClass}
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">
            Op &lsquo;verzonden&rsquo; zetten legt de verzenddatum vast; pas
            dan telt de factuur mee in de omzet.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="issue_date" className={labelClass}>
            Factuurdatum
          </label>
          <input
            id="issue_date"
            name="issue_date"
            type="date"
            defaultValue={initial?.issue_date ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="due_date" className={labelClass}>
            Vervaldatum
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={initial?.due_date ?? ""}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="paid_date" className={labelClass}>
            Betaald op
          </label>
          <input
            id="paid_date"
            name="paid_date"
            type="date"
            defaultValue={initial?.paid_date ?? ""}
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
          href={initial ? `/facturen/${initial.id}` : "/facturen"}
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
