"use client";

import {
  AlignLeft,
  Archive,
  ArrowUpRight,
  CheckSquare,
  Clock,
  Copy,
  MessageSquare,
  Paintbrush,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { LabelPicker } from "~/components/board/label-picker";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { Markdown } from "~/components/shared/markdown";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const COVER_COLORS = [
  "#0079BF",
  "#61BD4F",
  "#F2D600",
  "#FF9F1A",
  "#EB5A46",
  "#C377E0",
  "#00C2E0",
  "#344563",
];

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function CardModal({
  cardId,
  onClose,
}: {
  cardId: string | null;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const { data: card } = api.card.byId.useQuery(cardId ?? "", { enabled: !!cardId });

  const invalidate = async () => {
    if (!cardId) return;
    await Promise.all([
      utils.card.byId.invalidate(cardId),
      card ? utils.board.byId.invalidate(card.board.id) : Promise.resolve(),
    ]);
  };

  const update = api.card.update.useMutation({ onSuccess: invalidate });
  const archive = api.card.archive.useMutation({ onSuccess: invalidate });
  const remove = api.card.delete.useMutation();
  const addChecklist = api.card.addChecklist.useMutation({ onSuccess: invalidate });
  const deleteChecklist = api.card.deleteChecklist.useMutation({ onSuccess: invalidate });
  const addItem = api.card.addChecklistItem.useMutation({ onSuccess: invalidate });
  const toggleItem = api.card.toggleChecklistItem.useMutation({ onSuccess: invalidate });
  const setItemDue = api.card.setChecklistItemDueDate.useMutation({ onSuccess: invalidate });
  const deleteItem = api.card.deleteChecklistItem.useMutation({ onSuccess: invalidate });
  const saveTemplate = api.card.saveAsTemplate.useMutation({ onSuccess: invalidate });
  const convertItem = api.card.convertItemToCard.useMutation({ onSuccess: invalidate });
  const addComment = api.card.addComment.useMutation({ onSuccess: invalidate });
  const deleteComment = api.card.deleteComment.useMutation({ onSuccess: invalidate });
  const addAttachment = api.card.addAttachment.useMutation({ onSuccess: invalidate });
  const deleteAttachment = api.card.deleteAttachment.useMutation({ onSuccess: invalidate });

  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [newChecklistOpen, setNewChecklistOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [comment, setComment] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});

  if (!cardId) return null;

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { url: string; fileName: string };
      await addAttachment.mutateAsync({
        cardId: cardId!,
        fileUrl: json.url,
        fileName: json.fileName,
      });
      toast.success("Attachment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={!!cardId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={card?.title ?? "Card"}
        hideHeader
        wide
        className="p-0"
      >
        {!card ? (
          <div className="p-6 text-md text-ink-secondary">Loading…</div>
        ) : (
          <>
            {card.cover?.startsWith("color:") ? (
              <div
                aria-hidden
                className="h-16 rounded-t-[inherit]"
                style={{ background: card.cover.slice(6) }}
              />
            ) : null}

            <div className="grid gap-6 p-6 md:grid-cols-[1fr_180px]">
              {/* ── main column ── */}
              <div className="min-w-0 space-y-6">
                {/* title + meta */}
                <div className="flex items-start gap-3 pe-8">
                  <Checkbox
                    aria-label={card.isCompleted ? "Mark incomplete" : "Mark complete"}
                    checked={card.isCompleted}
                    onCheckedChange={(checked) =>
                      update.mutate({ id: card.id, isCompleted: checked === true })
                    }
                    className="mt-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label="Card title"
                      defaultValue={card.title}
                      onBlur={(e) => {
                        const title = e.target.value.trim();
                        if (title && title !== card.title)
                          update.mutate({ id: card.id, title });
                      }}
                      className={cn(
                        "h-auto border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold shadow-none backdrop-blur-none",
                        card.isCompleted && "line-through",
                      )}
                    />
                    <p className="mt-1 px-1 text-sm text-ink-subtle">
                      in list <strong>{card.list.name}</strong> on{" "}
                      <strong>{card.board.name}</strong>
                    </p>
                  </div>
                </div>

                {/* labels + dates summary */}
                {(card.labels.length > 0 || card.dueDate || card.startDate) && (
                  <div className="flex flex-wrap items-center gap-2 ps-8">
                    {card.labels.map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full px-2.5 py-1 text-sm font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {card.startDate || card.dueDate ? (
                      <span className="glass-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-ink-secondary">
                        <Clock aria-hidden className="size-3.5" />
                        {card.startDate
                          ? new Date(card.startDate).toLocaleDateString()
                          : "…"}
                        {" → "}
                        {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : "…"}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* description */}
                <section aria-label="Description" className="ps-8">
                  <div className="mb-2 flex items-center gap-2">
                    <AlignLeft aria-hidden className="size-4.5 text-icon-subtle" />
                    <h3 className="font-semibold text-ink">Description</h3>
                    {!editingDescription && card.description ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDescription(card.description ?? "");
                          setEditingDescription(true);
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        aria-label="Card description (markdown)"
                        autoFocus
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a more detailed description… (markdown supported)"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={update.isPending}
                          onClick={async () => {
                            await update.mutateAsync({
                              id: card.id,
                              description: description || null,
                            });
                            setEditingDescription(false);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDescription(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : card.description ? (
                    <Markdown>{card.description}</Markdown>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDescription("");
                        setEditingDescription(true);
                      }}
                      className="glass-chip w-full cursor-pointer !rounded-sm px-3 py-3 text-start text-md text-ink-subtle hover:bg-surface-hover"
                    >
                      Add a more detailed description…
                    </button>
                  )}
                </section>

                {/* checklists */}
                {card.checklists.map((checklist) => {
                  const done = checklist.items.filter((i) => i.isChecked).length;
                  const total = checklist.items.length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <section key={checklist.id} aria-label={`Checklist ${checklist.title}`} className="ps-8">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckSquare aria-hidden className="size-4.5 text-icon-subtle" />
                        <h3 className="flex-1 font-semibold text-ink">{checklist.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete checklist ${checklist.title}`}
                          onClick={() => deleteChecklist.mutate(checklist.id)}
                        >
                          Delete
                        </Button>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="w-9 text-sm text-ink-subtle">{pct}%</span>
                        <div
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${done} of ${total} done`}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-glass-subtle"
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-transform duration-[var(--duration-base)]"
                            style={{
                              transform: `scaleX(${pct / 100})`,
                              transformOrigin: "left",
                            }}
                          />
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {checklist.items.map((item) => (
                          <li key={item.id} className="group flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-subtle-hover">
                            <Checkbox
                              aria-label={item.text}
                              checked={item.isChecked}
                              onCheckedChange={(checked) =>
                                toggleItem.mutate({ id: item.id, isChecked: checked === true })
                              }
                            />
                            <span
                              className={cn(
                                "flex-1 text-md text-ink",
                                item.isChecked && "text-ink-subtle line-through",
                              )}
                            >
                              {item.text}
                            </span>
                            <Input
                              type="date"
                              aria-label={`Due date for "${item.text}"`}
                              value={
                                item.dueDate
                                  ? new Date(item.dueDate).toISOString().slice(0, 10)
                                  : ""
                              }
                              onChange={(e) =>
                                setItemDue.mutate({
                                  id: item.id,
                                  dueDate: e.target.value ? new Date(e.target.value) : null,
                                })
                              }
                              className={cn(
                                "hidden h-7 w-34 shrink-0 text-sm sm:block",
                                item.dueDate &&
                                  !item.isChecked &&
                                  new Date(item.dueDate) < new Date() &&
                                  "border-[var(--fg-danger)] text-ink-danger",
                              )}
                            />
                            <Button
                              variant="ghost"
                              size="iconSm"
                              aria-label={`Convert "${item.text}" to a card`}
                              title="Convert to card"
                              onClick={() => convertItem.mutate(item.id)}
                            >
                              <ArrowUpRight aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="iconSm"
                              aria-label={`Delete item "${item.text}"`}
                              onClick={() => deleteItem.mutate(item.id)}
                            >
                              <X aria-hidden />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <form
                        className="mt-1.5 flex gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const draft = itemDrafts[checklist.id]?.trim();
                          if (!draft) return;
                          addItem.mutate({ checklistId: checklist.id, text: draft });
                          setItemDrafts((d) => ({ ...d, [checklist.id]: "" }));
                        }}
                      >
                        <Input
                          aria-label={`Add item to ${checklist.title}`}
                          value={itemDrafts[checklist.id] ?? ""}
                          onChange={(e) =>
                            setItemDrafts((d) => ({ ...d, [checklist.id]: e.target.value }))
                          }
                          placeholder="Add an item…"
                          className="h-8"
                        />
                        <Button type="submit" size="sm" variant="secondary">
                          Add
                        </Button>
                      </form>
                    </section>
                  );
                })}

                {/* comments */}
                <section aria-label="Comments" className="ps-8">
                  <div className="mb-2 flex items-center gap-2">
                    <MessageSquare aria-hidden className="size-4.5 text-icon-subtle" />
                    <h3 className="font-semibold text-ink">Comments</h3>
                  </div>
                  <form
                    className="mb-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!comment.trim()) return;
                      addComment.mutate({ cardId: card.id, body: comment.trim() });
                      setComment("");
                    }}
                  >
                    <Input
                      aria-label="Write a comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a comment…"
                    />
                    <Button type="submit" variant="secondary" loading={addComment.isPending}>
                      Send
                    </Button>
                  </form>
                  <ul className="space-y-2.5">
                    {card.comments.map((c) => (
                      <li key={c.id} className="glass-chip !rounded-md px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <time
                            dateTime={new Date(c.createdAt).toISOString()}
                            className="text-xs text-ink-subtle"
                          >
                            {new Date(c.createdAt).toLocaleString()}
                          </time>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label="Delete comment"
                            onClick={() => deleteComment.mutate(c.id)}
                          >
                            <X aria-hidden />
                          </Button>
                        </div>
                        <p className="text-md whitespace-pre-wrap text-ink">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* attachments */}
                {card.attachments.length > 0 ? (
                  <section aria-label="Attachments" className="ps-8">
                    <div className="mb-2 flex items-center gap-2">
                      <Paperclip aria-hidden className="size-4.5 text-icon-subtle" />
                      <h3 className="font-semibold text-ink">Attachments</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {card.attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 truncate text-md text-ink-link underline hover:text-ink-link-hover"
                          >
                            {a.fileName}
                          </a>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Delete attachment ${a.fileName}`}
                            onClick={() => deleteAttachment.mutate(a.id)}
                          >
                            <X aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {/* activity */}
                <section aria-label="Activity" className="ps-8">
                  <h3 className="mb-2 font-semibold text-ink">Activity</h3>
                  <ol className="space-y-1.5">
                    {card.activity.map((a) => (
                      <li key={a.id} className="flex items-baseline gap-2 text-sm">
                        <span className="font-medium text-ink-secondary">
                          {a.action.toLowerCase()}
                        </span>
                        <time
                          dateTime={new Date(a.createdAt).toISOString()}
                          className="text-ink-subtle"
                        >
                          {new Date(a.createdAt).toLocaleString()}
                        </time>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              {/* ── sidebar actions ── */}
              <aside aria-label="Card actions" className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                  Add to card
                </p>
                <LabelPicker
                  boardId={card.board.id}
                  cardId={card.id}
                  cardLabelIds={card.labels.map((l) => l.id)}
                >
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Tag aria-hidden />
                    Labels
                  </Button>
                </LabelPicker>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewChecklistOpen(true);
                    setNewChecklistTitle("Checklist");
                  }}
                >
                  <CheckSquare aria-hidden />
                  Checklist
                </Button>
                {newChecklistOpen ? (
                  <form
                    className="space-y-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newChecklistTitle.trim()) return;
                      addChecklist.mutate({ cardId: card.id, title: newChecklistTitle.trim() });
                      setNewChecklistOpen(false);
                    }}
                  >
                    <Input
                      aria-label="Checklist title"
                      autoFocus
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                    />
                    <Button type="submit" size="sm" className="w-full">
                      Add
                    </Button>
                  </form>
                ) : null}

                <div>
                  <label htmlFor="cardStart" className="mb-0.5 block text-xs text-ink-subtle">
                    Start date
                  </label>
                  <Input
                    id="cardStart"
                    type="date"
                    className="h-8"
                    defaultValue={toDateInputValue(card.startDate)}
                    onChange={(e) =>
                      update.mutate({
                        id: card.id,
                        startDate: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="cardDue" className="mb-0.5 block text-xs text-ink-subtle">
                    Due date
                  </label>
                  <Input
                    id="cardDue"
                    type="date"
                    className="h-8"
                    defaultValue={toDateInputValue(card.dueDate)}
                    onChange={(e) =>
                      update.mutate({
                        id: card.id,
                        dueDate: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className="w-full justify-start">
                      <Paintbrush aria-hidden />
                      Cover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" aria-label="Card cover">
                    <div className="grid grid-cols-4 gap-1.5">
                      {COVER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Cover color ${color}`}
                          onClick={() => update.mutate({ id: card.id, cover: `color:${color}` })}
                          className="h-9 cursor-pointer rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => update.mutate({ id: card.id, cover: null })}
                    >
                      Remove cover
                    </Button>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip aria-hidden />
                  Attachment
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  aria-label="Upload attachment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file);
                    e.target.value = "";
                  }}
                />

                <p className="pt-3 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                  Actions
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  loading={saveTemplate.isPending}
                  onClick={async () => {
                    await saveTemplate.mutateAsync({ cardId: card.id, name: card.title });
                    toast.success(`Saved "${card.title}" as a card template`);
                  }}
                >
                  <Copy aria-hidden />
                  Save as template
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={async () => {
                    await archive.mutateAsync({ id: card.id, archived: true });
                    toast.success("Card archived");
                    onClose();
                  }}
                >
                  <Archive aria-hidden />
                  Archive
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              </aside>
            </div>

            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this card?"
              description="The card, its checklists, comments and attachments will be permanently deleted."
              onConfirm={async () => {
                await remove.mutateAsync(card.id);
                await utils.board.byId.invalidate(card.board.id);
                toast.success("Card deleted");
                onClose();
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
