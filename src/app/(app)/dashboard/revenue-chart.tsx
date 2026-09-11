"use client";

import { useState } from "react";
import { eur } from "@/lib/format";

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

// Kleuren voor de niet-geselecteerde jaren, cyclisch toegewezen. Het
// geselecteerde jaar krijgt altijd de vette zwart/wit-lijn.
const PALETTE = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#9333ea", // purple-600
  "#dc2626", // red-600
  "#ca8a04", // amber-600
  "#0891b2", // cyan-600
];

function cumulative(monthly: number[]): number[] {
  let sum = 0;
  return monthly.slice(1, 13).map((v) => (sum += v));
}

/**
 * Cumulatieve omzetgrafiek: alle jaren met data t.o.v. elkaar en de
 * target van het geselecteerde jaar. Pure SVG, geen externe library.
 * Hover een maand voor de bedragen per jaar.
 */
export function RevenueChart({
  selectedYear,
  series,
  target,
  label = "Omzet",
}: {
  selectedYear: number;
  series: { year: number; data: number[] }[];
  target: number[] | null;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 240;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const lines = series.map((s) => ({
    year: s.year,
    selected: s.year === selectedYear,
    values: cumulative(s.data),
  }));
  const otherYears = lines.filter((l) => !l.selected).map((l) => l.year);
  const colorOf = (year: number) => {
    const idx = otherYears.indexOf(year);
    return PALETTE[idx % PALETTE.length];
  };

  const seriesTarget = target ? cumulative(target) : null;

  const maxY =
    Math.max(
      1,
      ...lines.flatMap((l) => l.values),
      ...(seriesTarget ?? []),
    ) * 1.1;

  const x = (i: number) => padL + (i / 11) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB);

  const path = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const gridLines = 4;

  // Onzichtbare hoverbanden: één per maand, grenzen op het midden
  // tussen twee datapunten, zodat de dichtstbijzijnde maand reageert.
  const xPositions = Array.from({ length: 12 }, (_, i) => x(i));
  const bandBounds = xPositions.map((xi, i) => ({
    start: i === 0 ? padL : (xPositions[i - 1] + xi) / 2,
    end: i === 11 ? W - padR : (xi + xPositions[i + 1]) / 2,
  }));

  // Geselecteerd jaar eerst in de tooltip, daarna de rest aflopend.
  const tooltipSeries = [...lines].sort((a, b) =>
    a.selected === b.selected ? b.year - a.year : a.selected ? -1 : 1,
  );

  const tooltipLines: { text: string; bold?: boolean; color?: string }[] =
    hover != null
      ? [
          { text: `${MONTHS_SHORT[hover]}`, bold: true },
          ...tooltipSeries.map((l) => ({
            text: `${label} ${l.year}${l.selected ? " (gekozen)" : ""}: ${eur(l.values[hover as number])}`,
            color: l.selected ? undefined : colorOf(l.year),
          })),
          ...(seriesTarget
            ? [{ text: `Target ${selectedYear}: ${eur(seriesTarget[hover])}` }]
            : []),
        ]
      : [];

  const tooltipW = 176;
  const tooltipH = tooltipLines.length * 15 + 10;
  const tipX =
    hover != null
      ? Math.min(
          Math.max(xPositions[hover] - tooltipW / 2, padL),
          W - padR - tooltipW,
        )
      : 0;
  const tipY = padT + 4;

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
        {lines.map((l) => (
          <span key={l.year} className="flex items-center gap-1.5">
            <span
              className={
                l.selected
                  ? "inline-block h-2 w-4 rounded-sm bg-zinc-900 dark:bg-zinc-100"
                  : "inline-block h-2 w-4 rounded-sm"
              }
              style={l.selected ? undefined : { backgroundColor: colorOf(l.year) }}
            />
            {label} {l.year}
          </span>
        ))}
        {seriesTarget && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm border border-dashed border-zinc-500" />
            Target {selectedYear}
          </span>
        )}
        <span className="text-zinc-400">cumulatief, excl. btw · hover voor bedragen</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full min-w-[560px]"
        role="img"
        aria-label={`Cumulatieve omzet ${lines.map((l) => l.year).join(", ")} en target ${selectedYear}`}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const v = (maxY / gridLines) * i;
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(v)}
                y2={y(v)}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-zinc-400 text-[10px]"
              >
                {eur(v)}
              </text>
            </g>
          );
        })}

        {MONTHS_SHORT.map((m, i) => (
          <text
            key={m}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className={
              hover === i
                ? "fill-zinc-700 text-[10px] font-medium dark:fill-zinc-200"
                : "fill-zinc-400 text-[10px]"
            }
          >
            {m}
          </text>
        ))}

        {seriesTarget && (
          <path
            d={path(seriesTarget)}
            fill="none"
            strokeDasharray="4 4"
            className="stroke-zinc-500"
            strokeWidth={1.5}
          />
        )}

        {lines
          .filter((l) => !l.selected)
          .map((l) => (
            <path
              key={l.year}
              d={path(l.values)}
              fill="none"
              stroke={colorOf(l.year)}
              strokeWidth={1.5}
            />
          ))}
        {lines
          .filter((l) => l.selected)
          .map((l) => (
            <path
              key={l.year}
              d={path(l.values)}
              fill="none"
              className="stroke-zinc-900 dark:stroke-zinc-100"
              strokeWidth={2}
            />
          ))}
        {lines
          .filter((l) => l.selected)
          .flatMap((l) =>
            l.values.map((v, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={hover === i ? 4 : 2.5}
                className="fill-zinc-900 dark:fill-zinc-100"
              />
            )),
          )}

        {/* Onzichtbare hoverbanden, bovenop de rest zodat ze de muis altijd opvangen */}
        {bandBounds.map(({ start, end }, i) => (
          <rect
            key={i}
            x={start}
            y={padT}
            width={Math.max(0, end - start)}
            height={H - padT - padB}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            style={{ cursor: "pointer" }}
          />
        ))}

        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={H - padB}
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth={1}
            />
            {lines
              .filter((l) => !l.selected)
              .map((l) => (
                <circle
                  key={l.year}
                  cx={x(hover)}
                  cy={y(l.values[hover])}
                  r={3.5}
                  fill={colorOf(l.year)}
                />
              ))}
            {seriesTarget && (
              <circle
                cx={x(hover)}
                cy={y(seriesTarget[hover])}
                r={4}
                className="fill-zinc-500"
              />
            )}

            <g transform={`translate(${tipX}, ${tipY})`}>
              <rect
                width={tooltipW}
                height={tooltipH}
                rx={6}
                className="fill-white stroke-zinc-200 dark:fill-zinc-900 dark:stroke-zinc-700"
                strokeWidth={1}
              />
              {tooltipLines.map((line, i) => (
                <text
                  key={i}
                  x={10}
                  y={15 + i * 15}
                  className={
                    line.bold
                      ? "fill-zinc-900 text-[11px] font-semibold dark:fill-zinc-50"
                      : line.color
                        ? "text-[10px] font-medium"
                        : "fill-zinc-600 text-[10px] dark:fill-zinc-300"
                  }
                  style={line.color ? { fill: line.color } : undefined}
                >
                  {line.text}
                </text>
              ))}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
