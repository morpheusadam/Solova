import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { uuid } from "~/schemas/common";
import { customFieldInput, projectInput, projectStatuses } from "~/schemas/project";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          companyId: uuid.optional(),
          status: z.enum(projectStatuses).optional(),
          search: z.string().max(200).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      ctx.db.project.findMany({
        where: {
          companyId: input?.companyId,
          status: input?.status,
          name: input?.search
            ? { contains: input.search, mode: "insensitive" }
            : undefined,
        },
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { boards: true, notes: true } },
        },
      }),
    ),

  byId: protectedProcedure.input(uuid).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUnique({
      where: { id: input },
      include: {
        company: { select: { id: true, name: true } },
        notes: { orderBy: { createdAt: "desc" } },
        customFields: { orderBy: { createdAt: "asc" } },
        boards: {
          where: { archivedAt: null },
          orderBy: { position: "asc" },
          select: { id: true, name: true, background: true },
        },
      },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    return project;
  }),

  create: protectedProcedure.input(projectInput).mutation(({ ctx, input }) =>
    ctx.db.project.create({ data: input }),
  ),

  update: protectedProcedure
    .input(z.object({ id: uuid, data: projectInput.partial() }))
    .mutation(({ ctx, input }) =>
      ctx.db.project.update({ where: { id: input.id }, data: input.data }),
    ),

  delete: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.project.delete({ where: { id: input } });
    return { ok: true };
  }),

  addNote: protectedProcedure
    .input(z.object({ projectId: uuid, body: z.string().min(1).max(10000) }))
    .mutation(({ ctx, input }) => ctx.db.projectNote.create({ data: input })),

  deleteNote: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.projectNote.delete({ where: { id: input } });
    return { ok: true };
  }),

  setCustomField: protectedProcedure
    .input(customFieldInput)
    .mutation(({ ctx, input }) =>
      ctx.db.projectCustomField.upsert({
        where: {
          projectId_fieldKey: { projectId: input.projectId, fieldKey: input.fieldKey },
        },
        update: {
          fieldType: input.fieldType,
          fieldValue: input.fieldValue ?? undefined,
          options: input.options ?? undefined,
        },
        create: {
          projectId: input.projectId,
          fieldKey: input.fieldKey,
          fieldType: input.fieldType,
          fieldValue: input.fieldValue ?? undefined,
          options: input.options ?? undefined,
        },
      }),
    ),

  deleteCustomField: protectedProcedure.input(uuid).mutation(async ({ ctx, input }) => {
    await ctx.db.projectCustomField.delete({ where: { id: input } });
    return { ok: true };
  }),
});
