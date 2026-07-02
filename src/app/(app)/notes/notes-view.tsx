"use client";

import { Pin, Plus, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "~/components/shared/page-header";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Note = RouterOutputs["note"]["list"][number];

// Sticky-paper tints (classic Post-it palette).
const STICKY_COLORS = [
  "#FEF08A", // yellow
  "#FBCFE8", // pink
  "#BBF7D0", // green
  "#BFDBFE", // blue
  "#FED7AA", // orange
  "#E9D5FF", // purple
  "#FECACA", // red
  "#C7F9E9", // teal
];

// Slight, deterministic tilt per note for a playful pinboard feel.
const TILTS = ["-2deg", "1.5deg", "-1deg", "2deg", "-1.5deg", "1deg"];

function StickyCard({ note, index }: { note: Note; index: number }) {
  const utils = api.useUtils();
  const invalidate = () => utils.note.list.invalidate();
  const update = api.note.update.useMutation({ onSuccess: invalidate });
  const togglePin = api.note.togglePin.useMutation({ onSuccess: invalidate });
  const remove = api.note.delete.useMutation({ onSuccess: invalidate });

  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body);
  const [paletteOpen, setPaletteOpen] = useState(false);

  function save(patch: Partial<{ title: string; body: string; color: string }>) {
    update.mutate({ id: note.id, data: patch });
  }

  return (
    <div
      className="group relative flex flex-col rounded-sm p-3 shadow-[0_6px_16px_rgba(9,30,66,0.18)] transition-transform duration-[var(--duration-base)] hover:z-10 hover:!rotate-0 hover:scale-[1.03]"
      style={{
        background: note.color,
        color: "#172B4D",
        transform: `rotate(${note.pinned ? "0deg" : TILTS[index % TILTS.length]})`,
        minHeight: 180,
      }}
    >
      {/* pushpin */}
      <button
        type="button"
        aria-label={note.pinned ? "Unpin note" : "Pin note"}
        aria-pressed={note.pinned}
        onClick={() => togglePin.mutate({ id: note.id, pinned: !note.pinned })}
        className={cn(
          "absolute -top-2 left-1/2 -translate-x-1/2 cursor-pointer rounded-full p-1 transition-transform",
          note.pinned ? "text-[#EB5A46]" : "text-black/30 hover:text-black/60",
        )}
      >
        <Pin aria-hidden className={cn("size-4", note.pinned && "fill-current")} />
      </button>

      <input
        aria-label="Note title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== (note.title ?? "") && save({ title })}
        placeholder="Title"
        className="mt-1 mb-1 w-full bg-transparent text-md font-bold placeholder-black/35 outline-none"
      />
      <textarea
        aria-label="Note body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => body !== note.body && save({ body })}
        placeholder="Write something…"
        className="min-h-20 flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder-black/35 outline-none"
      />

      {/* footer actions (appear on hover) */}
      <div className="mt-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
        <div className="relative">
          <button
            type="button"
            aria-label="Change color"
            onClick={() => setPaletteOpen((o) => !o)}
            className="size-5 cursor-pointer rounded-full border border-black/20"
            style={{ background: note.color }}
          />
          {paletteOpen ? (
            <div className="glass-modal absolute bottom-7 left-0 z-20 grid grid-cols-4 gap-1.5 !rounded-lg p-2">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => {
                    save({ color: c });
                    setPaletteOpen(false);
                  }}
                  className="size-6 cursor-pointer rounded-full border border-black/10"
                  style={{ background: c }}
                />
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Delete note"
          onClick={() => remove.mutate(note.id)}
          className="cursor-pointer rounded-xs p-1 text-black/40 hover:bg-black/10 hover:text-[#EB5A46]"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function NotesView() {
  const utils = api.useUtils();
  const { data: notes, isLoading } = api.note.list.useQuery();
  const create = api.note.create.useMutation({
    onSuccess: () => utils.note.list.invalidate(),
  });

  return (
    <>
      <PageHeader
        title="Notes"
        description="A pinboard of sticky notes — jot ideas, reminders and snippets."
        actions={
          <Button
            onClick={() =>
              create.mutate({
                body: "",
                color: STICKY_COLORS[Math.floor((notes?.length ?? 0) % STICKY_COLORS.length)]!,
                pinned: false,
              })
            }
            loading={create.isPending}
          >
            <Plus aria-hidden />
            New note
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !notes?.length ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Stick your first note on the board — pin the important ones to keep them on top."
          action={
            <Button onClick={() => create.mutate({ body: "", color: STICKY_COLORS[0]!, pinned: false })}>
              <Plus aria-hidden />
              New note
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {notes.map((note, i) => (
            <StickyCard key={note.id} note={note} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
