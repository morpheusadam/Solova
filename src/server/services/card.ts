import { TRPCError } from "@trpc/server";

import { type Tx } from "~/server/db";
import { logCardActivity } from "~/server/services/activity";
import { runAutomationRules } from "~/server/services/automation";
import { rebalancedPositions } from "~/lib/position";

/**
 * Card movement — the hottest path on the board. Updates exactly one row
 * (fractional position), keeps the denormalized board_id in sync, writes a
 * MOVED activity row and fires CARD_MOVED_TO_LIST automation rules.
 */
export async function moveCard(
  tx: Tx,
  input: { cardId: string; toListId: string; position: number },
) {
  const card = await tx.card.findUnique({ where: { id: input.cardId } });
  if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found." });

  const toList = await tx.list.findUnique({ where: { id: input.toListId } });
  if (!toList) throw new TRPCError({ code: "NOT_FOUND", message: "List not found." });

  const moved = await tx.card.update({
    where: { id: card.id },
    data: {
      listId: toList.id,
      boardId: toList.boardId,
      position: input.position,
    },
  });

  if (card.listId !== toList.id) {
    await logCardActivity(tx, {
      cardId: card.id,
      boardId: toList.boardId,
      action: "MOVED",
      meta: { fromListId: card.listId, toListId: toList.id, toListName: toList.name },
    });
    await runAutomationRules(tx, "CARD_MOVED_TO_LIST", {
      cardId: card.id,
      boardId: toList.boardId,
      listId: toList.id,
      listName: toList.name,
    });
  }

  return moved;
}

/** Evenly re-spaces all cards in a list when fractional gaps collapse. */
export async function rebalanceList(tx: Tx, listId: string) {
  const cards = await tx.card.findMany({
    where: { listId, archivedAt: null },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const positions = rebalancedPositions(cards.length);
  for (const [i, card] of cards.entries()) {
    await tx.card.update({
      where: { id: card.id },
      data: { position: positions[i] },
    });
  }
}
