import { z } from "zod";

import { uuid } from "./common";

const optionalText = (max: number) =>
  z.string().max(max).optional().nullable().or(z.literal("").transform(() => null));

export const contactInput = z.object({
  companyId: uuid,
  name: z.string().min(1, "Name is required").max(200),
  role: optionalText(120),
  email: z.string().email().optional().nullable().or(z.literal("").transform(() => null)),
  phone: optionalText(50),
  mobile: optionalText(50),
  whatsapp: optionalText(50),
  telegram: optionalText(80),
  website: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
  address: optionalText(500),
  notes: optionalText(2000),
  isPrimary: z.boolean().default(false),
});

export type ContactInput = z.infer<typeof contactInput>;
