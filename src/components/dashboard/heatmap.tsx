"use client";

import { addDays, format, startOfWeek, subDays } from "date-fns";
import { useMemo } from "react";

import { type RouterOutputs } from "~/trpc/react";

type HeatmapDay = RouterOutputs["dashboard"]["heatmap"][number];

const CELL = 12;
const GAP = 3;
const WEEKS = 53;
const LEFT_GUTTER = 28;
const TOP_GUTTER = 16;

/**
 * GitHub-style contribution heatmap as a hand-rolled SVG (spec §6.1):
 * weeks as columns, weekdays as rows, month labels on top, 5 intensity
 * buckets driven by the --heatmap-* design tokens. Each cell exposes its
 * breakdown via <title> (native tooltip + screen readers).
 */
export function Heatmap({ days }: { days: HeatmapDay[] }) {
  const { grid, monthLabels, max } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const today = new Date();
    const gridStart = startOfWeek(subDays(today, (WEEKS - 1) * 7), { weekStartsOn: 1 });

    const weeks: Array<Array<{ date: Date; data?: HeatmapDay }>> = [];
    const labels: Array<{ week: number; label: string }> = [];
    let lastMonth = -1;

    for (let w = 0; w < WEEKS; w++) {
      const column: Array<{ date: Date; data?: HeatmapDay }> = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d);
        if (date > today) break;
        column.push({ date, data: byDate.get(format(date, "yyyy-MM-dd")) });
      }
      if (column[0] && column[0].date.getMonth() !== lastMonth) {
        lastMonth = column[0].date.getMonth();
        labels.push({ week: w, label: format(column[0].date, "MMM") });
      }
      weeks.push(column);
    }

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { grid: weeks, monthLabels: labels, max: maxCount };
  }, [days]);

  function bucket(count: number): number {
    if (count <= 0) return 0;
    return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
  }

  const width = LEFT_GUTTER + WEEKS * (CELL + GAP);
  const height = TOP_GUTTER + 7 * (CELL + GAP);

  return (
    <div className="overflow-x-auto" dir="ltr">
      <svg
        width={width}
        height={height + 20}
        role="img"
        aria-label="Activity heatmap of the last 12 months"
        className="block"
      >
        {monthLabels.map(({ week, label }) => (
          <text
            key={`${week}-${label}`}
            x={LEFT_GUTTER + week * (CELL + GAP)}
            y={10}
            className="fill-[var(--fg-subtle)] text-[10px]"
          >
            {label}
          </text>
        ))}
        {(["Mon", "Wed", "Fri"] as const).map((day, i) => (
          <text
            key={day}
            x={0}
            y={TOP_GUTTER + (i * 2 + 0) * (CELL + GAP) + CELL - 2}
            className="fill-[var(--fg-subtle)] text-[10px]"
          >
            {day}
          </text>
        ))}

        {grid.map((column, w) =>
          column.map((cell, d) => {
            const data = cell.data;
            const level = bucket(data?.count ?? 0);
            const label = `${format(cell.date, "PP")}: ${data?.count ?? 0} activity${
              data
                ? ` (${data.activity} actions, ${data.completed} completed, ${data.timeUnits * 30} min logged)`
                : ""
            }`;
            return (
              <rect
                key={cell.date.toISOString()}
                x={LEFT_GUTTER + w * (CELL + GAP)}
                y={TOP_GUTTER + d * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                style={{ fill: `var(--heatmap-${level})` }}
              >
                <title>{label}</title>
              </rect>
            );
          }),
        )}

        {/* legend */}
        <g aria-hidden>
          <text
            x={width - 5 * (CELL + GAP) - 40}
            y={height + 14}
            className="fill-[var(--fg-subtle)] text-[10px]"
          >
            Less
          </text>
          {[0, 1, 2, 3, 4].map((level) => (
            <rect
              key={level}
              x={width - (5 - level) * (CELL + GAP) - 8}
              y={height + 5}
              width={CELL}
              height={CELL}
              rx={3}
              style={{ fill: `var(--heatmap-${level})` }}
            />
          ))}
          <text x={width + 4} y={height + 14} className="fill-[var(--fg-subtle)] text-[10px]" textAnchor="end">
            {""}
          </text>
          <text x={width - 8 + CELL + 4} y={height + 14} className="fill-[var(--fg-subtle)] text-[10px]">
            More
          </text>
        </g>
      </svg>
    </div>
  );
}
