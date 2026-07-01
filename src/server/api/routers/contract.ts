import { z } from "zod";

import { uuid } from "~/schemas/common";
import { contractInput } from "~/schemas/contract";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { asNumber } from "~/lib/money";

export const contractRouter = createTRPCRouter({
  listByCompany: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const contracts = await ctx.db.contract.findMany({
      where: { companyId: input },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });
    return contracts.map((c) => ({
      ...c,
      valueMinor: asNumber(c.valueMinor),
      monthlyAmountMinor: asNumber(c.monthlyAmountMinor),
    }));
  }),

  create: protectedProcedure.input(contractInput).mutation(({ ctx, input }) =>
    ctx.db.contract.create({ data: input }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: contractInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.contract.update({ where: { id: input.id }, data: input.data }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.contract.delete({ where: { id: input } });
    return { ok: true };
  }),
});
