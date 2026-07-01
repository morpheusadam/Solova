import {
  type JournalReferenceType,
  type PaymentMethod,
  Prisma,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { type Tx } from "~/server/db";

/**
 * Double-entry posting service. All writes are balanced journal entries;
 * the DB enforces the same invariant with a deferred trigger as backstop.
 *
 * Posting recipes (documented in DECISIONS.md):
 *  invoice issued   → DR Accounts Receivable (1200) / CR Service Revenue (4100)
 *  payment received → DR Bank (1110)              / CR Accounts Receivable (1200)
 *  expense paid     → DR expense category account  / CR Bank (1110)
 */

export const ACCOUNT_CODES = {
  cash: "1100",
  bank: "1110",
  accountsReceivable: "1200",
  accountsPayable: "2100",
  taxesPayable: "2200",
  ownersEquity: "3100",
  serviceRevenue: "4100",
  productSales: "4200",
  expenseMisc: "5900",
} as const;

export interface JournalLineInput {
  accountId: string;
  debitMinor?: number;
  creditMinor?: number;
}

export interface JournalEntryInput {
  entryDate: Date;
  memo?: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  companyId?: string | null;
  lines: JournalLineInput[];
}

/** Validates balance and writes header + lines. Call inside a transaction. */
export async function postJournalEntry(tx: Tx, input: JournalEntryInput) {
  if (input.lines.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A journal entry needs at least two lines.",
    });
  }
  let debits = 0;
  let credits = 0;
  for (const line of input.lines) {
    const debit = line.debitMinor ?? 0;
    const credit = line.creditMinor ?? 0;
    if (debit < 0 || credit < 0 || !Number.isInteger(debit) || !Number.isInteger(credit)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Journal amounts must be non-negative integers (minor units).",
      });
    }
    if (debit > 0 && credit > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A journal line is either a debit or a credit, not both.",
      });
    }
    debits += debit;
    credits += credit;
  }
  if (debits !== credits || debits === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Journal entry is not balanced: debits ${debits} vs credits ${credits}.`,
    });
  }

  return tx.journalEntry.create({
    data: {
      entryDate: input.entryDate,
      memo: input.memo,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      companyId: input.companyId ?? null,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debitMinor: BigInt(line.debitMinor ?? 0),
          creditMinor: BigInt(line.creditMinor ?? 0),
        })),
      },
    },
    include: { lines: true },
  });
}

async function accountIdByCode(tx: Tx, code: string): Promise<string> {
  const account = await tx.account.findUnique({ where: { code } });
  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Account ${code} is missing from the chart of accounts.`,
    });
  }
  return account.id;
}

/** DR Accounts Receivable / CR Service Revenue for the invoice total. */
export async function postInvoiceIssued(
  tx: Tx,
  invoice: { id: string; companyId: string; totalMinor: number; issueDate: Date; invoiceNumber: string },
) {
  const [ar, revenue] = await Promise.all([
    accountIdByCode(tx, ACCOUNT_CODES.accountsReceivable),
    accountIdByCode(tx, ACCOUNT_CODES.serviceRevenue),
  ]);
  return postJournalEntry(tx, {
    entryDate: invoice.issueDate,
    memo: `Invoice ${invoice.invoiceNumber} issued`,
    referenceType: "INVOICE",
    referenceId: invoice.id,
    companyId: invoice.companyId,
    lines: [
      { accountId: ar, debitMinor: invoice.totalMinor },
      { accountId: revenue, creditMinor: invoice.totalMinor },
    ],
  });
}

/** DR Bank / CR Accounts Receivable for money received. */
export async function postPaymentReceived(
  tx: Tx,
  payment: { id: string; companyId: string; amountMinor: number; paidAt: Date; method: PaymentMethod },
) {
  const cashAccount =
    payment.method === "CASH" ? ACCOUNT_CODES.cash : ACCOUNT_CODES.bank;
  const [cash, ar] = await Promise.all([
    accountIdByCode(tx, cashAccount),
    accountIdByCode(tx, ACCOUNT_CODES.accountsReceivable),
  ]);
  return postJournalEntry(tx, {
    entryDate: payment.paidAt,
    memo: "Payment received",
    referenceType: "PAYMENT",
    referenceId: payment.id,
    companyId: payment.companyId,
    lines: [
      { accountId: cash, debitMinor: payment.amountMinor },
      { accountId: ar, creditMinor: payment.amountMinor },
    ],
  });
}

/** DR expense category / CR Bank for an expense. */
export async function postExpense(
  tx: Tx,
  expense: {
    id: string;
    companyId?: string | null;
    categoryAccountId: string;
    amountMinor: number;
    spentAt: Date;
    description: string;
  },
) {
  const bank = await accountIdByCode(tx, ACCOUNT_CODES.bank);
  return postJournalEntry(tx, {
    entryDate: expense.spentAt,
    memo: `Expense: ${expense.description}`,
    referenceType: "EXPENSE",
    referenceId: expense.id,
    companyId: expense.companyId ?? null,
    lines: [
      { accountId: expense.categoryAccountId, debitMinor: expense.amountMinor },
      { accountId: bank, creditMinor: expense.amountMinor },
    ],
  });
}

/**
 * Corrections never edit history: this posts a mirror-image entry and links
 * the original to it via reversed_by_entry_id.
 */
export async function reverseJournalEntry(tx: Tx, entryId: string, memo?: string) {
  const original = await tx.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true },
  });
  if (!original) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Journal entry not found." });
  }
  if (original.reversedByEntryId) {
    throw new TRPCError({ code: "CONFLICT", message: "Entry is already reversed." });
  }

  const reversal = await tx.journalEntry.create({
    data: {
      entryDate: new Date(),
      memo: memo ?? `Reversal of entry ${original.id}`,
      referenceType: original.referenceType,
      referenceId: original.referenceId,
      companyId: original.companyId,
      lines: {
        create: original.lines.map((line) => ({
          accountId: line.accountId,
          debitMinor: line.creditMinor,
          creditMinor: line.debitMinor,
        })),
      },
    },
  });
  await tx.journalEntry.update({
    where: { id: original.id },
    data: { reversedByEntryId: reversal.id },
  });
  return reversal;
}

/** Recomputes an invoice's status from its payments (PAID / PARTIAL / SENT). */
export async function refreshInvoiceStatus(tx: Tx, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice || invoice.status === "VOID" || invoice.status === "DRAFT") return invoice;

  const paid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amountMinor),
    0,
  );
  const total = Number(invoice.totalMinor);
  const status =
    paid >= total && total > 0
      ? "PAID"
      : paid > 0
        ? "PARTIAL"
        : invoice.dueDate && invoice.dueDate < new Date()
          ? "OVERDUE"
          : "SENT";
  return tx.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export type PostedJournalEntry = Prisma.PromiseReturnType<typeof postJournalEntry>;
