import { z } from "zod";

import { asNumber } from "~/lib/money";
import { uuid } from "~/schemas/common";
import { productInput } from "~/schemas/product";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
        where: input?.activeOnly ? { isActive: true } : undefined,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: { incomeAccount: { select: { id: true, code: true, name: true } } },
      });
      return products.map((p) => ({
        ...p,
        unitPriceMinor: asNumber(p.unitPriceMinor),
        taxRatePct: Number(p.taxRatePct),
      }));
    }),

  create: protectedProcedure.input(productInput).mutation(({ ctx, input }) =>
    ctx.db.product.create({
      data: {
        sku: input.sku ?? null,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        unitPriceMinor: input.unitPriceMinor,
        currencyCode: input.currencyCode ?? null,
        taxRatePct: input.taxRatePct,
        incomeAccountId: input.incomeAccountId ?? null,
        isActive: input.isActive,
      },
    }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: productInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.product.update({ where: { id: input.id }, data: input.data }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.product.delete({ where: { id: input } });
    return { ok: true };
  }),
});
