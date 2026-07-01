import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ensureDefaultChartOfAccounts } from "~/server/services/accounting/chart-of-accounts";
import {
  postInvoiceIssued,
  postJournalEntry,
  postPaymentReceived,
  refreshInvoiceStatus,
  reverseJournalEntry,
} from "~/server/services/accounting/posting";

import { testDb, truncateAll } from "./helpers";

async function account(code: string) {
  return testDb.account.findUniqueOrThrow({ where: { code } });
}

describe("double-entry accounting core (spec §4.2, §12.3, §12.4)", () => {
  beforeEach(async () => {
    await truncateAll();
    await ensureDefaultChartOfAccounts(testDb);
  });
  afterAll(() => testDb.$disconnect());

  it("rejects an unbalanced journal entry at the service layer", async () => {
    const bank = await account("1110");
    const revenue = await account("4100");

    await expect(
      testDb.$transaction((tx) =>
        postJournalEntry(tx, {
          entryDate: new Date(),
          referenceType: "MANUAL",
          lines: [
            { accountId: bank.id, debitMinor: 1000 },
            { accountId: revenue.id, creditMinor: 900 },
          ],
        }),
      ),
    ).rejects.toThrow(/not balanced/i);
    expect(await testDb.journalEntry.count()).toBe(0);
  });

  it("rejects an unbalanced entry at the DATABASE level (trigger backstop)", async () => {
    const bank = await account("1110");

    await expect(
      testDb.$transaction(async (tx) => {
        const entry = await tx.journalEntry.create({
          data: { entryDate: new Date(), referenceType: "MANUAL" },
        });
        await tx.journalLine.create({
          data: { entryId: entry.id, accountId: bank.id, debitMinor: 500n },
        });
        // no matching credit — the deferred trigger must abort the commit
      }),
    ).rejects.toThrow(/not balanced/i);
    expect(await testDb.journalEntry.count()).toBe(0);
  });

  it("accepts a balanced entry and SUM(debits) = SUM(credits)", async () => {
    const bank = await account("1110");
    const revenue = await account("4100");

    await testDb.$transaction((tx) =>
      postJournalEntry(tx, {
        entryDate: new Date(),
        referenceType: "MANUAL",
        memo: "test",
        lines: [
          { accountId: bank.id, debitMinor: 12345 },
          { accountId: revenue.id, creditMinor: 12345 },
        ],
      }),
    );

    const [sums] = await testDb.$queryRawUnsafe<
      Array<{ debits: bigint; credits: bigint }>
    >(`SELECT SUM(debit_minor) AS debits, SUM(credit_minor) AS credits FROM journal_lines`);
    expect(String(sums!.debits)).toBe("12345");
    expect(String(sums!.credits)).toBe("12345");
  });

  it("journal is append-only: updates and deletes are blocked", async () => {
    const bank = await account("1110");
    const revenue = await account("4100");
    const entry = await testDb.$transaction((tx) =>
      postJournalEntry(tx, {
        entryDate: new Date(),
        referenceType: "MANUAL",
        lines: [
          { accountId: bank.id, debitMinor: 100 },
          { accountId: revenue.id, creditMinor: 100 },
        ],
      }),
    );

    await expect(
      testDb.journalLine.update({
        where: { id: entry.lines[0]!.id },
        data: { debitMinor: 200n },
      }),
    ).rejects.toThrow(/append-only/i);
    await expect(
      testDb.journalEntry.delete({ where: { id: entry.id } }),
    ).rejects.toThrow(/append-only/i);
  });

  it("corrections are reversing entries that mirror debit/credit", async () => {
    const bank = await account("1110");
    const revenue = await account("4100");
    const entry = await testDb.$transaction((tx) =>
      postJournalEntry(tx, {
        entryDate: new Date(),
        referenceType: "MANUAL",
        lines: [
          { accountId: bank.id, debitMinor: 700 },
          { accountId: revenue.id, creditMinor: 700 },
        ],
      }),
    );

    const reversal = await testDb.$transaction((tx) =>
      reverseJournalEntry(tx, entry.id),
    );
    const lines = await testDb.journalLine.findMany({
      where: { entryId: reversal.id },
    });
    expect(lines.find((l) => l.accountId === bank.id)?.creditMinor).toBe(700n);
    expect(lines.find((l) => l.accountId === revenue.id)?.debitMinor).toBe(700n);

    const original = await testDb.journalEntry.findUnique({ where: { id: entry.id } });
    expect(original?.reversedByEntryId).toBe(reversal.id);
  });

  it("issuing an invoice posts DR AR / CR Revenue; payment posts DR Bank / CR AR and flips status", async () => {
    const company = await testDb.company.create({
      data: { name: "Posting Co", billingModel: "HOURLY" },
    });
    const ar = await account("1200");
    const revenue = await account("4100");
    const bank = await account("1110");

    const invoice = await testDb.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          companyId: company.id,
          invoiceNumber: "INV-T100",
          issueDate: new Date(),
          status: "SENT",
          subtotalMinor: 50000n,
          totalMinor: 50000n,
          currencyCode: "USD",
        },
      });
      await postInvoiceIssued(tx, {
        id: inv.id,
        companyId: company.id,
        totalMinor: 50000,
        issueDate: inv.issueDate,
        invoiceNumber: inv.invoiceNumber,
      });
      return inv;
    });

    const issueEntry = await testDb.journalEntry.findFirstOrThrow({
      where: { referenceType: "INVOICE", referenceId: invoice.id },
      include: { lines: true },
    });
    expect(issueEntry.lines.find((l) => l.accountId === ar.id)?.debitMinor).toBe(50000n);
    expect(issueEntry.lines.find((l) => l.accountId === revenue.id)?.creditMinor).toBe(50000n);

    await testDb.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId: company.id,
          invoiceId: invoice.id,
          amountMinor: 50000n,
          paidAt: new Date(),
          method: "BANK",
        },
      });
      await postPaymentReceived(tx, {
        id: payment.id,
        companyId: company.id,
        amountMinor: 50000,
        paidAt: payment.paidAt,
        method: payment.method,
      });
      await refreshInvoiceStatus(tx, invoice.id);
    });

    const paymentEntry = await testDb.journalEntry.findFirstOrThrow({
      where: { referenceType: "PAYMENT" },
      include: { lines: true },
    });
    expect(paymentEntry.lines.find((l) => l.accountId === bank.id)?.debitMinor).toBe(50000n);
    expect(paymentEntry.lines.find((l) => l.accountId === ar.id)?.creditMinor).toBe(50000n);

    const updated = await testDb.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updated.status).toBe("PAID");
  });
});
