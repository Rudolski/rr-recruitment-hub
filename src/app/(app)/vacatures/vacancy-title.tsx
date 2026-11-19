"use client";

import { useState, useTransition } from "react";
import { btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { updateVacatureTitle } from "./actions";

const headingClass =
  "font-[family-name:var(--font-roc)] text-xl font-medium tracking-tight sm:text-2xl text-navy dark:text-cream";

/** Vacaturetitel als kop, met een potlood om 'm direct te wijzigen. */
export function VacancyTitle({ id, title }: { id: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setValue(title);
    setError(null);
    setEditing(false);
  }

  function save() {
    const next = value.trim();
    if (!next) {
      setError("Titel is verplicht.");
      return;
    }
    if (next === title) {
      cancel();
      return;
    }
    startTransition(async () => {
      const res = await updateVacatureTitle(id, next);
      if (res.error) {
        setError(res.error);
      } else {
        setError(null);
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="mt-2 flex items-start gap-2">
        <h1 className={headingClass}>{title}</h1>
        <button
          type="button"
          onClick={() => {
            setValue(title);
            setEditing(true);
          }}
          className="mt-1 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-navy dark:hover:bg-zinc-800 dark:hover:text-cream"
          aria-label="Titel wijzigen"
          title="Titel wijzigen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        autoFocus
        aria-label="Titel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        className={inputClass}
        disabled={pending}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        <button type="button" onClick={cancel} className={btnGhost}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
