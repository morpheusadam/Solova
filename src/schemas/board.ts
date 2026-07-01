import { z } from "zod";

import { hexColor, isoDate, uuid } from "./common";

export const boardInput = z.object({
  companyId: uuid,
  projectId: uuid.optional().nullable(),
  name: z.string().min(1, "Name is required").max(200),
  background: z.string().max(200).optional().nullable(),
});

export const listInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(120),
});

export const cardCreateInput = z.object({
  listId: uuid,
  title: z.string().min(1, "Title is required").max(500),
});

export const cardUpdateInput = z.object({
  id: uuid,
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20000).optional().nullable(),
  dueDate: isoDate.optional().nullable(),
  startDate: isoDate.optional().nullable(),
  cover: z.string().max(200).optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export const cardMoveInput = z.object({
  cardId: uuid,
  toListId: uuid,
  /** Fractional position computed client-side from drop neighbours. */
  position: z.number().finite().positive(),
});

export const labelInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(60),
  color: hexColor,
});

export const checklistItemInput = z.object({
  checklistId: uuid,
  text: z.string().min(1).max(500),
  dueDate: isoDate.optional().nullable(),
});
