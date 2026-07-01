import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createCompanyTree, testDb, truncateAll } from "./helpers";

describe("deletion cascades (spec §4)", () => {
  beforeEach(truncateAll);
  afterAll(() => testDb.$disconnect());

  it("deleting a company deletes its boards, lists, cards, projects and contracts", async () => {
    const { company } = await createCompanyTree();

    await testDb.company.delete({ where: { id: company.id } });

    expect(await testDb.board.count({ where: { companyId: company.id } })).toBe(0);
    expect(await testDb.list.count()).toBe(0);
    expect(await testDb.card.count()).toBe(0);
    expect(await testDb.project.count({ where: { companyId: company.id } })).toBe(0);
    expect(await testDb.contract.count({ where: { companyId: company.id } })).toBe(0);
    // deep children are gone too
    expect(await testDb.label.count()).toBe(0);
    expect(await testDb.cardLabel.count()).toBe(0);
    expect(await testDb.checklist.count()).toBe(0);
    expect(await testDb.checklistItem.count()).toBe(0);
    expect(await testDb.cardComment.count()).toBe(0);
    expect(await testDb.cardActivity.count()).toBe(0);
  });

  it("deleting a board deletes its lists and cards (company survives)", async () => {
    const { company, board } = await createCompanyTree();

    await testDb.board.delete({ where: { id: board.id } });

    expect(await testDb.list.count({ where: { boardId: board.id } })).toBe(0);
    expect(await testDb.card.count({ where: { boardId: board.id } })).toBe(0);
    expect(await testDb.company.count({ where: { id: company.id } })).toBe(1);
    expect(await testDb.project.count({ where: { companyId: company.id } })).toBe(1);
  });

  it("deleting a company with invoices is RESTRICTED (financial history is protected)", async () => {
    const { company } = await createCompanyTree();
    await testDb.invoice.create({
      data: {
        companyId: company.id,
        invoiceNumber: "INV-T1",
        issueDate: new Date(),
        currencyCode: "USD",
        totalMinor: 1000n,
      },
    });

    await expect(
      testDb.company.delete({ where: { id: company.id } }),
    ).rejects.toThrow();
  });
});
