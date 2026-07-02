import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { appendPosition } from "~/lib/position";
import {
  cardCreateInput,
  cardMoveInput,
  cardUpdateInput,
  checklistItemInput,
  labelInput,
} from "~/schemas/board";
import { uuid } from "~/schemas/common";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { logCardActivity } from "~/server/services/activity";
import { runAutomationRules } from "~/server/services/automation";
import { moveCard, rebalanceList } from "~/server/services/card";

export const cardRouter = createTRPCRouter({
  byId: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const card = await ctx.db.card.findUnique({
      where: { id: input },
      include: {
        list: { select: { id: true, name: true } },
        board: { select: { id: true, name: true, companyId: true } },
        labels: { include: { label: true } },
        checklists: {
          orderBy: { position: "asc" },
          include: { items: { orderBy: { position: "asc" } } },
        },
        comments: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        activity: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!card) throw new TRPCError({ code: "NOT_FOUND" });
    return { ...card, labels: card.labels.map((cl) => cl.label) };
  }),

  create: protectedProcedure.input(cardCreateInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const list = await tx.list.findUnique({ where: { id: input.listId } });
      if (!list) throw new TRPCError({ code: "NOT_FOUND", message: "List not found." });
      const last = await tx.card.aggregate({
        where: { listId: list.id, archivedAt: null },
        _max: { position: true },
      });
      const card = await tx.card.create({
        data: {
          listId: list.id,
          boardId: list.boardId,
          title: input.title,
          position: appendPosition(last._max.position),
        },
      });
      await logCardActivity(tx, {
        cardId: card.id,
        boardId: list.boardId,
        action: "CREATED",
        meta: { listName: list.name },
      });
      await runAutomationRules(tx, "CARD_CREATED_IN_LIST", {
        cardId: card.id,
        boardId: list.boardId,
        listId: list.id,
        listName: list.name,
      });
      return card;
    }),
  ),

  fromTemplate: protectedProcedure
    .input(z.object({ templateId: uuid, listId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const [template, list] = await Promise.all([
          tx.cardTemplate.findUnique({ where: { id: input.templateId } }),
          tx.list.findUnique({ where: { id: input.listId } }),
        ]);
        if (!template || !list) throw new TRPCError({ code: "NOT_FOUND" });
        const payload = template.payload as {
          title?: string;
          description?: string;
          labels?: Array<{ name: string; color: string }>;
          checklists?: Array<{ title: string; items: string[] }>;
        };
        const last = await tx.card.aggregate({
          where: { listId: list.id, archivedAt: null },
          _max: { position: true },
        });
        const card = await tx.card.create({
          data: {
            listId: list.id,
            boardId: list.boardId,
            title: payload.title ?? template.name,
            description: payload.description,
            position: appendPosition(last._max.position),
          },
        });
        for (const l of payload.labels ?? []) {
          let label = await tx.label.findFirst({
            where: { boardId: list.boardId, name: l.name },
          });
          label ??= await tx.label.create({
            data: { boardId: list.boardId, name: l.name, color: l.color },
          });
          await tx.cardLabel.create({ data: { cardId: card.id, labelId: label.id } });
        }
        for (const [ci, cl] of (payload.checklists ?? []).entries()) {
          await tx.checklist.create({
            data: {
              cardId: card.id,
              title: cl.title,
              position: (ci + 1) * 65536,
              items: {
                create: cl.items.map((text, ii) => ({
                  text,
                  position: (ii + 1) * 65536,
                })),
              },
            },
          });
        }
        await logCardActivity(tx, {
          cardId: card.id,
          boardId: list.boardId,
          action: "CREATED",
          meta: { fromTemplate: template.name },
        });
        return card;
      }),
    ),

  cardTemplates: protectedProcedure.query(({ ctx }) =>
    ctx.db.cardTemplate.findMany({ orderBy: { name: "asc" } }),
  ),

  /** Snapshot an existing card (labels + checklists) into a reusable template. */
  saveAsTemplate: protectedProcedure
    .input(z.object({ cardId: uuid, name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.db.card.findUnique({
        where: { id: input.cardId },
        include: {
          labels: { include: { label: true } },
          checklists: {
            orderBy: { position: "asc" },
            include: { items: { orderBy: { position: "asc" } } },
          },
        },
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.cardTemplate.create({
        data: {
          name: input.name,
          payload: {
            title: card.title,
            description: card.description ?? undefined,
            labels: card.labels.map((cl) => ({
              name: cl.label.name,
              color: cl.label.color,
            })),
            checklists: card.checklists.map((cl) => ({
              title: cl.title,
              items: cl.items.map((i) => i.text),
            })),
          },
        },
      });
    }),

  deleteCardTemplate: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.cardTemplate.delete({ where: { id: input } });
    return { ok: true };
  }),

  update: protectedProcedure.input(cardUpdateInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const { id, ...data } = input;
      const existing = await tx.card.findUnique({ where: { id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const completionChanged =
        data.isCompleted !== undefined && data.isCompleted !== existing.isCompleted;

      const card = await tx.card.update({
        where: { id },
        data: {
          ...data,
          completedAt: completionChanged
            ? data.isCompleted
              ? new Date()
              : null
            : undefined,
        },
      });
      await logCardActivity(tx, {
        cardId: card.id,
        boardId: card.boardId,
        action: completionChanged && data.isCompleted ? "COMPLETED" : "UPDATED",
        meta: { fields: Object.keys(data) },
      });
      return card;
    }),
  ),

  move: protectedProcedure.input(cardMoveInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction((tx) => moveCard(tx, input)),
  ),

  rebalance: protectedProcedure.input(uuid).mutation(({ ctx, input }) =>
    ctx.db.$transaction((tx) => rebalanceList(tx, input)),
  ),

  archive: protectedProcedure
    .input(z.object({ id: uuid, archived: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const card = await tx.card.update({
          where: { id: input.id },
          data: { archivedAt: input.archived ? new Date() : null },
        });
        await logCardActivity(tx, {
          cardId: card.id,
          boardId: card.boardId,
          action: input.archived ? "ARCHIVED" : "UPDATED",
          meta: input.archived ? undefined : { restored: true },
        });
        return card;
      }),
    ),

  archived: protectedProcedure.input(uuid).query(({ ctx, input }) =>
    ctx.db.card.findMany({
      where: { boardId: input, archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      select: { id: true, title: true, archivedAt: true },
    }),
  ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.card.delete({ where: { id: input } });
    return { ok: true };
  }),

  // ── labels ──────────────────────────────────────────────────────────────
  createLabel: protectedProcedure.input(labelInput).mutation(({ ctx, input }) =>
    ctx.db.label.create({ data: input }),
  ),

  updateLabel: protectedProcedure
    .input(z.object({ id: uuid, name: z.string().min(1).max(60), color: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.label.update({
        where: { id: input.id },
        data: { name: input.name, color: input.color },
      }),
    ),

  deleteLabel: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.label.delete({ where: { id: input } });
    return { ok: true };
  }),

  toggleLabel: protectedProcedure
    .input(z.object({ cardId: uuid, labelId: uuid }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.cardLabel.findUnique({
        where: { cardId_labelId: input },
      });
      if (existing) {
        await ctx.db.cardLabel.delete({ where: { cardId_labelId: input } });
        return { attached: false };
      }
      await ctx.db.cardLabel.create({ data: input });
      return { attached: true };
    }),

  // ── checklists ──────────────────────────────────────────────────────────
  addChecklist: protectedProcedure
    .input(z.object({ cardId: uuid, title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.checklist.aggregate({
        where: { cardId: input.cardId },
        _max: { position: true },
      });
      return ctx.db.checklist.create({
        data: { ...input, position: appendPosition(last._max.position) },
      });
    }),

  deleteChecklist: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.checklist.delete({ where: { id: input } });
    return { ok: true };
  }),

  addChecklistItem: protectedProcedure
    .input(checklistItemInput)
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.checklistItem.aggregate({
        where: { checklistId: input.checklistId },
        _max: { position: true },
      });
      return ctx.db.checklistItem.create({
        data: { ...input, position: appendPosition(last._max.position) },
      });
    }),

  toggleChecklistItem: protectedProcedure
    .input(z.object({ id: uuid, isChecked: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.checklistItem.update({
        where: { id: input.id },
        data: { isChecked: input.isChecked },
      }),
    ),

  setChecklistItemDueDate: protectedProcedure
    .input(z.object({ id: uuid, dueDate: z.coerce.date().nullable() }))
    .mutation(({ ctx, input }) =>
      ctx.db.checklistItem.update({
        where: { id: input.id },
        data: { dueDate: input.dueDate },
      }),
    ),

  deleteChecklistItem: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.checklistItem.delete({ where: { id: input } });
    return { ok: true };
  }),

  /** Trello parity: promote a checklist item to a full card in the same list. */
  convertItemToCard: protectedProcedure.input(uuid).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const item = await tx.checklistItem.findUnique({
        where: { id: input },
        include: { checklist: { include: { card: true } } },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      const parent = item.checklist.card;
      const last = await tx.card.aggregate({
        where: { listId: parent.listId, archivedAt: null },
        _max: { position: true },
      });
      const card = await tx.card.create({
        data: {
          listId: parent.listId,
          boardId: parent.boardId,
          title: item.text,
          dueDate: item.dueDate,
          position: appendPosition(last._max.position),
        },
      });
      await tx.checklistItem.delete({ where: { id: item.id } });
      await logCardActivity(tx, {
        cardId: card.id,
        boardId: parent.boardId,
        action: "CREATED",
        meta: { convertedFromChecklistItem: true, parentCardId: parent.id },
      });
      return card;
    }),
  ),

  // ── comments & attachments ──────────────────────────────────────────────
  addComment: protectedProcedure
    .input(z.object({ cardId: uuid, body: z.string().min(1).max(10000) }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const comment = await tx.cardComment.create({ data: input });
        const card = await tx.card.findUniqueOrThrow({ where: { id: input.cardId } });
        await logCardActivity(tx, {
          cardId: card.id,
          boardId: card.boardId,
          action: "COMMENTED",
        });
        return comment;
      }),
    ),

  deleteComment: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.cardComment.delete({ where: { id: input } });
    return { ok: true };
  }),

  addAttachment: protectedProcedure
    .input(z.object({ cardId: uuid, fileUrl: z.string().min(1), fileName: z.string().min(1).max(300) }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const attachment = await tx.cardAttachment.create({ data: input });
        const card = await tx.card.findUniqueOrThrow({ where: { id: input.cardId } });
        await logCardActivity(tx, {
          cardId: card.id,
          boardId: card.boardId,
          action: "UPDATED",
          meta: { attachment: input.fileName },
        });
        return attachment;
      }),
    ),

  deleteAttachment: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.cardAttachment.delete({ where: { id: input } });
    return { ok: true };
  }),
});
