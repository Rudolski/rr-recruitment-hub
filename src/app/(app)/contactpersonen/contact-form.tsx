"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form";
import { btnGhost, btnPrimary, inputClass, labelClass } from "@/components/ui";
import type { Contact } from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ContactForm({
  action,
  clients,
  initial,
  submitLabel,
  lockedClientId,
}: {
  action: Action;
  clients: { id: string; name: string }[];
  initial?: Contact;
  submitLabel: string;
  lockedClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const selectedClient = initial?.client_id ?? lockedClientId ?? "";

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
            defaultValue={selectedClient}
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
          <p className="text-xs text-red-600">{state.fieldErrors.client_id}</p>
        )}
      </div>

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
          <label htmlFor="role" className={labelClass}>
            Functie / rol
          </label>
          <input
            id="role"
            name="role"
            defaultValue={initial?.role ?? ""}
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
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="is_primary"
          defaultChecked={initial?.is_primary ?? false}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Primaire contactpersoon voor deze klant
      </label>

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
          href={
            initial
              ? `/contactpersonen/${initial.id}`
              : "/contactpersonen"
          }
          className={btnGhost}
        >
          Annuleren
        </Link>
      </div>
    </form>
  );
}
