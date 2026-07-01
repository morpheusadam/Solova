import { type CardActivityAction, type Prisma } from "@prisma/client";

import { type Tx } from "~/server/db";

/**
 * Writes one card_activity row. Every meaningful card mutation must call this —
 * the dashboard heatmap counts these rows per day.
 */
export async function logCardActivity(
  tx: Tx,
  input: {
    cardId: string;
    boardId: string;
    action: CardActivityAction;
    meta?: Prisma.InputJsonValue;
    createdAt?: Date;
  },
) {
  return tx.cardActivity.create({
    data: {
      cardId: input.cardId,
      boardId: input.boardId,
      action: input.action,
      meta: input.meta,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}
