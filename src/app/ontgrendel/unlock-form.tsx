"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { btnGhost, btnPrimary } from "@/components/ui";
import { signOut } from "@/app/(app)/actions";
import {
  getAuthenticationOptions,
  verifyAuthentication,
} from "@/app/(app)/vergrendeling/actions";

export function UnlockForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function unlock() {
    setError(null);
    start(async () => {
      try {
        const options = await getAuthenticationOptions();
        const response = await startAuthentication({ optionsJSON: options });
        const result = await verifyAuthentication(response);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Geannuleerd of niet gelukt. Probeer opnieuw."
            : "Er ging iets mis. Probeer opnieuw.",
        );
      }
    });
  }

  return (
    <div className="space-y-4 text-center">
      <div>
        <h1 className="text-base font-semibold text-zinc-900">
          Vergrendeld
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ontgrendel met Face ID / Touch ID om verder te gaan.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={unlock}
        disabled={pending}
        className={`${btnPrimary} w-full`}
      >
        {pending ? "Bezig…" : "Ontgrendelen"}
      </button>

      <form action={signOut}>
        <button type="submit" className={`${btnGhost} w-full`}>
          Niet jij? Uitloggen
        </button>
      </form>
    </div>
  );
}
