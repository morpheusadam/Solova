import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { moveCard } from "~/server/services/card";
import { POSITION_GAP, betweenPosition } from "~/lib/position";

import { createCompanyTree, testDb, truncateAll } from "./helpers";

describe("card movement + Done automation (spec §5, §12.6)", () => {
  beforeEach(async () => {
    await truncateAll();
    await testDb.automationRule.create({
      data: {
        name: "Complete cards moved to Done",
        trigger: "CARD_MOVED_TO_LIST",
        conditions: { listName: "Done" },
        actions: [{ type: "MARK_COMPLETED" }],
      },
    });
  });
  afterAll(() => testDb.$disconnect());

  it("moving a card to Done marks it completed and writes a COMPLETED activity", async () => {
    const { lists, cards } = await createCompanyTree();
    const doneList = lists.find((l) => l.name === "Done")!;
    const card = cards[0]!; // starts in "To Do"
    expect(card.isCompleted).toBe(false);

    await testDb.$transaction((tx) =>
      moveCard(tx, {
        cardId: card.id,
        toListId: doneList.id,
        position: betweenPosition(null, null),
      }),
    );

    const moved = await testDb.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(moved.listId).toBe(doneList.id);
    expect(moved.isCompleted).toBe(true);
    expect(moved.completedAt).not.toBeNull();

    const completedActivity = await testDb.cardActivity.findFirst({
      where: { cardId: card.id, action: "COMPLETED" },
    });
    expect(completedActivity).not.toBeNull();
    const movedActivity = await testDb.cardActivity.findFirst({
      where: { cardId: card.id, action: "MOVED" },
    });
    expect(movedActivity).not.toBeNull();
  });

  it("reordering within the same list updates position without firing MOVED", async () => {
    const { lists, cards } = await createCompanyTree();
    const todo = lists.find((l) => l.name === "To Do")!;
    const inTodo = cards.filter((c) => c.listId === todo.id);
    const first = inTodo[0]!;
    const newPosition = betweenPosition(
      inTodo[1]!.position,
      inTodo[2]!.position,
    );

    await testDb.$transaction((tx) =>
      moveCard(tx, { cardId: first.id, toListId: todo.id, position: newPosition }),
    );

    const moved = await testDb.card.findUniqueOrThrow({ where: { id: first.id } });
    expect(moved.position).toBe(newPosition);
    expect(moved.position).toBeGreaterThan(POSITION_GAP);
    expect(
      await testDb.cardActivity.count({ where: { cardId: first.id, action: "MOVED" } }),
    ).toBe(0);
  });
});
