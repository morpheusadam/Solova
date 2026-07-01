"use client";

import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { useState } from "react";

import { MoneyText } from "~/components/shared/money";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type Period = "THIS_MONTH" | "THIS_YEAR";

function range(period: Period) {
  const now = new Date();
  return period === "THIS_MONTH"
    ? { from: startOfMonth(now), to: endOfMonth(now) }
    : { from: startOfYear(now), to: endOfYear(now) };
}

export function ReportsTab() {
  const [period, setPeriod] = useState<Period>("THIS_YEAR");
  const { from, to } = range(period);

  const { data: pnl, isLoading: pnlLoading } = api.accounting.pnl.useQuery({ from, to });
  const { data: sheet, isLoading: sheetLoading } = api.accounting.balanceSheet.useQuery({
    asOf: new Date(),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass-card p-4" aria-label="Profit and loss">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">Profit &amp; Loss</h3>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger aria-label="Report period" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THIS_MONTH">This month</SelectItem>
              <SelectItem value="THIS_YEAR">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {pnlLoading || !pnl ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <table className="w-full text-md">
              <tbody>
                {pnl.accounts.map((a) => (
                  <tr key={a.accountId} className="border-b border-line-glass-subtle">
                    <td className="py-2 text-ink-secondary">
                      <span className="me-2 font-mono text-sm text-ink-subtle">{a.code}</span>
                      {a.name}
                    </td>
                    <td className="py-2 text-end font-medium text-ink">
                      <MoneyText minor={a.balanceMinor} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-medium text-ink-secondary">Revenue</td>
                  <td className="pt-3 text-end font-semibold text-ink-success">
                    <MoneyText minor={pnl.revenueMinor} />
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-medium text-ink-secondary">Expenses</td>
                  <td className="py-1 text-end font-semibold text-ink-danger">
                    <MoneyText minor={pnl.expensesMinor} />
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="pt-2 text-lg font-semibold text-ink">Net income</td>
                  <td
                    className={`pt-2 text-end text-lg font-bold ${pnl.netMinor >= 0 ? "text-ink-success" : "text-ink-danger"}`}
                  >
                    <MoneyText minor={pnl.netMinor} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </section>

      <section className="glass-card p-4" aria-label="Balance sheet">
        <h3 className="mb-3 font-semibold text-ink">Balance sheet (today)</h3>
        {sheetLoading || !sheet ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-4 text-md">
            {(
              [
                ["Assets", sheet.assets, sheet.assetsMinor],
                ["Liabilities", sheet.liabilities, sheet.liabilitiesMinor],
                ["Equity (incl. net income)", sheet.equity, sheet.equityMinor],
              ] as const
            ).map(([title, rows, total]) => (
              <div key={title}>
                <h4 className="mb-1 text-sm font-semibold tracking-wide text-ink-subtle uppercase">
                  {title}
                </h4>
                {rows.map((a) => (
                  <div
                    key={a.accountId}
                    className="flex justify-between border-b border-line-glass-subtle py-1.5"
                  >
                    <span className="text-ink-secondary">
                      <span className="me-2 font-mono text-sm text-ink-subtle">{a.code}</span>
                      {a.name}
                    </span>
                    <MoneyText minor={a.balanceMinor} className="font-medium text-ink" />
                  </div>
                ))}
                <div className="flex justify-between py-1.5 font-semibold text-ink">
                  <span>Total</span>
                  <MoneyText minor={total} />
                </div>
              </div>
            ))}
            <p
              className={`rounded-sm px-3 py-2 text-sm ${sheet.balanced ? "bg-status-success" : "bg-status-danger"} text-ink`}
            >
              {sheet.balanced
                ? "Assets = Liabilities + Equity — the books balance."
                : "Warning: the books do not balance!"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
