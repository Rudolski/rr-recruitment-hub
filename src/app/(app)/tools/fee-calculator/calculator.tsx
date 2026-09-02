"use client";

import { useMemo, useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { eur2 } from "@/lib/format";

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function FeeCalculator() {
  const [salary, setSalary] = useState("");
  const [percentage, setPercentage] = useState("22");
  const [minimumFee, setMinimumFee] = useState("");

  const result = useMemo(() => {
    const s = toNumber(salary);
    const p = toNumber(percentage);
    if (s == null || p == null) return null;

    const raw = s * (p / 100);
    const min = toNumber(minimumFee);
    const fee = min != null && min > raw ? min : raw;
    return { raw, fee, minApplied: min != null && min > raw };
  }, [salary, percentage, minimumFee]);

  return (
    <div className="mt-6 max-w-md space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="salary" className={labelClass}>
          Bruto jaarsalaris (€)
        </label>
        <input
          id="salary"
          inputMode="numeric"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="55000"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="percentage" className={labelClass}>
          Fee-percentage (%)
        </label>
        <input
          id="percentage"
          inputMode="numeric"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-zinc-400">Doorgaans tussen 18 en 25%.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="minimumFee" className={labelClass}>
          Minimum fee (€, optioneel)
        </label>
        <input
          id="minimumFee"
          inputMode="numeric"
          value={minimumFee}
          onChange={(e) => setMinimumFee(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Berekende fee
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {result ? eur2(result.fee) : "—"}
        </p>
        {result && (
          <p className="mt-2 text-xs text-zinc-500">
            {result.minApplied
              ? `Percentage zou ${eur2(result.raw)} zijn; minimum fee toegepast.`
              : "Salaris × percentage."}
          </p>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Dit tooltje rekent alleen en slaat niets op.
      </p>
    </div>
  );
}
