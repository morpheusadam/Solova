import { type AutomationTrigger } from "@prisma/client";
import { z } from "zod";

import { type Tx } from "~/server/db";
import { logCardActivity } from "~/server/services/activity";

/**
 * Data-driven Butler-style rule engine.
 * A rule = trigger + conditions (JSON) + ordered action list (JSON).
 * New action types only require a case in `runAction`; new triggers only a
 * call site that invokes `runAutomationRules` with the matching context.
 */

const conditionsSchema = z
  .object({
    listName: z.string().optional(),
    listId: z.string().uuid().optional(),
  })
  .passthrough();

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MARK_COMPLETED") }),
  z.object({ type: z.literal("MARK_INCOMPLETE") }),
  z.object({
    type: z.literal("ADD_LABEL"),
    labelName: z.string().min(1),
    labelColor: z.string().default("#EB5A46"),
  }),
  z.object({ type: z.literal("REMOVE_LABEL"), labelName: z.string().min(1) }),
]);
export type AutomationAction = z.infer<typeof actionSchema>;

export interface AutomationContext {
  cardId: string;
  boardId: string;
  listId?: string;
  listName?: string;
}

function conditionsMatch(
  conditions: z.infer<typeof conditionsSchema>,
  ctx: AutomationContext,
): boolean {
  if (conditions.listId && conditions.listId !== ctx.listId) return false;
  if (
    conditions.listName &&
    conditions.listName.toLowerCase() !== ctx.listName?.toLowerCase()
  )
    return false;
  return true;
}

async function runAction(tx: Tx, action: AutomationAction, ctx: AutomationContext) {
  switch (action.type) {
    case "MARK_COMPLETED": {
      const card = await tx.card.findUnique({ where: { id: ctx.cardId } });
      if (!card || card.isCompleted) return;
      await tx.card.update({
        where: { id: ctx.cardId },
        data: { isCompleted: true, completedAt: new Date() },
      });
      await logCardActivity(tx, {
        cardId: ctx.cardId,
        boardId: ctx.boardId,
        action: "COMPLETED",
        meta: { by: "automation" },
      });
      return;
    }
    case "MARK_INCOMPLETE": {
      await tx.card.update({
        where: { id: ctx.cardId },
        data: { isCompleted: false, completedAt: null },
      });
      return;
    }
    case "ADD_LABEL": {
      let label = await tx.label.findFirst({
        where: { boardId: ctx.boardId, name: action.labelName },
      });
      label ??= await tx.label.create({
        data: { boardId: ctx.boardId, name: action.labelName, color: action.labelColor },
      });
      await tx.cardLabel.upsert({
        where: { cardId_labelId: { cardId: ctx.cardId, labelId: label.id } },
        update: {},
        create: { cardId: ctx.cardId, labelId: label.id },
      });
      return;
    }
    case "REMOVE_LABEL": {
      const label = await tx.label.findFirst({
        where: { boardId: ctx.boardId, name: action.labelName },
      });
      if (!label) return;
      await tx.cardLabel.deleteMany({
        where: { cardId: ctx.cardId, labelId: label.id },
      });
      return;
    }
  }
}

/** Finds matching enabled rules for a trigger and executes their actions. */
export async function runAutomationRules(
  tx: Tx,
  trigger: AutomationTrigger,
  ctx: AutomationContext,
) {
  const rules = await tx.automationRule.findMany({
    where: {
      trigger,
      isEnabled: true,
      OR: [{ boardId: null }, { boardId: ctx.boardId }],
    },
    orderBy: { createdAt: "asc" },
  });

  for (const rule of rules) {
    const conditions = conditionsSchema.safeParse(rule.conditions);
    if (!conditions.success || !conditionsMatch(conditions.data, ctx)) continue;
    const actions = z.array(actionSchema).safeParse(rule.actions);
    if (!actions.success) continue;
    for (const action of actions.data) {
      await runAction(tx, action, ctx);
    }
  }
}

/**
 * Lazy DUE_DATE_PASSED evaluation: applies matching rules to overdue,
 * incomplete, unarchived cards of a board. Called when a board is opened.
 */
export async function runDueDatePassedRules(tx: Tx, boardId: string) {
  const rules = await tx.automationRule.findMany({
    where: {
      trigger: "DUE_DATE_PASSED",
      isEnabled: true,
      OR: [{ boardId: null }, { boardId }],
    },
  });
  if (rules.length === 0) return;

  const overdue = await tx.card.findMany({
    where: {
      boardId,
      isCompleted: false,
      archivedAt: null,
      dueDate: { lt: new Date() },
    },
    include: { list: true },
  });
  for (const card of overdue) {
    await runAutomationRules(tx, "DUE_DATE_PASSED", {
      cardId: card.id,
      boardId,
      listId: card.listId,
      listName: card.list.name,
    });
  }
}
