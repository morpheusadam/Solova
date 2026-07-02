"use client";

import { Plus, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { boardBackgroundCss } from "~/components/board/backgrounds";
import { NewBoardDialog } from "~/components/board/new-board-dialog";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function BoardsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [projectId, setProjectId] = useState("ALL");

  const { data: projects } = api.project.list.useQuery();
  const { data: boards, isLoading } = api.board.list.useQuery({
    projectId: projectId === "ALL" ? undefined : projectId,
  });

  return (
    <>
      <PageHeader
        title="Boards"
        description="Kanban boards, grouped by project."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New board
          </Button>
        }
      />

      {/* filter by project */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger aria-label="Filter boards by project" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All projects</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · {p.company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !boards?.length ? (
        <EmptyState
          icon={SquareKanban}
          title={projectId === "ALL" ? "Create your first board" : "No boards in this project"}
          description="Boards hold lists and cards — start blank or from a template."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              New board
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                aria-label={`Open board ${board.name}`}
                className="raised-card block overflow-hidden"
              >
                <div
                  aria-hidden
                  className="h-14"
                  style={{
                    background:
                      boardBackgroundCss(board.background) ?? "var(--canvas-gradient)",
                  }}
                />
                <div className="p-3.5">
                  <p className="font-semibold text-ink">{board.name}</p>
                  <p className="mt-0.5 text-sm text-ink-subtle">
                    {board.project ? `${board.project.name} · ` : ""}
                    {board.company.name} · {board._count.cards} cards
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewBoardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={projectId === "ALL" ? undefined : projectId}
      />
    </>
  );
}
