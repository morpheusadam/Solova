import { z } from "zod";

import { isoDate, moneyMinor, uuid } from "./common";

export const accountTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
export const invoiceStatuses = ["DRAFT", "SENT", "PAID", "PARTIAL", "OVERDUE", "VOID"] as const;
export const paymentMethods = ["BANK", "CASH", "CARD", "CRYPTO", "OTHER"] as const;

export const accountInput = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(accountTypes),
  parentId: uuid.optional().nullable(),
});

export const journalLineInput = z.object({
  accountId: uuid,
  debitMinor: moneyMinor.default(0),
  creditMinor: moneyMinor.default(0),
});

export const journalEntryInput = z.object({
  entryDate: isoDate,
  memo: z.string().max(1000).optional(),
  companyId: uuid.optional().nullable(),
  lines: z.array(journalLineInput).min(2, "At least two lines"),
});

export const invoiceLineInput = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(1_000_000),
  unitPriceMinor: moneyMinor,
});

export const invoiceInput = z.object({
  companyId: uuid,
  contractId: uuid.optional().nullable(),
  projectId: uuid.optional().nullable(),
  issueDate: isoDate,
  dueDate: isoDate.optional().nullable(),
  taxMinor: moneyMinor.default(0),
  notes: z.string().max(5000).optional().nullable(),
  lines: z.array(invoiceLineInput).min(1, "At least one line"),
});

export const paymentInput = z.object({
  companyId: uuid,
  invoiceId: uuid.optional().nullable(),
  amountMinor: moneyMinor.refine((v) => v > 0, "Amount must be positive"),
  paidAt: isoDate,
  method: z.enum(paymentMethods).default("BANK"),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const expenseInput = z.object({
  companyId: uuid.optional().nullable(),
  categoryAccountId: uuid,
  description: z.string().min(1).max(500),
  amountMinor: moneyMinor.refine((v) => v > 0, "Amount must be positive"),
  spentAt: isoDate,
  billable: z.boolean().default(false),
  receiptUrl: z.string().optional().nullable(),
});
