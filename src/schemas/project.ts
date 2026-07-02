import { z } from "zod";

import { billingModels } from "./company";
import { hexColor, isoDate, moneyMinor, uuid } from "./common";

export const projectStatuses = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "DONE",
  "CANCELLED",
] as const;

export const customFieldTypes = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"] as const;

export const projectInput = z.object({
  companyId: uuid,
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  startDate: isoDate,
  dueDate: isoDate.optional().nullable(),
  status: z.enum(projectStatuses).default("PLANNING"),
  color: hexColor.optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  // Per-project pricing (null = inherit the company defaults)
  billingModel: z.enum(billingModels).optional().nullable(),
  rateMinor: moneyMinor.optional().nullable(),
  currencyCode: z.string().length(3).optional().nullable(),
});

export const customFieldInput = z.object({
  projectId: uuid,
  fieldKey: z.string().min(1).max(100),
  fieldType: z.enum(customFieldTypes),
  fieldValue: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
  options: z.array(z.string()).optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectInput>;
