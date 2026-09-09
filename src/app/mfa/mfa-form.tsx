"use client";

import { useActionState } from "react";
import { verifyMfa, type MfaState } from "./actions";

const initialState: MfaState = { error: null };

export function MfaForm({
  factorId,
  qr,
  secret,
}: {
  factorId: string;
  /** Alleen bij het inschrijven van een nieuwe factor. */
  qr?: string;
  secret?: string;
}) {
  const [state, formAction, pending] = useActionState(verifyMfa, initialState);
  const enrolling = Boolean(qr);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold text-zinc-900">
          {enrolling ? "Tweestapsverificatie instellen" : "Verificatiecode"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {enrolling
            ? "Scan de QR-code met een authenticator-app (Google Authenticator, 1Password, Authy) en voer de 6-cijferige code in."
            : "Voer de 6-cijferige code uit je authenticator-app in."}
        </p>
      </div>

      {enrolling && (
        <>
          <div className="flex justify-center rounded-lg border border-zinc-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-code voor de authenticator-app" />
          </div>
          {secret && (
            <p className="break-all text-center text-xs text-zinc-400">
              Handmatig invoeren:{" "}
              <span className="font-mono">{secret}</span>
            </p>
          )}
        </>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="factor_id" value={factorId} />
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={20}
          required
          autoFocus
          placeholder="123456"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-lg tracking-[0.3em] text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-terra px-3 py-2 text-sm font-medium text-cream transition-colors hover:bg-terra-dark disabled:opacity-60"
        >
          {pending ? "Bezig…" : enrolling ? "Bevestigen" : "Verifiëren"}
        </button>
      </form>
    </div>
  );
}
