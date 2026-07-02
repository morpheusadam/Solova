import { z } from "zod";

import { uuid } from "~/schemas/common";
import { contactInput } from "~/schemas/contact";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const contactRouter = createTRPCRouter({
  /** All contacts (optionally filtered/searched) with their company. */
  list: protectedProcedure
    .input(
      z
        .object({ companyId: uuid.optional(), search: z.string().max(200).optional() })
        .optional(),
    )
    .query(({ ctx, input }) =>
      ctx.db.contact.findMany({
        where: {
          companyId: input?.companyId,
          name: input?.search
            ? { contains: input.search, mode: "insensitive" }
            : undefined,
        },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        include: { company: { select: { id: true, name: true } } },
      }),
    ),

  listByCompany: protectedProcedure.input(uuid).query(({ ctx, input }) =>
    ctx.db.contact.findMany({
      where: { companyId: input },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    }),
  ),

  create: protectedProcedure.input(contactInput).mutation(({ ctx, input }) =>
    ctx.db.contact.create({ data: input }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: contactInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.contact.update({ where: { id: input.id }, data: input.data }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.contact.delete({ where: { id: input } });
    return { ok: true };
  }),
});
