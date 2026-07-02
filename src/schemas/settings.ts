import { z } from "zod";

import { hexColor } from "./common";

export const themes = ["LIGHT", "DARK", "SYSTEM"] as const;

export const settingsInput = z.object({
  baseCurrency: z.string().length(3),
  locale: z.string().min(2).max(20),
  timezone: z.string().min(1).max(60),
  dateFormat: z.string().min(1).max(30),
  freelancerName: z.string().max(120),
  freelancerEmail: z.string().email().or(z.literal("")),
  invoicePrefix: z.string().min(1).max(12),
  labelPalette: z.array(hexColor).min(1).max(20),
  theme: z.enum(themes),
  appBackground: z.string().max(60).nullable(),
  appLogoUrl: z.string().max(500).nullable(),
});

export type SettingsInput = z.infer<typeof settingsInput>;
