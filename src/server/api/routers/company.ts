import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { uuid } from "~/schemas/common";
import { companyInput, companyStatuses } from "~/schemas/company";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { asNumber } from "~/lib/money";

export const companyRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().max(200).optional(),
          status: z.enum(companyStatuses).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const companies = await ctx.db.company.findMany({
        where: {
          status: input?.status,
          name: input?.search
            ? { contains: input.search, mode: "insensitive" }
            : undefined,
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { boards: true, projects: true, contracts: true } },
        },
      });

      // quick per-company stats: open cards + unpaid balance
      const [openCards, invoiced, paid] = await Promise.all([
        ctx.db.card.groupBy({
          by: ["boardId"],
          where: { isCompleted: false, archivedAt: null },
          _count: { _all: true },
        }),
        ctx.db.invoice.groupBy({
          by: ["companyId"],
          where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } },
          _sum: { totalMinor: true },
        }),
        ctx.db.payment.groupBy({
          by: ["companyId"],
          where: { invoice: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } } },
          _sum: { amountMinor: true },
        }),
      ]);

      const boards = await ctx.db.board.findMany({
        select: { id: true, companyId: true },
      });
      const boardCompany = new Map(boards.map((b) => [b.id, b.companyId]));
      const openByCompany = new Map<string, number>();
      for (const row of openCards) {
        const companyId = boardCompany.get(row.boardId);
        if (!companyId) continue;
        openByCompany.set(
          companyId,
          (openByCompany.get(companyId) ?? 0) + row._count._all,
        );
      }
      const unpaidByCompany = new Map<string, number>();
      for (const row of invoiced) {
        unpaidByCompany.set(row.companyId, asNumber(row._sum.totalMinor));
      }
      for (const row of paid) {
        unpaidByCompany.set(
          row.companyId,
          (unpaidByCompany.get(row.companyId) ?? 0) - asNumber(row._sum.amountMinor),
        );
      }

      return companies.map((company) => ({
        ...company,
        defaultRateMinor: asNumber(company.defaultRateMinor),
        openTasks: openByCompany.get(company.id) ?? 0,
        unpaidMinor: Math.max(0, unpaidByCompany.get(company.id) ?? 0),
      }));
    }),

  byId: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: input },
      include: {
        _count: { select: { boards: true, projects: true, contracts: true, invoices: true } },
      },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return { ...company, defaultRateMinor: asNumber(company.defaultRateMinor) };
  }),

  create: protectedProcedure.input(companyInput).mutation(({ ctx, input }) =>
    ctx.db.company.create({ data: input }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: companyInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.company.update({ where: { id: input.id }, data: input.data }),
    ),

  /** What a delete would cascade to — shown in the confirmation dialog. */
  deletePreview: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const [boards, projects, contracts, invoices, payments] = await Promise.all([
      ctx.db.board.count({ where: { companyId: input } }),
      ctx.db.project.count({ where: { companyId: input } }),
      ctx.db.contract.count({ where: { companyId: input } }),
      ctx.db.invoice.count({ where: { companyId: input } }),
      ctx.db.payment.count({ where: { companyId: input } }),
    ]);
    const cards = await ctx.db.card.count({
      where: { board: { companyId: input } },
    });
    return { boards, projects, contracts, cards, invoices, payments };
  }),

  /**
   * Hard delete: cascades EVERYTHING belonging to the company — boards→lists→cards,
   * projects, contracts, contacts, and its invoices/payments/expenses (spec §4 was
   * relaxed at the owner's request so a company delete wipes all of its data).
   * Posted journal entries stay in the append-only ledger with company_id nulled.
   */
  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.company.delete({ where: { id: input } });
    return { ok: true };
  }),

  /** Income + outstanding numbers for the company Finance tab. */
  financeSummary: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const [invoices, payments] = await Promise.all([
      ctx.db.invoice.findMany({
        where: { companyId: input },
        orderBy: { issueDate: "desc" },
        include: { payments: true },
      }),
      ctx.db.payment.findMany({
        where: { companyId: input },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let paidThisMonth = 0;
    let paidThisYear = 0;
    for (const p of payments) {
      const amount = asNumber(p.amountMinor);
      if (p.paidAt >= yearStart) paidThisYear += amount;
      if (p.paidAt >= monthStart) paidThisMonth += amount;
    }
    const outstanding = invoices
      .filter((i) => ["SENT", "PARTIAL", "OVERDUE"].includes(i.status))
      .reduce(
        (sum, i) =>
          sum +
          asNumber(i.totalMinor) -
          i.payments.reduce((s, p) => s + asNumber(p.amountMinor), 0),
        0,
      );

    return {
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        status: i.status,
        totalMinor: asNumber(i.totalMinor),
        currencyCode: i.currencyCode,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amountMinor: asNumber(p.amountMinor),
        paidAt: p.paidAt,
        method: p.method,
        reference: p.reference,
      })),
      paidThisMonth,
      paidThisYear,
      outstanding: Math.max(0, outstanding),
    };
  }),
});
