import { Prisma } from "@prisma/client";

import { type Tx } from "~/server/db";

/**
 * Financial reports straight from the journal — the ledger is the single
 * source of truth, so P&L and balance sheet always reconcile.
 */

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  balanceMinor: number;
}

/** Profit & loss: revenue (credit-normal) and expenses (debit-normal) in a period. */
export async function profitAndLoss(tx: Tx, input: { from: Date; to: Date }) {
  const rows = await tx.$queryRaw<AccountBalance[]>(Prisma.sql`
    SELECT a."id" AS "accountId", a."code", a."name", a."type"::text AS "type",
           SUM(
             CASE WHEN a."type" = 'REVENUE'
                  THEN l."credit_minor" - l."debit_minor"
                  ELSE l."debit_minor" - l."credit_minor" END
           )::bigint AS "balanceMinor"
      FROM "journal_lines" l
      JOIN "accounts" a ON a."id" = l."account_id"
      JOIN "journal_entries" e ON e."id" = l."entry_id"
     WHERE a."type" IN ('REVENUE', 'EXPENSE')
       AND e."entry_date" >= ${input.from} AND e."entry_date" <= ${input.to}
       AND e."is_posted"
     GROUP BY a."id", a."code", a."name", a."type"
     ORDER BY a."code"
  `);

  const accounts = rows.map((r) => ({ ...r, balanceMinor: Number(r.balanceMinor) }));
  const revenue = accounts
    .filter((r) => r.type === "REVENUE")
    .reduce((s, r) => s + r.balanceMinor, 0);
  const expenses = accounts
    .filter((r) => r.type === "EXPENSE")
    .reduce((s, r) => s + r.balanceMinor, 0);

  return { accounts, revenueMinor: revenue, expensesMinor: expenses, netMinor: revenue - expenses };
}

/** Balance sheet as of a date; net income to date is folded into equity. */
export async function balanceSheet(tx: Tx, input: { asOf: Date }) {
  const rows = await tx.$queryRaw<AccountBalance[]>(Prisma.sql`
    SELECT a."id" AS "accountId", a."code", a."name", a."type"::text AS "type",
           SUM(
             CASE WHEN a."type" IN ('ASSET', 'EXPENSE')
                  THEN l."debit_minor" - l."credit_minor"
                  ELSE l."credit_minor" - l."debit_minor" END
           )::bigint AS "balanceMinor"
      FROM "journal_lines" l
      JOIN "accounts" a ON a."id" = l."account_id"
      JOIN "journal_entries" e ON e."id" = l."entry_id"
     WHERE e."entry_date" <= ${input.asOf} AND e."is_posted"
     GROUP BY a."id", a."code", a."name", a."type"
     ORDER BY a."code"
  `);

  const accounts = rows.map((r) => ({ ...r, balanceMinor: Number(r.balanceMinor) }));
  const sum = (type: string) =>
    accounts.filter((r) => r.type === type).reduce((s, r) => s + r.balanceMinor, 0);

  const assets = sum("ASSET");
  const liabilities = sum("LIABILITY");
  const equity = sum("EQUITY");
  const netIncome = sum("REVENUE") - sum("EXPENSE");

  return {
    assets: accounts.filter((r) => r.type === "ASSET" && r.balanceMinor !== 0),
    liabilities: accounts.filter((r) => r.type === "LIABILITY" && r.balanceMinor !== 0),
    equity: accounts.filter((r) => r.type === "EQUITY" && r.balanceMinor !== 0),
    assetsMinor: assets,
    liabilitiesMinor: liabilities,
    equityMinor: equity + netIncome,
    netIncomeMinor: netIncome,
    balanced: assets === liabilities + equity + netIncome,
  };
}

/** Actual income (received payments) grouped by month or by company. */
export async function incomeReport(
  tx: Tx,
  input: { from: Date; groupBy: "month" | "company" },
) {
  if (input.groupBy === "month") {
    const rows = await tx.$queryRaw<Array<{ month: string; totalMinor: bigint }>>(Prisma.sql`
      SELECT to_char(date_trunc('month', "paid_at"), 'YYYY-MM') AS month,
             SUM("amount_minor")::bigint AS "totalMinor"
        FROM "payments"
       WHERE "paid_at" >= ${input.from}
       GROUP BY 1
       ORDER BY 1
    `);
    return rows.map((r) => ({ key: r.month, totalMinor: Number(r.totalMinor) }));
  }

  const rows = await tx.$queryRaw<Array<{ name: string; totalMinor: bigint }>>(Prisma.sql`
    SELECT c."name", SUM(p."amount_minor")::bigint AS "totalMinor"
      FROM "payments" p
      JOIN "companies" c ON c."id" = p."company_id"
     WHERE p."paid_at" >= ${input.from}
     GROUP BY c."name"
     ORDER BY 2 DESC
  `);
  return rows.map((r) => ({ key: r.name, totalMinor: Number(r.totalMinor) }));
}
