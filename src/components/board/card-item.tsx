"use client";

import { AlignLeft, CheckSquare, Clock, MessageSquare, Paperclip } from "lucide-react";

import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

export type BoardData = RouterOutputs["board"]["byId"];
export type BoardCard = BoardData["lists"][number]["cards"][number];

function dueState(card: BoardCard): "complete" | "overdue" | "soon" | "normal" {
  if (card.isCompleted) return "complete";
  if (!card.dueDate) return "normal";
  const due = new Date(card.dueDate).getTime();
  const now = Date.now();
  if (due < now) return "overdue";
  if (due < now + 2 * 86400_000) return "soon";
  return "normal";
}

/** Trello card face: cover strip, label bars, title, badge row. */
export function CardItem({
  card,
  onOpen,
}: {
  card: BoardCard;
  onOpen: (cardId: string) => void;
}) {
  const due = dueState(card);

  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      aria-label={`Open card ${card.title}`}
      className={cn(
        "raised-card w-full cursor-pointer overflow-hidden text-start",
        card.isCompleted && "opacity-70",
      )}
    >
      {card.cover?.startsWith("color:") ? (
        <div aria-hidden className="h-8" style={{ background: card.cover.slice(6) }} />
      ) : null}
      <div className="flex flex-col gap-2 p-3">
        {card.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1" aria-label="Labels">
            {card.labels.map((label) => (
              <span
                key={label.id}
                title={label.name}
                className="h-2 min-w-10 rounded-full"
                style={{ backgroundColor: label.color }}
              />
            ))}
          </div>
        ) : null}

        <p className={cn("text-md text-ink", card.isCompleted && "line-through")}>
          {card.title}
        </p>

        {(card.dueDate ||
          card.checklistTotal > 0 ||
          card.commentCount > 0 ||
          card.attachmentCount > 0 ||
          card.hasDescription) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-subtle">
            {card.dueDate ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5",
                  due === "overdue" && "bg-status-danger text-ink",
                  due === "soon" && "bg-status-warning text-ink",
                  due === "complete" && "bg-status-success text-ink",
                )}
              >
                <Clock aria-hidden className="size-3.5" />
                {new Date(card.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : null}
            {card.hasDescription ? (
              <AlignLeft aria-hidden className="size-3.5" />
            ) : null}
            {card.checklistTotal > 0 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  card.checklistDone === card.checklistTotal && "text-ink-success",
                )}
              >
                <CheckSquare aria-hidden className="size-3.5" />
                {card.checklistDone}/{card.checklistTotal}
              </span>
            ) : null}
            {card.commentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare aria-hidden className="size-3.5" />
                {card.commentCount}
              </span>
            ) : null}
            {card.attachmentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Paperclip aria-hidden className="size-3.5" />
                {card.attachmentCount}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </button>
  );
}
