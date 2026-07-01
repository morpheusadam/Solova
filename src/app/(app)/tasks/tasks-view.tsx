"use client";

import { ChevronLeft, ChevronRight, ListTodo, Search } from "lucide-react";
import { useState } from "react";

import { CardModal } from "~/components/board/card-modal";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function TasksView() {
  const [status, setStatus] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN");
  const [companyId, setCompanyId] = useState("ALL");
  const [due, setDue] = useState<"OVERDUE" | "WEEK" | "ANY">("ANY");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const { data: counts } = api.task.counts.useQuery();
  const { data: companies } = api.company.list.useQuery({});
  const { data, isLoading } = api.task.all.useQuery({
    page,
    pageSize: 25,
    status,
    due,
    companyId: companyId === "ALL" ? undefined : companyId,
    search: search || undefined,
    sort: "DUE",
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every card across every board, in one table."
        actions={
          counts ? (
            <div className="flex gap-2">
              <Badge variant="info">{counts.open} open</Badge>
              <Badge variant="success">{counts.closed} closed</Badge>
              {counts.overdue > 0 ? (
                <Badge variant="danger">{counts.overdue} overdue</Badge>
              ) : null}
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-icon-subtle"
          />
          <Input
            aria-label="Search tasks"
            className="ps-8"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by status" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={companyId}
          onValueChange={(v) => {
            setCompanyId(v);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by company" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All companies</SelectItem>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={due}
          onValueChange={(v) => {
            setDue(v as typeof due);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by due date" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any due date</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="WEEK">Due this week</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !data?.tasks.length ? (
        <EmptyState
          icon={ListTodo}
          title="Nothing here"
          description="No tasks match the current filters."
        />
      ) : (
        <>
          <div className="glass-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-md">
              <thead>
                <tr className="border-b border-line text-sm text-ink-subtle">
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    Task
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    Board
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    List
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    Due
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-start font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((task) => {
                  const overdue =
                    !task.isCompleted && task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setOpenCardId(task.id)}
                      className="cursor-pointer border-b border-line-glass-subtle transition-[background-color] duration-[var(--duration-fast)] hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          {task.labels.slice(0, 3).map((l) => (
                            <span
                              key={l.id}
                              title={l.name}
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: l.color }}
                            />
                          ))}
                          {task.title}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">{task.board.name}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">
                        {task.board.company.name}
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">{task.listName}</td>
                      <td className={`px-4 py-2.5 ${overdue ? "font-medium text-ink-danger" : "text-ink-secondary"}`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={task.isCompleted ? "success" : overdue ? "danger" : "info"}>
                          {task.isCompleted ? "done" : overdue ? "overdue" : "open"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-ink-subtle">
              {data.total} tasks · page {data.page} of {pageCount}
            </p>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="iconSm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="iconSm"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}

      <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />
    </>
  );
}
