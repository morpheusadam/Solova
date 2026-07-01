import { z } from "zod";

import { isoDate, moneyMinor, uuid } from "./common";

export const timeEntryInput = z.object({
  companyId: uuid,
  projectId: uuid.optional().nullable(),
  cardId: uuid.optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  startedAt: isoDate,
  endedAt: isoDate.optional().nullable(),
  durationSeconds: z.number().int().min(0).max(24 * 3600 * 30),
  billable: z.boolean().default(true),
  rateMinor: moneyMinor.optional().nullable(),
});

export type TimeEntryInput = z.infer<typeof timeEntryInput>;
