"use client";

import {
  Archive,
  Calendar as CalendarIcon,
  ChartPie,
  Copy,
  Kanban as KanbanIcon,
  ListFilter,
  MoreHorizontal,
  Paintbrush,
  RotateCcw,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { boardBackgroundCss } from "~/components/board/backgrounds";
import { BoardCalendar } from "~/components/board/board-calendar";
import { BoardStats } from "~/components/board/board-stats";
import { BoardTable } from "~/components/board/board-table";
import { CardModal } from "~/components/board/card-modal";
import { Kanban } from "~/components/board/kanban";
import { BackgroundPicker } from "~/components/shared/background-picker";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function BoardScreen({ boardId }: { boardId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: board, isLoading } = api.board.byId.useQuery(boardId);

  const update = api.board.update.useMutation({
    onSuccess: () => utils.board.invalidate(),
  });
  const archiveBoard = api.board.archive.useMutation();
  const deleteBoard = api.board.delete.useMutation();
  const saveBoardTemplate = api.board.saveAsTemplate.useMutation({
    onSuccess: () => utils.board.templates.invalidate(),
  });
  const { data: archivedCards } = api.card.archived.useQuery(boardId);
  const restoreCard = api.card.archive.useMutation({
    onSuccess: () =>
      Promise.all([utils.board.byId.invalidate(boardId), utils.card.archived.invalidate(boardId)]),
  });

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // filters (spec §5: label filter + search)
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const filtersActive = Boolean(search) || labelFilter.length > 0 || hideCompleted;

  const filteredBoard = useMemo(() => {
    if (!board || !filtersActive) return board;
    const q = search.toLowerCase();
    return {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => {
          if (q && !card.title.toLowerCase().includes(q)) return false;
          if (hideCompleted && card.isCompleted) return false;
          if (
            labelFilter.length > 0 &&
            !card.labels.some((l) => labelFilter.includes(l.id))
          )
            return false;
          return true;
        }),
      })),
    };
  }, [board, filtersActive, search, hideCompleted, labelFilter]);

  if (isLoading || !board || !filteredBoard) {
    return <Skeleton className="h-[70dvh]" />;
  }

  const backgroundCss = boardBackgroundCss(board.background);

  return (
    <div className="relative -m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden p-4 pb-20 md:-m-6 md:p-6 md:pb-6">
      {backgroundCss ? (
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: backgroundCss }}
        />
      ) : null}

      <Tabs defaultValue="board" className="flex min-h-0 flex-1 flex-col">
        {/* board header */}
        <div className="glass-card mb-3 flex shrink-0 flex-wrap items-center gap-2 !rounded-lg px-3 py-2">
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Board name"
              defaultValue={board.name}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== board.name)
                  update.mutate({ id: board.id, data: { name } });
              }}
              className="h-8 w-auto max-w-64 border-transparent bg-transparent px-1 text-xl font-semibold backdrop-blur-none"
            />
            <p className="px-1 text-sm text-ink-subtle">
              <Link
                href={`/companies/${board.company.id}`}
                className="hover:text-ink-link hover:underline"
              >
                {board.company.name}
              </Link>
              {board.project ? (
                <>
                  {" · "}
                  <Link
                    href={`/projects/${board.project.id}`}
                    className="hover:text-ink-link hover:underline"
                  >
                    {board.project.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>

          {/* filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filtersActive ? "primary" : "secondary"} size="sm">
                <ListFilter aria-hidden />
                Filter
                {filtersActive ? (
                  <Badge variant="neutral" className="bg-surface-solid">
                    on
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent aria-label="Filter cards">
              <div className="space-y-3">
                <Input
                  aria-label="Search cards"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search card titles…"
                />
                <div>
                  <p className="mb-1.5 text-sm font-medium text-ink-secondary">Labels</p>
                  <div className="flex flex-col gap-1">
                    {board.labels.map((label) => (
                      <label key={label.id} className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={labelFilter.includes(label.id)}
                          onCheckedChange={(checked) =>
                            setLabelFilter((prev) =>
                              checked === true
                                ? [...prev, label.id]
                                : prev.filter((id) => id !== label.id),
                            )
                          }
                        />
                        <span
                          className="h-5 flex-1 rounded-sm px-2 text-sm font-medium text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-md text-ink">
                  <Checkbox
                    checked={hideCompleted}
                    onCheckedChange={(c) => setHideCompleted(c === true)}
                  />
                  Hide completed cards
                </label>
                {filtersActive ? (
                  <>
                    <p className="text-xs text-ink-subtle">
                      Drag is disabled while filters are active.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSearch("");
                        setLabelFilter([]);
                        setHideCompleted(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  </>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          {/* board menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="iconSm" aria-label="Board menu">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Paintbrush aria-hidden className="size-4" />
                    Change background
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-80" aria-label="Board background">
                  <BackgroundPicker
                    value={board.background}
                    onSelect={(v) => update.mutate({ id: board.id, data: { background: v } })}
                  />
                </PopoverContent>
              </Popover>

              {archivedCards?.length ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Archive aria-hidden className="size-4" />
                      Archived cards ({archivedCards.length})
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent side="left" aria-label="Archived cards">
                    <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                      {archivedCards.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="flex-1 truncate text-md text-ink">{c.title}</span>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Restore ${c.title}`}
                            onClick={() => restoreCard.mutate({ id: c.id, archived: false })}
                          >
                            <RotateCcw aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              ) : null}

              <DropdownMenuItem
                onSelect={async () => {
                  await saveBoardTemplate.mutateAsync({
                    boardId: board.id,
                    name: board.name,
                  });
                  toast.success(`Saved "${board.name}" as a board template`);
                }}
              >
                <Copy aria-hidden className="size-4" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await archiveBoard.mutateAsync({ id: board.id, archived: true });
                  toast.success("Board archived");
                  router.push("/boards");
                }}
              >
                <Archive aria-hidden className="size-4" />
                Archive board
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden className="size-4" />
                Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* content area — fills the space; the board's horizontal scrollbar
            sits at its bottom, right above the footer bar */}
        <div className="min-h-0 flex-1">
          <TabsContent value="board" className="h-full data-[state=inactive]:hidden">
            <Kanban
              board={filteredBoard}
              onOpenCard={setOpenCardId}
              dragDisabled={filtersActive}
            />
          </TabsContent>
          <TabsContent value="calendar" className="h-full overflow-y-auto">
            <BoardCalendar board={filteredBoard} onOpenCard={setOpenCardId} />
          </TabsContent>
          <TabsContent value="table" className="h-full overflow-y-auto">
            <BoardTable board={filteredBoard} onOpenCard={setOpenCardId} />
          </TabsContent>
          <TabsContent value="stats" className="h-full overflow-y-auto">
            <BoardStats boardId={board.id} />
          </TabsContent>
        </div>

        {/* footer — sticky view switcher (Board / Calendar / Table / Stats) */}
        <div className="glass-card mt-3 flex shrink-0 items-center justify-center !rounded-lg px-2 py-1.5">
          <TabsList aria-label="Board views">
            <TabsTrigger value="board">
              <KanbanIcon aria-hidden className="me-1.5 size-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon aria-hidden className="me-1.5 size-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="table">
              <TableIcon aria-hidden className="me-1.5 size-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="stats">
              <ChartPie aria-hidden className="me-1.5 size-4" />
              Stats
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete board "${board.name}"?`}
        description="All of its lists and cards will be permanently deleted (this is the cascade rule)."
        confirmLabel="Delete board"
        onConfirm={async () => {
          await deleteBoard.mutateAsync(board.id);
          toast.success("Board deleted");
          await utils.board.invalidate();
          router.push("/boards");
        }}
      />
    </div>
  );
}
