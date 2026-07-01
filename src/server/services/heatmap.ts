import { Prisma } from "@prisma/client";

import { type Tx } from "~/server/db";

export interface HeatmapDay {
  /** ISO date (yyyy-MM-dd) in the configured timezone. */
  date: string;
  /** Total intensity units for the day. */
  count: number;
  /** Tooltip breakdown. */
  activity: number;
  completed: number;
  /** Logged time, in half-hour units. */
  timeUnits: number;
}

/**
 * Aggregates daily "work" for the contribution heatmap:
 * card activity rows + completed cards + logged time (30 min = 1 unit),
 * bucketed by calendar day in the given IANA timezone.
 */
export async function heatmapDays(
  tx: Tx,
  input: { from: Date; timezone: string },
): Promise<HeatmapDay[]> {
  const { from, timezone } = input;

  const activityRows = await tx.$queryRaw<
    Array<{ day: string; total: bigint; completed: bigint }>
  >(Prisma.sql`
    SELECT to_char(("created_at" AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE "action" = 'COMPLETED')::bigint AS completed
      FROM "card_activity"
     WHERE "created_at" >= ${from}
     GROUP BY 1
  `);

  const timeRows = await tx.$queryRaw<Array<{ day: string; units: bigint }>>(Prisma.sql`
    SELECT to_char(("started_at" AT TIME ZONE ${timezone})::date, 'YYYY-MM-DD') AS day,
           CEIL(SUM("duration_seconds") / 1800.0)::bigint AS units
      FROM "time_entries"
     WHERE "started_at" >= ${from}
     GROUP BY 1
  `);

  const byDay = new Map<string, HeatmapDay>();
  const ensure = (day: string) => {
    let entry = byDay.get(day);
    if (!entry) {
      entry = { date: day, count: 0, activity: 0, completed: 0, timeUnits: 0 };
      byDay.set(day, entry);
    }
    return entry;
  };

  for (const row of activityRows) {
    const entry = ensure(row.day);
    entry.activity = Number(row.total);
    entry.completed = Number(row.completed);
  }
  for (const row of timeRows) {
    const entry = ensure(row.day);
    entry.timeUnits = Number(row.units);
  }
  for (const entry of byDay.values()) {
    entry.count = entry.activity + entry.timeUnits;
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
