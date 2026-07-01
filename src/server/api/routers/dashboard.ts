import { subDays, subMonths } from "date-fns";
import { z } from "zod";

import { asNumber } from "~/lib/money";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { heatmapDays } from "~/server/services/heatmap";
import { incomeReport } from "~/server/services/accounting/reports";

export const dashboardRouter = createTRPCRouter({
  /** ~12 months of daily activity for the contribution grid. */
  heatmap: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.settings.findUnique({ where: { id: 1 } });
    return heatmapDays(ctx.db, {
      from: subDays(new Date(), 370),
      timezone: settings?.timezone ?? "UTC",
    });
  }),

  taskStats: protectedProcedure
    .input(z.object({ boardId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const boardFilter = input?.boardId ? { boardId: input.boardId } : {};
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 86400_000);

      const [open, closed, overdue, dueSoon, byList, byLabel] = await Promise.all([
        ctx.db.card.count({ where: { ...boardFilter, isCompleted: false, archivedAt: null } }),
        ctx.db.card.count({ where: { ...boardFilter, isCompleted: true, archivedAt: null } }),
        ctx.db.card.count({
          where: { ...boardFilter, isCompleted: false, archivedAt: null, dueDate: { lt: now } },
        }),
        ctx.db.card.count({
          where: {
            ...boardFilter,
            isCompleted: false,
            archivedAt: null,
            dueDate: { gte: now, lte: weekAhead },
          },
        }),
        ctx.db.card.groupBy({
          by: ["listId"],
          where: { ...boardFilter, archivedAt: null },
          _count: { _all: true },
        }),
        ctx.db.cardLabel.groupBy({
          by: ["labelId"],
          where: { card: { ...boardFilter, archivedAt: null } },
          _count: { _all: true },
        }),
      ]);

      const [lists, labels] = await Promise.all([
        ctx.db.list.findMany({
          where: { id: { in: byList.map((r) => r.listId) } },
          select: { id: true, name: true, board: { select: { name: true } } },
        }),
        ctx.db.label.findMany({
          where: { id: { in: byLabel.map((r) => r.labelId) } },
          select: { id: true, name: true, color: true },
        }),
      ]);
      const listName = new Map(lists.map((l) => [l.id, input?.boardId ? l.name : `${l.board.name} · ${l.name}`]));
      const labelById = new Map(labels.map((l) => [l.id, l]));

      return {
        open,
        closed,
        overdue,
        dueSoon,
        byList: byList
          .map((r) => ({ name: listName.get(r.listId) ?? "?", count: r._count._all }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        byLabel: byLabel
          .map((r) => ({
            name: labelById.get(r.labelId)?.name ?? "?",
            color: labelById.get(r.labelId)?.color ?? "#8993A4",
            count: r._count._all,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      };
    }),

  /** Income list + expected-vs-actual per company (spec §6.3). */
  income: protectedProcedure.query(async ({ ctx }) => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [settings, recent, monthly, companies, activeContracts, unpaid, hoursMonth] =
      await Promise.all([
        ctx.db.settings.findUnique({ where: { id: 1 } }),
        ctx.db.payment.findMany({
          orderBy: { paidAt: "desc" },
          take: 12,
          include: { company: { select: { id: true, name: true } } },
        }),
        incomeReport(ctx.db, { from: subMonths(new Date(), 12), groupBy: "month" }),
        ctx.db.company.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, billingModel: true, defaultRateMinor: true },
        }),
        ctx.db.contract.findMany({
          where: { status: "ACTIVE", monthlyAmountMinor: { not: null } },
          select: { companyId: true, monthlyAmountMinor: true },
        }),
        ctx.db.invoice.aggregate({
          where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } },
          _sum: { totalMinor: true },
        }),
        ctx.db.timeEntry.aggregate({
          where: { startedAt: { gte: monthStart } },
          _sum: { durationSeconds: true },
        }),
      ]);

    const paidThisMonth = await ctx.db.payment.groupBy({
      by: ["companyId"],
      where: { paidAt: { gte: monthStart } },
      _sum: { amountMinor: true },
    });
    const paidThisYear = await ctx.db.payment.groupBy({
      by: ["companyId"],
      where: { paidAt: { gte: yearStart } },
      _sum: { amountMinor: true },
    });

    const expectedByCompany = new Map<string, number>();
    for (const c of activeContracts) {
      expectedByCompany.set(
        c.companyId,
        (expectedByCompany.get(c.companyId) ?? 0) + asNumber(c.monthlyAmountMinor),
      );
    }
    const monthByCompany = new Map(
      paidThisMonth.map((r) => [r.companyId, asNumber(r._sum.amountMinor)]),
    );
    const yearByCompany = new Map(
      paidThisYear.map((r) => [r.companyId, asNumber(r._sum.amountMinor)]),
    );

    return {
      currency: settings?.baseCurrency ?? "USD",
      locale: settings?.locale ?? "en-US",
      recentPayments: recent.map((p) => ({
        id: p.id,
        company: p.company,
        amountMinor: asNumber(p.amountMinor),
        paidAt: p.paidAt,
        method: p.method,
      })),
      monthlyIncome: monthly,
      thisMonthMinor: [...monthByCompany.values()].reduce((s, v) => s + v, 0),
      outstandingMinor: asNumber(unpaid._sum.totalMinor),
      hoursThisMonth: Math.round((hoursMonth._sum.durationSeconds ?? 0) / 3600),
      perCompany: companies.map((c) => ({
        id: c.id,
        name: c.name,
        billingModel: c.billingModel,
        expectedMonthlyMinor:
          expectedByCompany.get(c.id) ??
          (c.billingModel === "MONTHLY_RETAINER" ? asNumber(c.defaultRateMinor) : 0),
        receivedThisMonthMinor: monthByCompany.get(c.id) ?? 0,
        receivedThisYearMinor: yearByCompany.get(c.id) ?? 0,
      })),
    };
  }),

  quickStats: protectedProcedure.query(async ({ ctx }) => {
    const [activeCompanies, activeProjects, openTasks, unpaidInvoices] = await Promise.all([
      ctx.db.company.count({ where: { status: "ACTIVE" } }),
      ctx.db.project.count({ where: { status: "ACTIVE" } }),
      ctx.db.card.count({ where: { isCompleted: false, archivedAt: null } }),
      ctx.db.invoice.count({ where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } } }),
    ]);
    return { activeCompanies, activeProjects, openTasks, unpaidInvoices };
  }),
});
