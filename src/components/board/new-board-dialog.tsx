"use client";

import { ChevronLeft, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BackgroundPicker } from "~/components/shared/background-picker";
import { Field } from "~/components/shared/field";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "~/components/ui/toast";
import { backgroundCss } from "~/lib/wallpapers";
import { api, type RouterOutputs } from "~/trpc/react";

type Template = RouterOutputs["board"]["templates"][number];
type TemplatePayload = { lists?: string[]; background?: string };
type Choice = { kind: "blank" } | { kind: "template"; template: Template };

/**
 * Trello-style board creation: first pick a starting point (blank or a
 * template), then give it a title and a project. Templates only appear here,
 * as part of creating a board.
 */
export function NewBoardDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}) {
  const utils = api.useUtils();
  const { data: templates } = api.board.templates.useQuery(undefined, { enabled: open });
  const { data: projects } = api.project.list.useQuery(undefined, { enabled: open });

  const [choice, setChoice] = useState<Choice | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [background, setBackground] = useState<string>("gradient:brand");

  const create = api.board.create.useMutation();
  const fromTemplate = api.board.fromTemplate.useMutation();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      // reset for the next time it opens
      setChoice(null);
      setTitle("");
      setBackground("gradient:brand");
      setProjectId(defaultProjectId ?? "");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return;
    const template = choice.kind === "template" ? choice.template : null;
    const finalTitle = title.trim() || template?.name || "";
    if (!finalTitle) return toast.error("Give the board a title.");
    const project = projects?.find((p) => p.id === projectId);
    if (!project) return toast.error("Pick a project for this board.");
    try {
      if (template) {
        await fromTemplate.mutateAsync({
          templateId: template.id,
          companyId: project.companyId,
          projectId: project.id,
          name: finalTitle,
        });
      } else {
        await create.mutateAsync({
          companyId: project.companyId,
          projectId: project.id,
          name: finalTitle,
          background,
          withDefaultLists: true,
        });
      }
      toast.success("Board created");
      await utils.board.invalidate();
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create board");
    }
  }

  const template = choice?.kind === "template" ? choice.template : null;
  const previewLists = template
    ? ((template.payload as TemplatePayload).lists ?? [])
    : ["To Do", "Doing", "Done"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={choice ? "Name your board" : "Create a board"}
        description={
          choice ? "Give it a title and pick a project." : "Start blank or from a template."
        }
        wide={!choice}
      >
        {/* Step 1 — choose a starting point */}
        {!choice ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setChoice({ kind: "blank" })}
              className="raised-card flex flex-col overflow-hidden text-start"
              aria-label="Blank board"
            >
              <div
                aria-hidden
                className="flex h-16 items-end gap-1 p-2"
                style={{ background: "var(--canvas-gradient)" }}
              >
                {["To Do", "Doing", "Done"].map((l) => (
                  <span key={l} className="h-full w-8 rounded-xs bg-white/25" title={l} />
                ))}
              </div>
              <div className="p-3">
                <p className="font-semibold text-ink">Blank board</p>
                <p className="mt-0.5 text-sm text-ink-subtle">To Do · Doing · Done</p>
              </div>
            </button>

            {templates?.map((t) => {
              const payload = t.payload as TemplatePayload;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChoice({ kind: "template", template: t })}
                  className="raised-card flex flex-col overflow-hidden text-start"
                  aria-label={`Use template ${t.name}`}
                >
                  <div
                    aria-hidden
                    className="flex h-16 items-end gap-1 p-2"
                    style={{
                      background: backgroundCss(payload.background) ?? "var(--canvas-gradient)",
                    }}
                  >
                    {(payload.lists ?? []).slice(0, 4).map((l) => (
                      <span key={l} className="h-full w-8 rounded-xs bg-white/25" title={l} />
                    ))}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-ink">{t.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-ink-subtle">
                      {(payload.lists ?? []).join(" · ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Step 2 — title + project */
          <form onSubmit={onSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="flex cursor-pointer items-center gap-1 text-sm text-ink-secondary hover:text-ink"
            >
              <ChevronLeft aria-hidden className="size-4" />
              Back to templates
            </button>

            <div
              className="flex h-20 items-end rounded-md p-3"
              style={{
                background:
                  (template && backgroundCss((template.payload as TemplatePayload).background)) ??
                  "var(--canvas-gradient)",
              }}
            >
              <div className="flex flex-wrap gap-1.5">
                {previewLists.map((l) => (
                  <span
                    key={l}
                    className="rounded-sm bg-black/35 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <Field id="nbTitle" label="Board title" required>
              <Input
                id="nbTitle"
                autoFocus
                value={title || template?.name || ""}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </Field>

            <Field id="nbProject" label="Project" required hint="The board's company comes from its project.">
              {!projects?.length ? (
                <p className="text-sm text-ink-subtle">
                  No projects yet.{" "}
                  <Link href="/projects" className="text-ink-link underline">
                    Create a project
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="nbProject">
                    <SelectValue placeholder="Select a project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            {choice.kind === "blank" ? (
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium text-ink-secondary">
                  Background
                </legend>
                <BackgroundPicker value={background} onSelect={(v) => setBackground(v ?? "wp-aurora")} />
              </fieldset>
            ) : null}

            <DialogFooter>
              <Button variant="subtle" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!projects?.length}
                loading={create.isPending || fromTemplate.isPending}
              >
                <SquareKanban aria-hidden />
                Create board
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
