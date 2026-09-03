"use client";

import { useMemo, useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { eur2 } from "@/lib/format";

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Factor om het ingevoerde bedrag naar een bruto jaarsalaris om te rekenen. */
const PERIODS = {
  jaar: { label: "Jaarsalaris", factor: 1 },
  maand: { label: "Maandsalaris", factor: 12.96 },
  vierweken: { label: "Vierwekensalaris", factor: 14.02 },
} as const;

type PeriodKey = keyof typeof PERIODS;

export function FeeCalculator() {
  const [period, setPeriod] = useState<PeriodKey>("jaar");
  const [salary, setSalary] = useState("");
  const [percentage, setPercentage] = useState("22");
  const [minimumFee, setMinimumFee] = useState("");

  const result = useMemo(() => {
    const s = toNumber(salary);
    const p = toNumber(percentage);
    if (s == null || p == null) return null;

    const annual = s * PERIODS[period].factor;
    const raw = annual * (p / 100);
    const min = toNumber(minimumFee);
    const fee = min != null && min > raw ? min : raw;
    return { annual, raw, fee, minApplied: min != null && min > raw };
  }, [salary, percentage, minimumFee, period]);

  return (
    <div className="mt-6 max-w-md space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="period" className={labelClass}>
          Salaris opgegeven als
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className={inputClass}
        >
          {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
            <option key={k} value={k}>
              {PERIODS[k].label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="salary" className={labelClass}>
          {PERIODS[period].label} bruto (€)
        </label>
        <input
          id="salary"
          inputMode="numeric"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder={period === "jaar" ? "55000" : "4200"}
          className={inputClass}
        />
        {period !== "jaar" && (
          <p className="text-xs text-zinc-400">
            Wordt omgerekend naar jaarbasis (× {PERIODS[period].factor}, incl.
            vakantiegeld).
          </p>
        )}
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
            {period !== "jaar" && (
              <>Jaarsalaris {eur2(result.annual)}. </>
            )}
            {result.minApplied
              ? `Percentage zou ${eur2(result.raw)} zijn; minimum fee toegepast.`
              : "Jaarsalaris × percentage."}
          </p>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Dit tooltje rekent alleen en slaat niets op.
      </p>
    </div>
  );
}
