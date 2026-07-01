import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { appendPosition } from "~/lib/position";
import { boardInput } from "~/schemas/board";
import { uuid } from "~/schemas/common";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { runDueDatePassedRules } from "~/server/services/automation";

const DEFAULT_LISTS = ["To Do", "Doing", "Done"];

export const boardRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ companyId: uuid.optional(), includeArchived: z.boolean().default(false) }).optional())
    .query(({ ctx, input }) =>
      ctx.db.board.findMany({
        where: {
          companyId: input?.companyId,
          archivedAt: input?.includeArchived ? undefined : null,
        },
        orderBy: { position: "asc" },
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { cards: { where: { archivedAt: null } } } },
        },
      }),
    ),

  /** Full board payload for the Kanban view. Also lazily applies DUE_DATE_PASSED rules. */
  byId: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    await ctx.db.$transaction((tx) => runDueDatePassedRules(tx, input));

    const board = await ctx.db.board.findUnique({
      where: { id: input },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        labels: { orderBy: { createdAt: "asc" } },
        lists: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: "asc" },
              include: {
                labels: { include: { label: true } },
                _count: { select: { comments: true, attachments: true } },
                checklists: {
                  select: { items: { select: { isChecked: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!board) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => {
          const checklistItems = card.checklists.flatMap((c) => c.items);
          return {
            id: card.id,
            listId: card.listId,
            boardId: card.boardId,
            title: card.title,
            position: card.position,
            dueDate: card.dueDate,
            startDate: card.startDate,
            cover: card.cover,
            isCompleted: card.isCompleted,
            hasDescription: Boolean(card.description),
            labels: card.labels.map((cl) => cl.label),
            commentCount: card._count.comments,
            attachmentCount: card._count.attachments,
            checklistTotal: checklistItems.length,
            checklistDone: checklistItems.filter((i) => i.isChecked).length,
          };
        }),
      })),
    };
  }),

  create: protectedProcedure
    .input(boardInput.extend({ withDefaultLists: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const { withDefaultLists, ...data } = input;
      const last = await ctx.db.board.aggregate({ _max: { position: true } });
      return ctx.db.board.create({
        data: {
          ...data,
          position: appendPosition(last._max.position),
          lists: withDefaultLists
            ? {
                create: DEFAULT_LISTS.map((name, i) => ({
                  name,
                  position: (i + 1) * 65536,
                })),
              }
            : undefined,
        },
      });
    }),

  fromTemplate: protectedProcedure
    .input(z.object({ templateId: uuid, companyId: uuid, projectId: uuid.optional().nullable(), name: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.boardTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const payload = template.payload as {
        lists?: string[];
        labels?: Array<{ name: string; color: string }>;
        background?: string;
      };
      const last = await ctx.db.board.aggregate({ _max: { position: true } });
      return ctx.db.board.create({
        data: {
          companyId: input.companyId,
          projectId: input.projectId ?? null,
          name: input.name,
          background: payload.background,
          position: appendPosition(last._max.position),
          lists: {
            create: (payload.lists ?? DEFAULT_LISTS).map((name, i) => ({
              name,
              position: (i + 1) * 65536,
            })),
          },
          labels: payload.labels
            ? { create: payload.labels.map((l) => ({ name: l.name, color: l.color })) }
            : undefined,
        },
      });
    }),

  templates: protectedProcedure.query(({ ctx }) =>
    ctx.db.boardTemplate.findMany({ orderBy: { name: "asc" } }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: boardInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.board.update({ where: { id: input.id }, data: input.data }),
    ),

  archive: protectedProcedure
    .input(z.object({ id: uuid, archived: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.board.update({
        where: { id: input.id },
        data: { archivedAt: input.archived ? new Date() : null },
      }),
    ),

  /** Hard delete — cascades lists and cards at the database level (spec §4). */
  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.board.delete({ where: { id: input } });
    return { ok: true };
  }),
});
