"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/** Toggle board labels on a card; create new ones from the Settings palette. */
export function LabelPicker({
  boardId,
  cardId,
  cardLabelIds,
  children,
}: {
  boardId: string;
  cardId: string;
  cardLabelIds: string[];
  children: React.ReactNode;
}) {
  const utils = api.useUtils();
  const { data: board } = api.board.byId.useQuery(boardId);
  const { data: settings } = api.settings.get.useQuery();
  const palette = (settings?.labelPalette as string[] | undefined) ?? ["#61BD4F", "#EB5A46"];

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(palette[0] ?? "#61BD4F");

  const invalidate = () =>
    Promise.all([utils.card.byId.invalidate(cardId), utils.board.byId.invalidate(boardId)]);

  const toggle = api.card.toggleLabel.useMutation({ onSuccess: invalidate });
  const create = api.card.createLabel.useMutation({ onSuccess: invalidate });

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent aria-label="Labels">
        <h4 className="mb-2 text-sm font-semibold text-ink-secondary">Labels</h4>
        <ul className="flex flex-col gap-1">
          {board?.labels.map((label) => {
            const active = cardLabelIds.includes(label.id);
            return (
              <li key={label.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`Toggle label ${label.name}`}
                  onClick={() => toggle.mutate({ cardId, labelId: label.id })}
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <span
                    className="flex h-7 flex-1 items-center rounded-sm px-2.5 text-sm font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                  {active ? <Check aria-hidden className="size-4 text-icon-brand" /> : null}
                </button>
              </li>
            );
          })}
        </ul>

        {creating ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              create.mutate({ boardId, name: newName.trim(), color: newColor });
              setNewName("");
              setCreating(false);
            }}
          >
            <Input
              aria-label="New label name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Label name"
            />
            <div className="flex flex-wrap gap-1.5">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  aria-pressed={newColor === color}
                  onClick={() => setNewColor(color)}
                  className={cn(
                    "size-7 cursor-pointer rounded-sm",
                    newColor === color && "ring-2 ring-[var(--border-focus)] ring-offset-1",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Button type="submit" size="sm" className="w-full" loading={create.isPending}>
              Create label
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden />
            Create a new label
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
