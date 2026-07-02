"use client";

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
import { api } from "~/trpc/react";

export function BoardFormDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Limits the project list to one company (e.g. opened from a company page). */
  companyId?: string;
}) {
  const utils = api.useUtils();
  const { data: templates } = api.board.templates.useQuery();
  // Board is chosen by PROJECT; the company is taken from the project.
  const { data: projects } = api.project.list.useQuery({
    companyId: companyId || undefined,
  });

  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [background, setBackground] = useState<string>("gradient:brand");
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects?.find((p) => p.id === projectId);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Board name is required.");
    if (!selectedProject) return setError("Pick a project — every board belongs to one.");
    setError(null);
    try {
      if (templateId) {
        await fromTemplate.mutateAsync({
          templateId,
          companyId: selectedProject.companyId,
          projectId: selectedProject.id,
          name: name.trim(),
        });
      } else {
        await create.mutateAsync({
          companyId: selectedProject.companyId,
          projectId: selectedProject.id,
          name: name.trim(),
          background,
          withDefaultLists: true,
        });
      }
      toast.success("Board created");
      await utils.board.invalidate();
      onOpenChange(false);
      setName("");
      setProjectId("");
      setTemplateId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create board");
    }
  }

  const create = api.board.create.useMutation();
  const fromTemplate = api.board.fromTemplate.useMutation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New board" description="A Kanban board bound to a project.">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field id="boardName" label="Name" required error={error ?? undefined}>
            <Input
              id="boardName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Website Redesign"
            />
          </Field>

          <Field
            id="boardProject"
            label="Project"
            required
            hint={selectedProject ? `Company: ${selectedProject.company.name}` : undefined}
          >
            {!projects?.length ? (
              <p className="text-sm text-ink-subtle">
                No projects yet.{" "}
                <Link href="/projects" className="text-ink-link underline">
                  Create a project
                </Link>{" "}
                first — boards belong to a project.
              </p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="boardProject">
                  <SelectValue placeholder="Select a project…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {!companyId ? ` · ${p.company.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field id="boardTemplate" label="Start from template">
            <Select
              value={templateId}
              onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="boardTemplate">
                <SelectValue placeholder="Blank (To Do / Doing / Done)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Blank (To Do / Doing / Done)</SelectItem>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Background
            </legend>
            <BackgroundPicker value={background} onSelect={(v) => setBackground(v ?? "wp-aurora")} />
          </fieldset>

          <DialogFooter>
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!projects?.length}
              loading={create.isPending || fromTemplate.isPending}
            >
              Create board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
