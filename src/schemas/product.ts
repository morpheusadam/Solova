import { z } from "zod";

import { moneyMinor, uuid } from "./common";

export const productTypes = ["GOOD", "SERVICE"] as const;

export const productInput = z.object({
  sku: z.string().max(60).optional().nullable().or(z.literal("").transform(() => null)),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(productTypes).default("SERVICE"),
  unitPriceMinor: moneyMinor.default(0),
  currencyCode: z.string().length(3).optional().nullable(),
  taxRatePct: z.number().min(0).max(100).default(0),
  incomeAccountId: uuid.optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productInput>;
