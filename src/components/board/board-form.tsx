"use client";

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
  /** Preselects the company (e.g. when opened from a company page). */
  companyId?: string;
}) {
  const utils = api.useUtils();
  const { data: companies } = api.company.list.useQuery({});
  const { data: templates } = api.board.templates.useQuery();

  const [name, setName] = useState("");
  const [company, setCompany] = useState(companyId ?? "");
  const [projectId, setProjectId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [background, setBackground] = useState<string>("gradient:brand");
  const [error, setError] = useState<string | null>(null);

  const { data: projects } = api.project.list.useQuery(
    { companyId: company || undefined },
    { enabled: !!company },
  );

  const create = api.board.create.useMutation();
  const fromTemplate = api.board.fromTemplate.useMutation();

  const selectedCompany = company || companyId || "";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Board name is required.");
    if (!selectedCompany) return setError("Pick a company — every board belongs to one.");
    setError(null);
    try {
      if (templateId) {
        await fromTemplate.mutateAsync({
          templateId,
          companyId: selectedCompany,
          projectId: projectId || null,
          name: name.trim(),
        });
      } else {
        await create.mutateAsync({
          companyId: selectedCompany,
          projectId: projectId || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New board" description="A Kanban board bound to a company.">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field id="boardName" label="Name" required error={error ?? undefined}>
            <Input
              id="boardName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Website Redesign"
            />
          </Field>

          {!companyId ? (
            <Field id="boardCompany" label="Company" required>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger id="boardCompany">
                  <SelectValue placeholder="Select a company…" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field id="boardProject" label="Project (optional)">
            <Select
              value={projectId}
              onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="boardProject" disabled={!selectedCompany}>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
