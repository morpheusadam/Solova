import { z } from "zod";

export const noteInput = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(10000).default(""),
  color: z.string().max(20).default("#F2D600"),
  pinned: z.boolean().default(false),
});

export type NoteInput = z.infer<typeof noteInput>;
