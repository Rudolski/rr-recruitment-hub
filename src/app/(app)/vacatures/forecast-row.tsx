"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { VacancyStatusBadge } from "@/components/status-badge";
import { td, tr } from "@/components/ui";
import type { Vacancy } from "@/lib/types";
import { updateVacatureForecast } from "./actions";

const cell =
  "w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const numStr = (v: number | null) => (v == null ? "" : String(v));

export function ForecastRow({
  vacancy,
  clientName,
}: {
  vacancy: Vacancy;
  clientName: string;
}) {
  const [fee, setFee] = useState(numStr(vacancy.expected_fee));
  const [month, setMonth] = useState(
    vacancy.expected_close_month?.slice(0, 7) ?? "",
  );
  const [prob, setProb] = useState(numStr(vacancy.success_probability));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("id", vacancy.id);
    fd.set("expected_fee", fee);
    fd.set("expected_close_month", month);
    fd.set("success_probability", prob);
    start(async () => {
      await updateVacatureForecast(fd);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  const onChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
    setSaved(false);
  };

  return (
    <tr className={tr}>
      <td className={td}>
        <Link
          href={`/vacatures/${vacancy.id}`}
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          {vacancy.title}
        </Link>
      </td>
      <td className={`${td} text-zinc-600 dark:text-zinc-400`}>{clientName}</td>
      <td className={td}>
        <VacancyStatusBadge status={vacancy.status} />
      </td>
      <td className={td}>
        <input
          inputMode="numeric"
          aria-label="Verwachte fee"
          value={fee}
          onChange={(e) => onChange(setFee)(e.target.value)}
          className={`${cell} text-right tabular-nums`}
        />
      </td>
      <td className={td}>
        <input
          type="month"
          aria-label="Verwachte maand"
          value={month}
          onChange={(e) => onChange(setMonth)(e.target.value)}
          className={cell}
        />
      </td>
      <td className={td}>
        <input
          inputMode="numeric"
          aria-label="Slagingskans"
          value={prob}
          onChange={(e) => onChange(setProb)(e.target.value)}
          className={`${cell} w-16 text-right tabular-nums`}
        />
      </td>
      <td className={td}>
        {dirty ? (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {pending ? "…" : "Opslaan"}
          </button>
        ) : saved ? (
          <span className="text-xs text-green-600">Opgeslagen</span>
        ) : null}
      </td>
    </tr>
  );
}
