"use client";

import {
  Building2,
  Clock,
  FolderKanban,
  ListTodo,
  Receipt,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Heatmap } from "~/components/dashboard/heatmap";
import { MoneyText, useMoney } from "~/components/shared/money";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const DONUT_COLORS = ["#0079BF", "#61BD4F"];

const BILLING_SHORT: Record<string, string> = {
  MONTHLY_RETAINER: "retainer",
  PER_PROJECT: "per project",
  PER_TASK: "per task",
  HOURLY: "hourly",
};

export function DashboardView() {
  const money = useMoney();
  const { data: heatmap, isLoading: heatmapLoading } = api.dashboard.heatmap.useQuery();
  const { data: stats } = api.dashboard.taskStats.useQuery({});
  const { data: income } = api.dashboard.income.useQuery();
  const { data: quick } = api.dashboard.quickStats.useQuery();

  return (
    <>
      <PageHeader title="Dashboard" description="Your work and money at a glance." />

      {/* quick tiles (spec §6.4) */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(
          [
            [Building2, "Active companies", quick?.activeCompanies],
            [FolderKanban, "Active projects", quick?.activeProjects],
            [ListTodo, "Open tasks", quick?.openTasks],
            [Receipt, "Unpaid invoices", quick?.unpaidInvoices],
            [Clock, "Hours this month", income?.hoursThisMonth],
          ] as const
        ).map(([Icon, label, value]) => (
          <div key={label} className="glass-card flex items-center gap-3 p-4">
            <Icon aria-hidden className="size-5 shrink-0 text-icon-brand" />
            <div>
              <p className="text-2xl leading-tight font-semibold text-ink">
                {value ?? "—"}
              </p>
              <p className="text-sm text-ink-subtle">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* heatmap (spec §6.1) */}
      <section aria-label="Activity heatmap" className="glass-card mb-4 p-4">
        <h2 className="mb-3 font-semibold text-ink">Activity — last 12 months</h2>
        {heatmapLoading || !heatmap ? (
          <Skeleton className="h-32" />
        ) : (
          <Heatmap days={heatmap} />
        )}
      </section>

      {/* task charts (spec §6.2) */}
      <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="glass-card p-4" aria-label="Open versus closed tasks">
          <h3 className="mb-2 font-semibold text-ink">Open vs closed</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: "Open", value: stats?.open ?? 0 },
                    { name: "Closed", value: stats?.closed ?? 0 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  strokeWidth={0}
                >
                  <Cell fill={DONUT_COLORS[0]} />
                  <Cell fill={DONUT_COLORS[1]} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4" aria-label="Cards by list">
          <h3 className="mb-2 font-semibold text-ink">Cards by list</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={stats?.byList ?? []} layout="vertical" margin={{ left: 4 }}>
                <XAxis type="number" allowDecimals={false} stroke="var(--fg-subtle)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke="var(--fg-subtle)"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip cursor={{ fill: "var(--surface-selected)" }} />
                <Bar dataKey="count" fill="#0079BF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4" aria-label="Cards by label">
          <h3 className="mb-2 font-semibold text-ink">Cards by label</h3>
          <div className="h-48">
            {!stats?.byLabel.length ? (
              <p className="pt-14 text-center text-md text-ink-subtle">No labels yet.</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={stats.byLabel} layout="vertical" margin={{ left: 4 }}>
                  <XAxis type="number" allowDecimals={false} stroke="var(--fg-subtle)" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="var(--fg-subtle)"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip cursor={{ fill: "var(--surface-selected)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.byLabel.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="glass-card p-4" aria-label="Due date summary">
          <h3 className="mb-2 font-semibold text-ink">Due dates</h3>
          <div className="grid h-48 content-center gap-3">
            <div className="glass-chip !rounded-md px-3 py-3 text-center">
              <p className="text-3xl font-bold text-ink-danger">{stats?.overdue ?? 0}</p>
              <p className="text-sm text-ink-subtle">Overdue</p>
            </div>
            <div className="glass-chip !rounded-md px-3 py-3 text-center">
              <p className="text-3xl font-bold text-ink-warning">{stats?.dueSoon ?? 0}</p>
              <p className="text-sm text-ink-subtle">Due in 7 days</p>
            </div>
          </div>
        </section>
      </div>

      {/* income (spec §6.3) */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="glass-card p-4" aria-label="Recent payments">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold text-ink">Income</h3>
            <p className="text-sm text-ink-subtle">
              this month{" "}
              <strong className="text-ink">
                <MoneyText minor={income?.thisMonthMinor ?? 0} />
              </strong>
            </p>
          </div>
          {!income?.recentPayments.length ? (
            <p className="text-md text-ink-subtle">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-default)]">
              {income.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium text-ink">{p.company.name}</p>
                    <p className="text-sm text-ink-subtle">
                      {new Date(p.paidAt).toLocaleDateString()} · {p.method.toLowerCase()}
                    </p>
                  </div>
                  <MoneyText minor={p.amountMinor} className="font-semibold text-ink" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card p-4" aria-label="Income per month">
          <h3 className="mb-3 font-semibold text-ink">Income per month</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={income?.monthlyIncome ?? []}>
                <XAxis dataKey="key" stroke="var(--fg-subtle)" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="var(--fg-subtle)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => money.format(v).replace(/\.\d+/, "")}
                  width={72}
                />
                <Tooltip
                  formatter={(value) => money.format(Number(value))}
                  cursor={{ fill: "var(--surface-selected)" }}
                />
                <Bar dataKey="totalMinor" name="Received" fill="#61BD4F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card p-4" aria-label="Expected versus actual per company">
          <h3 className="mb-3 font-semibold text-ink">Per company — expected vs actual</h3>
          {!income?.perCompany.length ? (
            <p className="text-md text-ink-subtle">No active companies.</p>
          ) : (
            <ul className="space-y-3">
              {income.perCompany.map((c) => {
                const behind =
                  c.expectedMonthlyMinor > 0 &&
                  c.receivedThisMonthMinor < c.expectedMonthlyMinor;
                return (
                  <li key={c.id} className="glass-chip !rounded-md px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink">{c.name}</p>
                      <Badge variant="neutral">{BILLING_SHORT[c.billingModel]}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-ink-subtle">
                        expected <MoneyText minor={c.expectedMonthlyMinor} />
                        /mo
                      </span>
                      <span className={behind ? "font-medium text-ink-danger" : "text-ink-success"}>
                        got <MoneyText minor={c.receivedThisMonthMinor} />
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      <MoneyText minor={c.receivedThisYearMinor} /> this year
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
