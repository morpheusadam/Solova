import { z } from "zod";

import { isoDate, moneyMinor, uuid } from "./common";

export const contractStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export const contractBillingPeriods = ["MONTHLY", "ONE_TIME", "MILESTONE"] as const;

export const contractInput = z.object({
  companyId: uuid,
  title: z.string().min(1, "Title is required").max(200),
  startDate: isoDate.optional().nullable(),
  endDate: isoDate.optional().nullable(),
  valueMinor: moneyMinor.optional().nullable(),
  billingPeriod: z.enum(contractBillingPeriods).optional().nullable(),
  monthlyAmountMinor: moneyMinor.optional().nullable(),
  status: z.enum(contractStatuses).default("DRAFT"),
  fileUrl: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type ContractInput = z.infer<typeof contractInput>;
