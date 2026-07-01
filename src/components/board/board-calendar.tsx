"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { type BoardData } from "~/components/board/card-item";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** Month calendar of the board's due-dated cards (spec §5 Calendar view). */
export function BoardCalendar({
  board,
  onOpenCard,
}: {
  board: BoardData;
  onOpenCard: (cardId: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  const cards = useMemo(
    () => board.lists.flatMap((l) => l.cards).filter((c) => c.dueDate),
    [board],
  );

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{format(month, "MMMM yyyy")}</h2>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="iconSm"
            aria-label="Previous month"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="iconSm"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <div role="grid" aria-label={`Calendar for ${format(month, "MMMM yyyy")}`}>
        <div role="row" className="grid grid-cols-7 gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              role="columnheader"
              className="px-1 pb-1 text-center text-xs font-semibold text-ink-subtle"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayCards = cards.filter((c) => isSameDay(new Date(c.dueDate!), day));
            return (
              <div
                key={day.toISOString()}
                role="gridcell"
                aria-label={format(day, "PPPP")}
                className={cn(
                  "min-h-24 rounded-sm border border-line-glass-subtle bg-surface-glass-subtle p-1",
                  !isSameMonth(day, month) && "opacity-45",
                )}
              >
                <p
                  className={cn(
                    "mb-1 text-end text-xs",
                    isToday(day)
                      ? "ms-auto flex size-5 items-center justify-center rounded-full bg-primary text-ink-onbrand"
                      : "text-ink-subtle",
                  )}
                >
                  {format(day, "d")}
                </p>
                <div className="flex flex-col gap-1">
                  {dayCards.slice(0, 3).map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onOpenCard(card.id)}
                      aria-label={`Open card ${card.title}`}
                      className={cn(
                        "raised-card cursor-pointer !rounded-xs px-1.5 py-1 text-start text-xs text-ink",
                        card.isCompleted && "line-through opacity-60",
                      )}
                    >
                      {card.labels[0] ? (
                        <span
                          aria-hidden
                          className="mb-0.5 block h-1 w-6 rounded-full"
                          style={{ backgroundColor: card.labels[0].color }}
                        />
                      ) : null}
                      <span className="line-clamp-2">{card.title}</span>
                    </button>
                  ))}
                  {dayCards.length > 3 ? (
                    <p className="text-center text-xs text-ink-subtle">
                      +{dayCards.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
