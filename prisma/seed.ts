/**
 * Seed script — creates the single user, settings, default chart of accounts,
 * one sample company per billing model, projects, a populated board, a
 * contract, an issued invoice + payment (auto-posted to the journal), an
 * expense, templates and the default automation rule.
 *
 * Idempotent: safe to re-run (skips if the sample company already exists).
 * Admin credentials come from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 */
import argon2 from "argon2";
import { subDays, subMonths } from "date-fns";

import { db } from "~/server/db";
import { logCardActivity } from "~/server/services/activity";
import { ensureDefaultChartOfAccounts } from "~/server/services/accounting/chart-of-accounts";
import {
  postExpense,
  postInvoiceIssued,
  postPaymentReceived,
  refreshInvoiceStatus,
} from "~/server/services/accounting/posting";
import { POSITION_GAP } from "~/lib/position";

/** Deterministic pseudo-random so the seeded heatmap is reproducible. */
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@solova.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-please";

  // ── identity ──────────────────────────────────────────────────────────────
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      displayName: "Freelancer",
    },
  });

  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, freelancerName: "Freelancer", freelancerEmail: adminEmail },
  });

  await ensureDefaultChartOfAccounts(db);

  // ── templates & automation (idempotent by name) ──────────────────────────
  const boardTemplate = { lists: ["To Do", "Doing", "Done"] };
  if (!(await db.boardTemplate.findFirst({ where: { name: "Kanban Basic" } }))) {
    await db.boardTemplate.create({
      data: { name: "Kanban Basic", payload: boardTemplate },
    });
  }
  if (!(await db.cardTemplate.findFirst({ where: { name: "Bug Report" } }))) {
    await db.cardTemplate.create({
      data: {
        name: "Bug Report",
        payload: {
          title: "Bug: ",
          description: "**Steps to reproduce**\n\n1.\n\n**Expected**\n\n**Actual**",
          labels: [{ name: "Bug", color: "#EB5A46" }],
          checklists: [{ title: "Triage", items: ["Reproduce", "Find cause", "Fix", "Verify"] }],
        },
      },
    });
  }
  if (!(await db.automationRule.findFirst({ where: { name: "Complete cards moved to Done" } }))) {
    await db.automationRule.create({
      data: {
        name: "Complete cards moved to Done",
        trigger: "CARD_MOVED_TO_LIST",
        conditions: { listName: "Done" },
        actions: [{ type: "MARK_COMPLETED" }],
      },
    });
  }

  // ── sample business data (skip when already seeded) ───────────────────────
  if (await db.company.findFirst({ where: { name: "Acme Studio" } })) {
    console.log("Sample data already present — seed finished.");
    return;
  }

  const acme = await db.company.create({
    data: {
      name: "Acme Studio",
      legalName: "Acme Studio LLC",
      email: "hello@acmestudio.example",
      website: "https://acmestudio.example",
      country: "United States",
      billingModel: "MONTHLY_RETAINER",
      defaultRateMinor: 250000, // $2,500 retainer
      currencyCode: "USD",
      notes: "Main retainer client — monthly maintenance and feature work.",
    },
  });
  const nimbus = await db.company.create({
    data: {
      name: "Nimbus Labs",
      billingModel: "PER_PROJECT",
      currencyCode: "USD",
      country: "Germany",
    },
  });
  await db.company.create({
    data: {
      name: "Quickfix Co",
      billingModel: "PER_TASK",
      defaultRateMinor: 15000, // $150 per task
      currencyCode: "USD",
      status: "PAUSED",
    },
  });
  const orbit = await db.company.create({
    data: {
      name: "Orbit Media",
      billingModel: "HOURLY",
      defaultRateMinor: 9000, // $90/h
      currencyCode: "USD",
    },
  });

  const contract = await db.contract.create({
    data: {
      companyId: acme.id,
      title: "2026 Maintenance Retainer",
      startDate: subMonths(new Date(), 8),
      valueMinor: 3000000,
      billingPeriod: "MONTHLY",
      monthlyAmountMinor: 250000,
      status: "ACTIVE",
    },
  });

  const website = await db.project.create({
    data: {
      companyId: acme.id,
      name: "Website Redesign",
      description: "Full redesign of the marketing site.",
      startDate: subMonths(new Date(), 3),
      status: "ACTIVE",
      color: "#0079BF",
    },
  });
  await db.projectNote.create({
    data: { projectId: website.id, body: "Client prefers a dark hero section." },
  });
  await db.projectCustomField.create({
    data: {
      projectId: website.id,
      fieldKey: "Staging URL",
      fieldType: "TEXT",
      fieldValue: "https://staging.acmestudio.example",
    },
  });
  await db.project.create({
    data: {
      companyId: nimbus.id,
      name: "Analytics Dashboard",
      startDate: subMonths(new Date(), 1),
      status: "PLANNING",
      color: "#C377E0",
    },
  });

  // ── board with lists, labels and cards ────────────────────────────────────
  const board = await db.board.create({
    data: {
      companyId: acme.id,
      projectId: website.id,
      name: "Website Redesign",
      background: "gradient:brand",
      position: POSITION_GAP,
    },
  });
  const [todo, doing, done] = await Promise.all(
    ["To Do", "Doing", "Done"].map((name, i) =>
      db.list.create({
        data: { boardId: board.id, name, position: (i + 1) * POSITION_GAP },
      }),
    ),
  );
  const [labelDesign, labelDev, labelUrgent] = await Promise.all([
    db.label.create({ data: { boardId: board.id, name: "Design", color: "#C377E0" } }),
    db.label.create({ data: { boardId: board.id, name: "Development", color: "#0079BF" } }),
    db.label.create({ data: { boardId: board.id, name: "Urgent", color: "#EB5A46" } }),
  ]);

  const random = lcg(20260701);
  const cardSpecs: Array<{
    title: string;
    list: { id: string };
    labels: string[];
    completedDaysAgo?: number;
    due?: Date;
    description?: string;
  }> = [
    { title: "Design new homepage hero", list: done!, labels: [labelDesign.id], completedDaysAgo: 45 },
    { title: "Set up staging environment", list: done!, labels: [labelDev.id], completedDaysAgo: 38 },
    { title: "Migrate blog content", list: done!, labels: [labelDev.id], completedDaysAgo: 21 },
    { title: "Implement pricing page", list: done!, labels: [labelDev.id], completedDaysAgo: 9 },
    {
      title: "Build contact form with validation",
      list: doing!,
      labels: [labelDev.id],
      due: subDays(new Date(), -3),
      description: "Use the shared form components.\n\n- [ ] client validation\n- [ ] spam protection",
    },
    { title: "Polish responsive navigation", list: doing!, labels: [labelDesign.id, labelUrgent.id], due: subDays(new Date(), 1) },
    { title: "SEO audit of new pages", list: todo!, labels: [], due: subDays(new Date(), -10) },
    { title: "Performance pass (Core Web Vitals)", list: todo!, labels: [labelDev.id] },
    { title: "Client review meeting notes", list: todo!, labels: [] },
  ];

  let position = POSITION_GAP;
  for (const spec of cardSpecs) {
    position += POSITION_GAP;
    const completedAt = spec.completedDaysAgo
      ? subDays(new Date(), spec.completedDaysAgo)
      : null;
    const card = await db.card.create({
      data: {
        listId: spec.list.id,
        boardId: board.id,
        title: spec.title,
        description: spec.description,
        position,
        dueDate: spec.due,
        isCompleted: Boolean(completedAt),
        completedAt,
        createdAt: subDays(new Date(), (spec.completedDaysAgo ?? 0) + 5),
        labels: { create: spec.labels.map((labelId) => ({ labelId })) },
      },
    });
    await logCardActivity(db, {
      cardId: card.id,
      boardId: board.id,
      action: "CREATED",
      createdAt: subDays(new Date(), (spec.completedDaysAgo ?? 0) + 5),
    });
    if (completedAt) {
      await logCardActivity(db, {
        cardId: card.id,
        boardId: board.id,
        action: "COMPLETED",
        createdAt: completedAt,
      });
    }
  }

  const firstDoing = await db.card.findFirst({ where: { listId: doing!.id } });
  if (firstDoing) {
    const checklist = await db.checklist.create({
      data: { cardId: firstDoing.id, title: "Form fields", position: POSITION_GAP },
    });
    const items = ["Name + email", "Message textarea", "Success state", "Error state"];
    for (const [i, text] of items.entries()) {
      await db.checklistItem.create({
        data: {
          checklistId: checklist.id,
          text,
          isChecked: i < 2,
          position: (i + 1) * POSITION_GAP,
        },
      });
    }
    await db.cardComment.create({
      data: { cardId: firstDoing.id, body: "Client confirmed the field list on the call." },
    });
  }

  // Scatter extra activity over the past ~10 months so the heatmap has texture.
  const seededCards = await db.card.findMany({ where: { boardId: board.id } });
  for (let day = 300; day > 0; day -= 1) {
    if (random() < 0.45) continue; // rest days
    const count = 1 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) {
      const card = seededCards[Math.floor(random() * seededCards.length)]!;
      await logCardActivity(db, {
        cardId: card.id,
        boardId: board.id,
        action: "UPDATED",
        meta: { seeded: true },
        createdAt: subDays(new Date(), day),
      });
    }
  }

  // ── time entries ──────────────────────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const day = Math.floor(random() * 60);
    const hours = 1 + Math.floor(random() * 5);
    const start = subDays(new Date(), day);
    await db.timeEntry.create({
      data: {
        companyId: orbit.id,
        description: "Consulting & implementation",
        startedAt: start,
        endedAt: new Date(start.getTime() + hours * 3600_000),
        durationSeconds: hours * 3600,
        billable: true,
        rateMinor: 9000,
      },
    });
  }

  // ── accounting: invoice → journal, payments → journal, expense → journal ──
  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        companyId: acme.id,
        contractId: contract.id,
        projectId: website.id,
        invoiceNumber: "INV-0001",
        issueDate: subDays(new Date(), 40),
        dueDate: subDays(new Date(), 25),
        status: "SENT",
        subtotalMinor: 250000,
        taxMinor: 0,
        totalMinor: 250000,
        currencyCode: "USD",
        lines: {
          create: [
            {
              description: "Monthly retainer — May 2026",
              quantity: 1,
              unitPriceMinor: 250000,
              amountMinor: 250000,
            },
          ],
        },
      },
    });
    await tx.settings.update({ where: { id: 1 }, data: { nextInvoiceSeq: 2 } });
    await postInvoiceIssued(tx, {
      id: invoice.id,
      companyId: acme.id,
      totalMinor: 250000,
      issueDate: invoice.issueDate,
      invoiceNumber: invoice.invoiceNumber,
    });

    const payment = await tx.payment.create({
      data: {
        companyId: acme.id,
        invoiceId: invoice.id,
        amountMinor: 250000,
        paidAt: subDays(new Date(), 20),
        method: "BANK",
        reference: "SEPA-88213",
      },
    });
    await postPaymentReceived(tx, {
      id: payment.id,
      companyId: acme.id,
      amountMinor: 250000,
      paidAt: payment.paidAt,
      method: payment.method,
    });
    await refreshInvoiceStatus(tx, invoice.id);
  });

  // A few months of historical payments for the income chart.
  for (let m = 1; m <= 6; m++) {
    const amount = 150000 + Math.floor(random() * 8) * 25000;
    await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId: m % 2 === 0 ? acme.id : nimbus.id,
          amountMinor: amount,
          paidAt: subMonths(new Date(), m),
          method: m % 3 === 0 ? "CRYPTO" : "BANK",
        },
      });
      await postPaymentReceived(tx, {
        id: payment.id,
        companyId: payment.companyId,
        amountMinor: amount,
        paidAt: payment.paidAt,
        method: payment.method,
      });
    });
  }

  await db.$transaction(async (tx) => {
    const hosting = await tx.account.findUniqueOrThrow({ where: { code: "5200" } });
    const expense = await tx.expense.create({
      data: {
        categoryAccountId: hosting.id,
        description: "VPS hosting (annual)",
        amountMinor: 14400,
        spentAt: subDays(new Date(), 15),
      },
    });
    await postExpense(tx, {
      id: expense.id,
      categoryAccountId: expense.categoryAccountId,
      amountMinor: 14400,
      spentAt: expense.spentAt,
      description: expense.description,
    });
  });

  console.log("Seed complete.");
  console.log(`Login: ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
