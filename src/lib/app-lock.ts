/**
 * App-vergrendeling (Face ID/Touch ID via WebAuthn): een extra
 * "ontgrendel dit scherm"-laag bovenop de gewone login + verplichte
 * MFA. De cookie is puur een lokale klok — wordt elke ~60s ververst
 * zolang het scherm zichtbaar is (zie components/app-lock-ping.tsx);
 * gaat de app naar de achtergrond, dan stopt het verversen en verloopt
 * de cookie vanzelf na UNLOCK_IDLE_SECONDS.
 */
export const UNLOCK_COOKIE = "rr_app_unlocked";
export const UNLOCK_IDLE_SECONDS = 5 * 60;

export function unlockCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    maxAge: UNLOCK_IDLE_SECONDS,
    path: "/",
  };
}
