import { z } from "zod";

export const uuid = z.string().uuid();

export const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

/** Money input: integer minor units, non-negative. */
export const moneyMinor = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const isoDate = z.coerce.date();

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB hex color");
