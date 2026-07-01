import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { asNumber } from "~/lib/money";
import { uuid } from "~/schemas/common";
import { timeEntryInput } from "~/schemas/time-entry";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const timeEntryRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ companyId: uuid.optional(), cardId: uuid.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.timeEntry.findMany({
        where: { companyId: input?.companyId, cardId: input?.cardId },
        orderBy: { startedAt: "desc" },
        take: 200,
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          card: { select: { id: true, title: true } },
        },
      });
      return entries.map((e) => ({ ...e, rateMinor: asNumber(e.rateMinor) }));
    }),

  create: protectedProcedure.input(timeEntryInput).mutation(({ ctx, input }) =>
    ctx.db.timeEntry.create({ data: input }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: timeEntryInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.timeEntry.update({ where: { id: input.id }, data: input.data }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.timeEntry.delete({ where: { id: input } });
    return { ok: true };
  }),

  /** One running timer at a time (endedAt = null). */
  startTimer: protectedProcedure
    .input(z.object({ companyId: uuid, cardId: uuid.optional().nullable(), description: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const running = await ctx.db.timeEntry.findFirst({ where: { endedAt: null } });
      if (running) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A timer is already running. Stop it first.",
        });
      }
      const company = await ctx.db.company.findUnique({ where: { id: input.companyId } });
      return ctx.db.timeEntry.create({
        data: {
          companyId: input.companyId,
          cardId: input.cardId ?? null,
          description: input.description,
          startedAt: new Date(),
          billable: true,
          rateMinor: company?.billingModel === "HOURLY" ? company.defaultRateMinor : null,
        },
      });
    }),

  stopTimer: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    const entry = await ctx.db.timeEntry.findUnique({ where: { id: input } });
    if (!entry || entry.endedAt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No running timer with that id." });
    }
    const endedAt = new Date();
    return ctx.db.timeEntry.update({
      where: { id: input },
      data: {
        endedAt,
        durationSeconds: Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 1000),
      },
    });
  }),

  running: protectedProcedure.query(({ ctx }) =>
    ctx.db.timeEntry.findFirst({
      where: { endedAt: null },
      include: { company: { select: { name: true } }, card: { select: { title: true } } },
    }),
  ),
});
