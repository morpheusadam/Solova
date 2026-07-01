import { z } from "zod";

import { moneyMinor } from "./common";

export const billingModels = [
  "MONTHLY_RETAINER",
  "PER_PROJECT",
  "PER_TASK",
  "HOURLY",
] as const;

export const companyStatuses = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;

export const companyInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  legalName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  billingModel: z.enum(billingModels),
  defaultRateMinor: moneyMinor.optional().nullable(),
  currencyCode: z.string().length(3).optional().nullable(),
  status: z.enum(companyStatuses).default("ACTIVE"),
});

export type CompanyInput = z.infer<typeof companyInput>;
