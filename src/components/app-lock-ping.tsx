"use client";

import { useEffect, useRef } from "react";
import { refreshUnlock } from "@/app/(app)/vergrendeling/actions";

const PING_INTERVAL_MS = 60_000;

/**
 * Houdt de app-vergrendeling (Face ID) ontgrendeld zolang dit scherm
 * zichtbaar is. Ga je naar de achtergrond, dan stopt het verversen en
 * verloopt de ontgrendeling vanzelf na een paar minuten — precies het
 * gedrag dat we willen, zonder dat we zelf hoeven bij te houden hoe
 * lang de app al op de achtergrond staat.
 *
 * Werkt onopvallend voor iedereen: zonder geregistreerd apparaat is
 * refreshUnlock() een no-op.
 */
export function AppLockPing() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") {
        refreshUnlock().catch(() => {
          // Geen probleem — dan verloopt de ontgrendeling gewoon.
        });
      }
    }

    tick();
    timer.current = setInterval(tick, PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return null;
}
