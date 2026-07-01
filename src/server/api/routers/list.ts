import { z } from "zod";

import { appendPosition } from "~/lib/position";
import { listInput } from "~/schemas/board";
import { uuid } from "~/schemas/common";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const listRouter = createTRPCRouter({
  create: protectedProcedure.input(listInput).mutation(async ({ ctx, input }) => {
    const last = await ctx.db.list.aggregate({
      where: { boardId: input.boardId },
      _max: { position: true },
    });
    return ctx.db.list.create({
      data: { ...input, position: appendPosition(last._max.position) },
    });
  }),

  rename: protectedProcedure
    .input(z.object({ id: uuid, name: z.string().min(1).max(120) }))
    .mutation(({ ctx, input }) =>
      ctx.db.list.update({ where: { id: input.id }, data: { name: input.name } }),
    ),

  /** Horizontal list reordering via fractional position. */
  move: protectedProcedure
    .input(z.object({ id: uuid, position: z.number().finite().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.db.list.update({
        where: { id: input.id },
        data: { position: input.position },
      }),
    ),

  /** Hard delete — cascades the list's cards (spec §4). */
  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.list.delete({ where: { id: input } });
    return { ok: true };
  }),
});
