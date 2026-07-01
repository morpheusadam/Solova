import { subDays } from "date-fns";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POSITION_GAP } from "~/lib/position";
import { heatmapDays } from "~/server/services/heatmap";

import { testDb, truncateAll } from "./helpers";

const TZ = "UTC";

function isoDaysAgo(days: number): string {
  return subDays(new Date(), days).toISOString().slice(0, 10);
}

describe("heatmap aggregation (spec §6, §12.5)", () => {
  beforeEach(truncateAll);
  afterAll(() => testDb.$disconnect());

  it("returns correct per-day counts from activity + time entries", async () => {
    const company = await testDb.company.create({
      data: { name: "Heat Co", billingModel: "HOURLY" },
    });
    const board = await testDb.board.create({
      data: { companyId: company.id, name: "B", position: POSITION_GAP },
    });
    const list = await testDb.list.create({
      data: { boardId: board.id, name: "To Do", position: POSITION_GAP },
    });
    const card = await testDb.card.create({
      data: { listId: list.id, boardId: board.id, title: "c", position: POSITION_GAP },
    });

    // 3 activity rows two days ago (one of them COMPLETED), 1 yesterday.
    const twoDaysAgo = subDays(new Date(), 2);
    const yesterday = subDays(new Date(), 1);
    for (const [action, createdAt] of [
      ["CREATED", twoDaysAgo],
      ["UPDATED", twoDaysAgo],
      ["COMPLETED", twoDaysAgo],
      ["MOVED", yesterday],
    ] as const) {
      await testDb.cardActivity.create({
        data: { cardId: card.id, boardId: board.id, action, createdAt },
      });
    }
    // 1 hour logged yesterday = 2 half-hour units.
    await testDb.timeEntry.create({
      data: {
        companyId: company.id,
        startedAt: yesterday,
        endedAt: new Date(yesterday.getTime() + 3600_000),
        durationSeconds: 3600,
      },
    });

    const days = await heatmapDays(testDb, {
      from: subDays(new Date(), 10),
      timezone: TZ,
    });

    const d2 = days.find((d) => d.date === isoDaysAgo(2));
    expect(d2).toMatchObject({ activity: 3, completed: 1, timeUnits: 0, count: 3 });

    const d1 = days.find((d) => d.date === isoDaysAgo(1));
    expect(d1).toMatchObject({ activity: 1, completed: 0, timeUnits: 2, count: 3 });
  });
});
