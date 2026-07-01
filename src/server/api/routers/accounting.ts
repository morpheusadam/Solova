import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { asNumber } from "~/lib/money";
import {
  accountInput,
  expenseInput,
  invoiceInput,
  journalEntryInput,
  paymentInput,
} from "~/schemas/accounting";
import { uuid } from "~/schemas/common";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  postExpense,
  postInvoiceIssued,
  postJournalEntry,
  postPaymentReceived,
  refreshInvoiceStatus,
  reverseJournalEntry,
} from "~/server/services/accounting/posting";
import {
  balanceSheet,
  incomeReport,
  profitAndLoss,
} from "~/server/services/accounting/reports";

export const accountingRouter = createTRPCRouter({
  // ── chart of accounts ─────────────────────────────────────────────────────
  accounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.account.findMany({ orderBy: { code: "asc" } });
    return accounts;
  }),

  createAccount: protectedProcedure.input(accountInput).mutation(({ ctx, input }) => {
    const normalBalance =
      input.type === "ASSET" || input.type === "EXPENSE" ? "DEBIT" : "CREDIT";
    return ctx.db.account.create({ data: { ...input, normalBalance } });
  }),

  updateAccount: protectedProcedure
    .input(z.object({ id: uuid, name: z.string().min(1).max(200), isActive: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.account.update({
        where: { id: input.id },
        data: { name: input.name, isActive: input.isActive },
      }),
    ),

  // ── journal ───────────────────────────────────────────────────────────────
  journal: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).default(1) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = 25;
      const [total, entries] = await Promise.all([
        ctx.db.journalEntry.count(),
        ctx.db.journalEntry.findMany({
          orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            lines: { include: { account: { select: { code: true, name: true } } } },
            company: { select: { id: true, name: true } },
          },
        }),
      ]);
      return {
        total,
        page,
        pageSize,
        entries: entries.map((e) => ({
          ...e,
          lines: e.lines.map((l) => ({
            ...l,
            debitMinor: asNumber(l.debitMinor),
            creditMinor: asNumber(l.creditMinor),
          })),
        })),
      };
    }),

  createJournalEntry: protectedProcedure
    .input(journalEntryInput)
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction((tx) =>
        postJournalEntry(tx, { ...input, referenceType: "MANUAL" }),
      ),
    ),

  reverseEntry: protectedProcedure.input(uuid).mutation(({ ctx, input }) =>
    ctx.db.$transaction((tx) => reverseJournalEntry(tx, input)),
  ),

  // ── invoices ──────────────────────────────────────────────────────────────
  invoices: protectedProcedure
    .input(z.object({ companyId: uuid.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const invoices = await ctx.db.invoice.findMany({
        where: { companyId: input?.companyId },
        orderBy: { issueDate: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          payments: { select: { amountMinor: true } },
        },
      });
      return invoices.map((i) => ({
        ...i,
        subtotalMinor: asNumber(i.subtotalMinor),
        taxMinor: asNumber(i.taxMinor),
        totalMinor: asNumber(i.totalMinor),
        paidMinor: i.payments.reduce((s, p) => s + asNumber(p.amountMinor), 0),
      }));
    }),

  invoiceById: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const invoice = await ctx.db.invoice.findUnique({
      where: { id: input },
      include: {
        company: true,
        contract: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        lines: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    });
    if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      ...invoice,
      subtotalMinor: asNumber(invoice.subtotalMinor),
      taxMinor: asNumber(invoice.taxMinor),
      totalMinor: asNumber(invoice.totalMinor),
      lines: invoice.lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity),
        unitPriceMinor: asNumber(l.unitPriceMinor),
        amountMinor: asNumber(l.amountMinor),
      })),
      payments: invoice.payments.map((p) => ({
        ...p,
        amountMinor: asNumber(p.amountMinor),
      })),
    };
  }),

  /** Creates a DRAFT invoice with the next sequential number. */
  createInvoice: protectedProcedure.input(invoiceInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const settings = await tx.settings.findUniqueOrThrow({ where: { id: 1 } });
      const invoiceNumber = `${settings.invoicePrefix}${String(settings.nextInvoiceSeq).padStart(4, "0")}`;
      await tx.settings.update({
        where: { id: 1 },
        data: { nextInvoiceSeq: settings.nextInvoiceSeq + 1 },
      });

      const subtotal = input.lines.reduce(
        (s, l) => s + Math.round(l.quantity * l.unitPriceMinor),
        0,
      );
      const company = await tx.company.findUniqueOrThrow({ where: { id: input.companyId } });

      return tx.invoice.create({
        data: {
          companyId: input.companyId,
          contractId: input.contractId ?? null,
          projectId: input.projectId ?? null,
          invoiceNumber,
          issueDate: input.issueDate,
          dueDate: input.dueDate ?? null,
          status: "DRAFT",
          subtotalMinor: subtotal,
          taxMinor: input.taxMinor,
          totalMinor: subtotal + input.taxMinor,
          currencyCode: company.currencyCode ?? settings.baseCurrency,
          notes: input.notes,
          lines: {
            create: input.lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPriceMinor: l.unitPriceMinor,
              amountMinor: Math.round(l.quantity * l.unitPriceMinor),
              sourceType: "MANUAL",
            })),
          },
        },
      });
    }),
  ),

  /** DRAFT → SENT: writes the DR AR / CR Revenue journal entry. */
  postInvoice: protectedProcedure.input(uuid).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: input } });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      if (invoice.status !== "DRAFT") {
        throw new TRPCError({ code: "CONFLICT", message: "Only draft invoices can be issued." });
      }
      await postInvoiceIssued(tx, {
        id: invoice.id,
        companyId: invoice.companyId,
        totalMinor: asNumber(invoice.totalMinor),
        issueDate: invoice.issueDate,
        invoiceNumber: invoice.invoiceNumber,
      });
      return tx.invoice.update({ where: { id: input }, data: { status: "SENT" } });
    }),
  ),

  /** VOID an issued invoice by reversing its journal entry — history stays intact. */
  voidInvoice: protectedProcedure.input(uuid).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: input },
        include: { payments: true },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
      if (invoice.payments.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invoice has payments — reverse those first.",
        });
      }
      const entry = await tx.journalEntry.findFirst({
        where: { referenceType: "INVOICE", referenceId: invoice.id, reversedByEntryId: null },
      });
      if (entry) {
        await reverseJournalEntry(tx, entry.id, `Void invoice ${invoice.invoiceNumber}`);
      }
      return tx.invoice.update({ where: { id: input }, data: { status: "VOID" } });
    }),
  ),

  deleteDraftInvoice: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    const invoice = await ctx.db.invoice.findUnique({ where: { id: input } });
    if (!invoice) throw new TRPCError({ code: "NOT_FOUND" });
    if (invoice.status !== "DRAFT") {
      throw new TRPCError({ code: "CONFLICT", message: "Only draft invoices can be deleted." });
    }
    await ctx.db.invoice.delete({ where: { id: input } });
    return { ok: true };
  }),

  // ── payments ──────────────────────────────────────────────────────────────
  payments: protectedProcedure
    .input(z.object({ companyId: uuid.optional(), take: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: { companyId: input?.companyId },
        orderBy: { paidAt: "desc" },
        take: input?.take ?? 50,
        include: {
          company: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });
      return payments.map((p) => ({ ...p, amountMinor: asNumber(p.amountMinor) }));
    }),

  createPayment: protectedProcedure.input(paymentInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId: input.companyId,
          invoiceId: input.invoiceId ?? null,
          amountMinor: input.amountMinor,
          paidAt: input.paidAt,
          method: input.method,
          reference: input.reference,
          notes: input.notes,
        },
      });
      await postPaymentReceived(tx, {
        id: payment.id,
        companyId: input.companyId,
        amountMinor: input.amountMinor,
        paidAt: input.paidAt,
        method: input.method,
      });
      if (input.invoiceId) await refreshInvoiceStatus(tx, input.invoiceId);
      return payment;
    }),
  ),

  // ── expenses ──────────────────────────────────────────────────────────────
  expenses: protectedProcedure.query(async ({ ctx }) => {
    const expenses = await ctx.db.expense.findMany({
      orderBy: { spentAt: "desc" },
      take: 200,
      include: {
        company: { select: { id: true, name: true } },
        categoryAccount: { select: { id: true, code: true, name: true } },
      },
    });
    return expenses.map((e) => ({ ...e, amountMinor: asNumber(e.amountMinor) }));
  }),

  createExpense: protectedProcedure.input(expenseInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId: input.companyId ?? null,
          categoryAccountId: input.categoryAccountId,
          description: input.description,
          amountMinor: input.amountMinor,
          spentAt: input.spentAt,
          billable: input.billable,
          receiptUrl: input.receiptUrl,
        },
      });
      await postExpense(tx, {
        id: expense.id,
        companyId: input.companyId,
        categoryAccountId: input.categoryAccountId,
        amountMinor: input.amountMinor,
        spentAt: input.spentAt,
        description: input.description,
      });
      return expense;
    }),
  ),

  // ── reports ───────────────────────────────────────────────────────────────
  pnl: protectedProcedure
    .input(z.object({ from: z.coerce.date(), to: z.coerce.date() }))
    .query(({ ctx, input }) => profitAndLoss(ctx.db, input)),

  balanceSheet: protectedProcedure
    .input(z.object({ asOf: z.coerce.date() }))
    .query(({ ctx, input }) => balanceSheet(ctx.db, input)),

  income: protectedProcedure
    .input(z.object({ from: z.coerce.date(), groupBy: z.enum(["month", "company"]) }))
    .query(({ ctx, input }) => incomeReport(ctx.db, input)),
});
