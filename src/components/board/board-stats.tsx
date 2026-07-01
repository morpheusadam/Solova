"use client";

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

import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const DONUT_COLORS = ["#0079BF", "#61BD4F"];

/** Per-board mini dashboard (spec §5 Dashboard view). */
export function BoardStats({ boardId }: { boardId: string }) {
  const { data: stats, isLoading } = api.dashboard.taskStats.useQuery({ boardId });

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  const donutData = [
    { name: "Open", value: stats.open },
    { name: "Closed", value: stats.closed },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="glass-card p-4" aria-label="Open versus closed cards">
        <h3 className="mb-2 font-semibold text-ink">Open vs closed</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                strokeWidth={0}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-card p-4" aria-label="Due date summary">
        <h3 className="mb-2 font-semibold text-ink">Due dates</h3>
        <div className="grid h-56 grid-cols-2 content-center gap-3">
          {(
            [
              ["Overdue", stats.overdue, "text-ink-danger"],
              ["Due in 7 days", stats.dueSoon, "text-ink-warning"],
              ["Open", stats.open, "text-ink"],
              ["Closed", stats.closed, "text-ink-success"],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label} className="glass-chip !rounded-md px-3 py-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-sm text-ink-subtle">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-4" aria-label="Cards per list">
        <h3 className="mb-2 font-semibold text-ink">Cards per list</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={stats.byList} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" allowDecimals={false} stroke="var(--fg-subtle)" />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                stroke="var(--fg-subtle)"
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "var(--surface-selected)" }} />
              <Bar dataKey="count" fill="#0079BF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-card p-4" aria-label="Cards per label">
        <h3 className="mb-2 font-semibold text-ink">Cards per label</h3>
        <div className="h-56">
          {stats.byLabel.length === 0 ? (
            <p className="pt-16 text-center text-md text-ink-subtle">No labels used yet.</p>
          ) : (
            <ResponsiveContainer>
              <BarChart data={stats.byLabel} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" allowDecimals={false} stroke="var(--fg-subtle)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  stroke="var(--fg-subtle)"
                  tick={{ fontSize: 12 }}
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
    </div>
  );
}
