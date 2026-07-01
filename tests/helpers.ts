import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { POSITION_GAP } from "~/lib/position";

config();

/** Prisma client bound to the test database. */
export const testDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

/** Wipes all data between tests (accounting triggers require session_replication_role). */
export async function truncateAll() {
  // Disable triggers for cleanup only — the append-only ledger would
  // otherwise (correctly) refuse to delete journal rows.
  await testDb.$executeRawUnsafe(`SET session_replication_role = replica`);
  const tables = await testDb.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  for (const { tablename } of tables) {
    await testDb.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
  await testDb.$executeRawUnsafe(`SET session_replication_role = DEFAULT`);
}

/** company → board → lists → cards fixture used by the cascade tests. */
export async function createCompanyTree() {
  const company = await testDb.company.create({
    data: { name: "Cascade Test Co", billingModel: "PER_PROJECT" },
  });
  const project = await testDb.project.create({
    data: { companyId: company.id, name: "Cascade Project", startDate: new Date() },
  });
  const contract = await testDb.contract.create({
    data: { companyId: company.id, title: "Cascade Contract" },
  });
  const board = await testDb.board.create({
    data: {
      companyId: company.id,
      projectId: project.id,
      name: "Cascade Board",
      position: POSITION_GAP,
    },
  });
  const lists = await Promise.all(
    ["To Do", "Doing", "Done"].map((name, i) =>
      testDb.list.create({
        data: { boardId: board.id, name, position: (i + 1) * POSITION_GAP },
      }),
    ),
  );
  const cards = [];
  for (const [i, list] of lists.entries()) {
    for (let c = 0; c < 3; c++) {
      cards.push(
        await testDb.card.create({
          data: {
            listId: list.id,
            boardId: board.id,
            title: `Card ${i}-${c}`,
            position: (c + 1) * POSITION_GAP,
          },
        }),
      );
    }
  }
  const label = await testDb.label.create({
    data: { boardId: board.id, name: "Test", color: "#0079BF" },
  });
  await testDb.cardLabel.create({
    data: { cardId: cards[0]!.id, labelId: label.id },
  });
  const checklist = await testDb.checklist.create({
    data: { cardId: cards[0]!.id, title: "cl", position: POSITION_GAP },
  });
  await testDb.checklistItem.create({
    data: { checklistId: checklist.id, text: "item", position: POSITION_GAP },
  });
  await testDb.cardComment.create({ data: { cardId: cards[0]!.id, body: "hi" } });
  await testDb.cardActivity.create({
    data: { cardId: cards[0]!.id, boardId: board.id, action: "CREATED" },
  });

  return { company, project, contract, board, lists, cards };
}
