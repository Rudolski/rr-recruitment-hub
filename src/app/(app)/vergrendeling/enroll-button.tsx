"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { btnPrimary } from "@/components/ui";
import { getRegistrationOptions, verifyRegistration } from "./actions";

function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Dit apparaat";
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/android/i.test(ua)) return "Android-toestel";
  if (/windows/i.test(ua)) return "Windows-pc";
  return "Dit apparaat";
}

export function EnrollButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function enroll() {
    setError(null);
    setDone(false);
    start(async () => {
      try {
        const options = await getRegistrationOptions();
        const response = await startRegistration({ optionsJSON: options });
        const result = await verifyRegistration(response, guessDeviceLabel());
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setDone(true);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Geannuleerd, of dit apparaat ondersteunt geen Face ID/Touch ID."
            : "Er ging iets mis. Probeer opnieuw.",
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        className={btnPrimary}
      >
        {pending ? "Bezig…" : "Dit apparaat toevoegen"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {done && (
        <p className="mt-2 text-sm text-green-600">
          Toegevoegd — dit apparaat vraagt vanaf nu om Face ID/Touch ID.
        </p>
      )}
    </div>
  );
}
