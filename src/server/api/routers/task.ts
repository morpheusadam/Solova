import { z } from "zod";

import { paginationInput, uuid } from "~/schemas/common";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Global cross-board task table (spec §2.6). */
export const taskRouter = createTRPCRouter({
  all: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["OPEN", "CLOSED", "ALL"]).default("OPEN"),
        companyId: uuid.optional(),
        boardId: uuid.optional(),
        due: z.enum(["OVERDUE", "WEEK", "ANY"]).default("ANY"),
        search: z.string().max(200).optional(),
        sort: z.enum(["DUE", "CREATED", "TITLE"]).default("DUE"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 86400_000);
      const where = {
        archivedAt: null,
        isCompleted:
          input.status === "OPEN" ? false : input.status === "CLOSED" ? true : undefined,
        boardId: input.boardId,
        board: input.companyId ? { companyId: input.companyId } : undefined,
        title: input.search
          ? { contains: input.search, mode: "insensitive" as const }
          : undefined,
        dueDate:
          input.due === "OVERDUE"
            ? { lt: now }
            : input.due === "WEEK"
              ? { gte: now, lte: weekAhead }
              : undefined,
      };

      const [total, cards] = await Promise.all([
        ctx.db.card.count({ where }),
        ctx.db.card.findMany({
          where,
          orderBy:
            input.sort === "DUE"
              ? [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
              : input.sort === "TITLE"
                ? { title: "asc" }
                : { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            list: { select: { name: true } },
            board: {
              select: { id: true, name: true, company: { select: { id: true, name: true } } },
            },
            labels: { include: { label: true } },
          },
        }),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        tasks: cards.map((c) => ({
          id: c.id,
          title: c.title,
          listName: c.list.name,
          board: c.board,
          dueDate: c.dueDate,
          isCompleted: c.isCompleted,
          createdAt: c.createdAt,
          labels: c.labels.map((l) => l.label),
        })),
      };
    }),

  counts: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const [open, closed, overdue] = await Promise.all([
      ctx.db.card.count({ where: { isCompleted: false, archivedAt: null } }),
      ctx.db.card.count({ where: { isCompleted: true, archivedAt: null } }),
      ctx.db.card.count({
        where: { isCompleted: false, archivedAt: null, dueDate: { lt: now } },
      }),
    ]);
    return { open, closed, overdue };
  }),
});
