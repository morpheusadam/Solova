import { z } from "zod";

import { appendPosition } from "~/lib/position";
import { uuid } from "~/schemas/common";
import { noteInput } from "~/schemas/note";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const noteRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.note.findMany({ orderBy: [{ pinned: "desc" }, { position: "desc" }] }),
  ),

  create: protectedProcedure.input(noteInput).mutation(async ({ ctx, input }) => {
    const last = await ctx.db.note.aggregate({ _max: { position: true } });
    return ctx.db.note.create({
      data: { ...input, position: appendPosition(last._max.position) },
    });
  }),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: noteInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.note.update({ where: { id: input.id }, data: input.data }),
    ),

  togglePin: protectedProcedure
    .input(z.object({ id: uuid, pinned: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.note.update({ where: { id: input.id }, data: { pinned: input.pinned } }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.note.delete({ where: { id: input } });
    return { ok: true };
  }),
});
