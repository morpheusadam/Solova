"use client";

import { Plus, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { boardBackgroundCss } from "~/components/board/backgrounds";
import { BoardFormDialog } from "~/components/board/board-form";
import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function BoardsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: boards, isLoading } = api.board.list.useQuery({});

  return (
    <>
      <PageHeader
        title="Boards"
        description="Kanban boards across all companies."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New board
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !boards?.length ? (
        <EmptyState
          icon={SquareKanban}
          title="Create your first board"
          description="Boards hold lists and cards — your day-to-day work, Trello style."
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
                      boardBackgroundCss(board.background) ??
                      "var(--canvas-gradient)",
                  }}
                />
                <div className="p-3.5">
                  <p className="font-semibold text-ink">{board.name}</p>
                  <p className="mt-0.5 text-sm text-ink-subtle">
                    {board.company.name} · {board._count.cards} cards
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BoardFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
