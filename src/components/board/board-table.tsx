"use client";

import { useMemo } from "react";

import { type BoardData } from "~/components/board/card-item";
import { Badge } from "~/components/ui/badge";

/** Spreadsheet-style view of every card on the board (spec §5 Table view). */
export function BoardTable({
  board,
  onOpenCard,
}: {
  board: BoardData;
  onOpenCard: (cardId: string) => void;
}) {
  const rows = useMemo(
    () =>
      board.lists
        .flatMap((list) => list.cards.map((card) => ({ card, listName: list.name })))
        .sort((a, b) => {
          const ad = a.card.dueDate ? new Date(a.card.dueDate).getTime() : Infinity;
          const bd = b.card.dueDate ? new Date(b.card.dueDate).getTime() : Infinity;
          return ad - bd;
        }),
    [board],
  );

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[600px] text-md">
        <thead>
          <tr className="border-b border-line text-start text-sm text-ink-subtle">
            <th scope="col" className="px-4 py-2.5 text-start font-medium">
              Card
            </th>
            <th scope="col" className="px-4 py-2.5 text-start font-medium">
              List
            </th>
            <th scope="col" className="px-4 py-2.5 text-start font-medium">
              Labels
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
          {rows.map(({ card, listName }) => (
            <tr
              key={card.id}
              onClick={() => onOpenCard(card.id)}
              className="cursor-pointer border-b border-line-glass-subtle transition-[background-color] duration-[var(--duration-fast)] hover:bg-surface-hover"
            >
              <td className="px-4 py-2.5 font-medium text-ink">{card.title}</td>
              <td className="px-4 py-2.5 text-ink-secondary">{listName}</td>
              <td className="px-4 py-2.5">
                <span className="flex flex-wrap gap-1">
                  {card.labels.map((label) => (
                    <span
                      key={label.id}
                      title={label.name}
                      className="h-2 w-8 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                  ))}
                </span>
              </td>
              <td className="px-4 py-2.5 text-ink-secondary">
                {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={card.isCompleted ? "success" : "info"}>
                  {card.isCompleted ? "done" : "open"}
                </Badge>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ink-subtle">
                No cards match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
