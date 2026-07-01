import { z } from "zod";

import { settingsInput } from "~/schemas/settings";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.settings.findUnique({ where: { id: 1 } });
    return settings ?? (await ctx.db.settings.create({ data: { id: 1 } }));
  }),

  update: protectedProcedure
    .input(settingsInput.partial())
    .mutation(({ ctx, input }) =>
      ctx.db.settings.update({ where: { id: 1 }, data: input }),
    ),

  /** Full JSON export of every module — the "Export all data" backup action. */
  exportAll: protectedProcedure.mutation(async ({ ctx }) => {
    const [
      settings,
      companies,
      contracts,
      projects,
      projectNotes,
      projectCustomFields,
      boards,
      lists,
      cards,
      labels,
      cardLabels,
      checklists,
      checklistItems,
      cardComments,
      cardAttachments,
      cardActivity,
      timeEntries,
      accounts,
      journalEntries,
      journalLines,
      invoices,
      invoiceLines,
      payments,
      expenses,
      automationRules,
      cardTemplates,
      boardTemplates,
    ] = await Promise.all([
      ctx.db.settings.findMany(),
      ctx.db.company.findMany(),
      ctx.db.contract.findMany(),
      ctx.db.project.findMany(),
      ctx.db.projectNote.findMany(),
      ctx.db.projectCustomField.findMany(),
      ctx.db.board.findMany(),
      ctx.db.list.findMany(),
      ctx.db.card.findMany(),
      ctx.db.label.findMany(),
      ctx.db.cardLabel.findMany(),
      ctx.db.checklist.findMany(),
      ctx.db.checklistItem.findMany(),
      ctx.db.cardComment.findMany(),
      ctx.db.cardAttachment.findMany(),
      ctx.db.cardActivity.findMany(),
      ctx.db.timeEntry.findMany(),
      ctx.db.account.findMany(),
      ctx.db.journalEntry.findMany(),
      ctx.db.journalLine.findMany(),
      ctx.db.invoice.findMany(),
      ctx.db.invoiceLine.findMany(),
      ctx.db.payment.findMany(),
      ctx.db.expense.findMany(),
      ctx.db.automationRule.findMany(),
      ctx.db.cardTemplate.findMany(),
      ctx.db.boardTemplate.findMany(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: {
        settings,
        companies,
        contracts,
        projects,
        projectNotes,
        projectCustomFields,
        boards,
        lists,
        cards,
        labels,
        cardLabels,
        checklists,
        checklistItems,
        cardComments,
        cardAttachments,
        cardActivity,
        timeEntries,
        accounts,
        journalEntries,
        journalLines,
        invoices,
        invoiceLines,
        payments,
        expenses,
        automationRules,
        cardTemplates,
        boardTemplates,
      },
    };
  }),

  // ── automation rules management (Phase 9 surface lives in Settings) ──────
  automationRules: protectedProcedure.query(({ ctx }) =>
    ctx.db.automationRule.findMany({ orderBy: { createdAt: "asc" } }),
  ),

  toggleAutomationRule: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isEnabled: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.automationRule.update({
        where: { id: input.id },
        data: { isEnabled: input.isEnabled },
      }),
    ),
});
