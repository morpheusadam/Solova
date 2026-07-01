import { type AccountType, type NormalBalance } from "@prisma/client";

import { type Tx } from "~/server/db";

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  children?: AccountSeed[];
}

/** Default chart of accounts, created once on first run / seed. */
const DEFAULT_CHART: AccountSeed[] = [
  {
    code: "1000",
    name: "Assets",
    type: "ASSET",
    normalBalance: "DEBIT",
    children: [
      { code: "1100", name: "Cash", type: "ASSET", normalBalance: "DEBIT" },
      { code: "1110", name: "Bank", type: "ASSET", normalBalance: "DEBIT" },
      { code: "1200", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
    ],
  },
  {
    code: "2000",
    name: "Liabilities",
    type: "LIABILITY",
    normalBalance: "CREDIT",
    children: [
      { code: "2100", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT" },
      { code: "2200", name: "Taxes Payable", type: "LIABILITY", normalBalance: "CREDIT" },
    ],
  },
  {
    code: "3000",
    name: "Equity",
    type: "EQUITY",
    normalBalance: "CREDIT",
    children: [
      { code: "3100", name: "Owner's Equity", type: "EQUITY", normalBalance: "CREDIT" },
    ],
  },
  {
    code: "4000",
    name: "Revenue",
    type: "REVENUE",
    normalBalance: "CREDIT",
    children: [
      { code: "4100", name: "Service Revenue", type: "REVENUE", normalBalance: "CREDIT" },
      { code: "4200", name: "Product Sales", type: "REVENUE", normalBalance: "CREDIT" },
    ],
  },
  {
    code: "5000",
    name: "Expenses",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    children: [
      { code: "5100", name: "Software", type: "EXPENSE", normalBalance: "DEBIT" },
      { code: "5200", name: "Hosting", type: "EXPENSE", normalBalance: "DEBIT" },
      { code: "5300", name: "Fees", type: "EXPENSE", normalBalance: "DEBIT" },
      { code: "5900", name: "Miscellaneous", type: "EXPENSE", normalBalance: "DEBIT" },
    ],
  },
];

/** Idempotent: creates any missing default accounts, never touches existing ones. */
export async function ensureDefaultChartOfAccounts(tx: Tx) {
  for (const root of DEFAULT_CHART) {
    const parent = await tx.account.upsert({
      where: { code: root.code },
      update: {},
      create: {
        code: root.code,
        name: root.name,
        type: root.type,
        normalBalance: root.normalBalance,
      },
    });
    for (const child of root.children ?? []) {
      await tx.account.upsert({
        where: { code: child.code },
        update: {},
        create: {
          code: child.code,
          name: child.name,
          type: child.type,
          normalBalance: child.normalBalance,
          parentId: parent.id,
        },
      });
    }
  }
}
