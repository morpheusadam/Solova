"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import { LayoutTemplate, MoreHorizontal, Plus, X } from "lucide-react";
import { useState } from "react";

import { CardItem, type BoardData } from "~/components/board/card-item";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

type BoardList = BoardData["lists"][number];

function QuickAddCard({ listId }: { listId: string }) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = api.card.create.useMutation({
    onSuccess: () => utils.board.byId.invalidate(),
  });
  const { data: templates } = api.card.cardTemplates.useQuery();
  const fromTemplate = api.card.fromTemplate.useMutation({
    onSuccess: () => utils.board.byId.invalidate(),
  });

  if (!open) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden />
          Add a card
        </Button>
        {templates?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm" aria-label="Add card from template">
                <LayoutTemplate aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {templates.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => fromTemplate.mutate({ templateId: t.id, listId })}
                >
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    );
  }

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    try {
      await create.mutateAsync({ listId, title: trimmed });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add card");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-1.5"
    >
      <Textarea
        aria-label="New card title"
        autoFocus
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Enter a title for this card…"
        className="min-h-14 bg-surface-raised"
      />
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" loading={create.isPending}>
          Add card
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label="Cancel adding card"
          onClick={() => setOpen(false)}
        >
          <X aria-hidden />
        </Button>
      </div>
    </form>
  );
}

/** A Trello list column: frosted glass, inline rename, quick-add, drag handle. */
export function ListColumn({
  list,
  index,
  onOpenCard,
  dragDisabled,
}: {
  list: BoardList;
  index: number;
  onOpenCard: (cardId: string) => void;
  dragDisabled: boolean;
}) {
  const utils = api.useUtils();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rename = api.list.rename.useMutation({
    onSuccess: () => utils.board.byId.invalidate(),
  });
  const remove = api.list.delete.useMutation({
    onSuccess: () => utils.board.byId.invalidate(),
  });

  return (
    <Draggable draggableId={list.id} index={index} isDragDisabled={dragDisabled}>
      {(provided) => (
        <section
          ref={provided.innerRef}
          {...provided.draggableProps}
          aria-label={`List ${list.name}`}
          className="glass-column flex max-h-full w-[272px] shrink-0 flex-col"
        >
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-between gap-1 p-2 ps-3"
          >
            {renaming ? (
              <form
                className="flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRenaming(false);
                  if (name.trim() && name !== list.name) {
                    rename.mutate({ id: list.id, name: name.trim() });
                  }
                }}
              >
                <Input
                  aria-label="List name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    setRenaming(false);
                    if (name.trim() && name !== list.name) {
                      rename.mutate({ id: list.id, name: name.trim() });
                    }
                  }}
                  className="h-7 text-md font-semibold"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="flex-1 cursor-pointer truncate text-start text-md font-semibold text-ink"
                aria-label={`Rename list ${list.name}`}
              >
                {list.name}
                <span className="ms-2 text-sm font-normal text-ink-subtle">
                  {list.cards.length}
                </span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" aria-label={`List ${list.name} actions`}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename</DropdownMenuItem>
                <DropdownMenuItem danger onSelect={() => setDeleteOpen(true)}>
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Droppable droppableId={list.id} type="CARD">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`flex min-h-2 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0 transition-[background-color] duration-[var(--duration-fast)] ${
                  dropSnapshot.isDraggingOver ? "bg-surface-selected" : ""
                }`}
              >
                {list.cards.map((card, cardIndex) => (
                  <Draggable
                    key={card.id}
                    draggableId={card.id}
                    index={cardIndex}
                    isDragDisabled={dragDisabled}
                  >
                    {(cardProvided, cardSnapshot) => (
                      <div
                        ref={cardProvided.innerRef}
                        {...cardProvided.draggableProps}
                        {...cardProvided.dragHandleProps}
                        style={cardProvided.draggableProps.style}
                        className={cardSnapshot.isDragging ? "rotate-2 opacity-90" : ""}
                      >
                        <CardItem card={card} onOpen={onOpenCard} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          <div className="p-2 pt-0">
            <QuickAddCard listId={list.id} />
          </div>

          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete list "${list.name}"?`}
            description={`Its ${list.cards.length} cards will be permanently deleted.`}
            onConfirm={async () => {
              try {
                await remove.mutateAsync(list.id);
                toast.success("List deleted");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Delete failed");
              }
            }}
          />
        </section>
      )}
    </Draggable>
  );
}
