"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { type BoardData } from "~/components/board/card-item";
import { ListColumn } from "~/components/board/list-column";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/toast";
import { betweenPosition, needsRebalance } from "~/lib/position";
import { api } from "~/trpc/react";

function AddList({ boardId }: { boardId: string }) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = api.list.create.useMutation({
    onSuccess: () => utils.board.byId.invalidate(),
  });

  if (!open) {
    return (
      <Button
        variant="secondary"
        className="w-64 shrink-0 justify-start"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden />
        Add another list
      </Button>
    );
  }

  return (
    <form
      className="glass-column flex w-[272px] shrink-0 flex-col gap-1.5 self-start p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        create.mutate({ boardId, name: trimmed });
        setName("");
      }}
    >
      <Input
        aria-label="New list name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="List name…"
      />
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" loading={create.isPending}>
          Add list
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Cancel adding list"
          onClick={() => setOpen(false)}
        >
          <X aria-hidden />
        </Button>
      </div>
    </form>
  );
}

/**
 * The Kanban surface. Drag-and-drop feels instant because the board cache is
 * mutated optimistically before the server round-trip; fractional positions
 * mean each drop writes exactly one row.
 */
export function Kanban({
  board,
  onOpenCard,
  dragDisabled,
}: {
  board: BoardData;
  onOpenCard: (cardId: string) => void;
  dragDisabled: boolean;
}) {
  const utils = api.useUtils();

  const moveCard = api.card.move.useMutation({
    onError: (error) => {
      toast.error(error.message);
      void utils.board.byId.invalidate(board.id);
    },
  });
  const moveList = api.list.move.useMutation({
    onError: () => utils.board.byId.invalidate(board.id),
  });
  const rebalance = api.card.rebalance.useMutation({
    onSuccess: () => utils.board.byId.invalidate(board.id),
  });

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    if (type === "COLUMN") {
      const lists = [...board.lists];
      const [moved] = lists.splice(source.index, 1);
      if (!moved) return;
      lists.splice(destination.index, 0, moved);
      const before = lists[destination.index - 1]?.position ?? null;
      const after = lists[destination.index + 1]?.position ?? null;
      const position = betweenPosition(before, after);

      utils.board.byId.setData(board.id, (prev) =>
        prev
          ? {
              ...prev,
              lists: lists.map((l) => (l.id === moved.id ? { ...l, position } : l)),
            }
          : prev,
      );
      moveList.mutate({ id: moved.id, position });
      return;
    }

    // CARD move
    const sourceList = board.lists.find((l) => l.id === source.droppableId);
    const destList = board.lists.find((l) => l.id === destination.droppableId);
    if (!sourceList || !destList) return;

    const sourceCards = [...sourceList.cards];
    const [moved] = sourceCards.splice(source.index, 1);
    if (!moved || moved.id !== draggableId) return;

    const destCards =
      sourceList.id === destList.id ? sourceCards : [...destList.cards];
    destCards.splice(destination.index, 0, moved);

    const before = destCards[destination.index - 1]?.position ?? null;
    const after = destCards[destination.index + 1]?.position ?? null;
    const position = betweenPosition(before, after);

    utils.board.byId.setData(board.id, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lists: prev.lists.map((list) => {
          if (list.id === sourceList.id && list.id === destList.id) {
            return {
              ...list,
              cards: destCards.map((c) =>
                c.id === moved.id ? { ...c, position, listId: list.id } : c,
              ),
            };
          }
          if (list.id === sourceList.id) {
            return { ...list, cards: sourceCards };
          }
          if (list.id === destList.id) {
            return {
              ...list,
              cards: destCards.map((c) =>
                c.id === moved.id ? { ...c, position, listId: list.id } : c,
              ),
            };
          }
          return list;
        }),
      };
    });

    moveCard.mutate(
      { cardId: moved.id, toListId: destList.id, position },
      {
        onSuccess: () => {
          // Moving into "Done" may auto-complete via automation — refresh.
          void utils.board.byId.invalidate(board.id);
          if (needsRebalance(before, after)) rebalance.mutate(destList.id);
        },
      },
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="COLUMN" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex h-full items-start gap-3 overflow-x-auto pb-4"
          >
            {board.lists.map((list, index) => (
              <ListColumn
                key={list.id}
                list={list}
                index={index}
                onOpenCard={onOpenCard}
                dragDisabled={dragDisabled}
              />
            ))}
            {provided.placeholder}
            <AddList boardId={board.id} />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
