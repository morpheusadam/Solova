"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Field } from "~/components/shared/field";
import { useMoney } from "~/components/shared/money";
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
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { minorUnitFactor } from "~/lib/money";
import { cn } from "~/lib/utils";
import { billingModels } from "~/schemas/company";
import { projectInput, projectStatuses } from "~/schemas/project";
import { api } from "~/trpc/react";

type FormValues = z.input<typeof projectInput>;

const BILLING_LABEL: Record<(typeof billingModels)[number], string> = {
  MONTHLY_RETAINER: "Monthly retainer",
  PER_PROJECT: "Per project (fixed)",
  PER_TASK: "Per task",
  HOURLY: "Hourly",
};

const PROJECT_COLORS = [
  "#0079BF",
  "#61BD4F",
  "#FF9F1A",
  "#EB5A46",
  "#C377E0",
  "#00C2E0",
  "#FF78CB",
  "#344563",
];

function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: (FormValues & { id: string }) | null;
  defaultCompanyId?: string;
}) {
  const utils = api.useUtils();
  const money = useMoney();
  const { data: companies } = api.company.list.useQuery({});

  // Memoized so `new Date()` (create mode) doesn't change identity every render,
  // which would make react-hook-form reset the form on each keystroke.
  const defaults = useMemo<FormValues>(
    () =>
      project
        ? { ...project }
        : {
            companyId: defaultCompanyId ?? "",
            name: "",
            startDate: new Date(),
            status: "PLANNING",
            color: PROJECT_COLORS[0],
            billingModel: null,
            rateMinor: null,
          },
    [project, defaultCompanyId],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(projectInput),
    values: defaults,
  });

  const create = api.project.create.useMutation();
  const update = api.project.update.useMutation();

  const currency = money.currency;
  const factor = minorUnitFactor(currency);

  async function onSubmit(values: FormValues) {
    try {
      if (project) {
        await update.mutateAsync({ id: project.id, data: values });
        toast.success("Project updated");
      } else {
        await create.mutateAsync(projectInput.parse(values));
        toast.success("Project created");
      }
      await utils.project.invalidate();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  const errors = form.formState.errors;
  const color = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={project ? "Edit project" : "New project"}
        description="A body of work for a company, with its own notes and custom fields."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="projectName" label="Name" required error={errors.name?.message}>
              <Input id="projectName" {...form.register("name")} placeholder="Website Redesign" />
            </Field>
          </div>

          <Field id="projectCompany" label="Company" required error={errors.companyId?.message}>
            <Select
              value={form.watch("companyId")}
              onValueChange={(v) => form.setValue("companyId", v)}
            >
              <SelectTrigger id="projectCompany" disabled={!!defaultCompanyId}>
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

          <Field id="projectStatus" label="Status">
            <Select
              value={form.watch("status") ?? "PLANNING"}
              onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
            >
              <SelectTrigger id="projectStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ").toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field
              id="projectWebsite"
              label="Website"
              hint="We'll fetch its favicon and show it on the project."
              error={errors.website?.message}
            >
              <Input
                id="projectWebsite"
                type="url"
                placeholder="https://example.com"
                {...form.register("website")}
              />
            </Field>
          </div>

          <Field id="projectStart" label="Start date" required error={errors.startDate?.message as string}>
            <Input
              id="projectStart"
              type="date"
              defaultValue={toDateInput(project?.startDate ?? new Date())}
              {...form.register("startDate", {
                setValueAs: (v: string) => (v ? new Date(v) : undefined),
              })}
            />
          </Field>
          <Field id="projectDue" label="Due date" error={errors.dueDate?.message as string}>
            <Input
              id="projectDue"
              type="date"
              defaultValue={toDateInput(project?.dueDate)}
              {...form.register("dueDate", {
                setValueAs: (v: string) => (v ? new Date(v) : null),
              })}
            />
          </Field>

          <div className="sm:col-span-2">
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-ink-secondary">
                Color
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={color === c}
                    onClick={() => form.setValue("color", c)}
                    className={cn(
                      "size-8 cursor-pointer rounded-sm",
                      color === c && "ring-2 ring-[var(--border-focus)] ring-offset-1",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <Field id="projectBilling" label="Billing model" hint="Leave to inherit the company's default.">
            <Select
              value={form.watch("billingModel") ?? "INHERIT"}
              onValueChange={(v) =>
                form.setValue(
                  "billingModel",
                  v === "INHERIT" ? null : (v as FormValues["billingModel"]),
                )
              }
            >
              <SelectTrigger id="projectBilling">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INHERIT">Inherit from company</SelectItem>
                {billingModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {BILLING_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="projectRate"
            label={`Price / rate (${currency})`}
            hint="Fixed price, hourly rate, or per-task amount."
            error={errors.rateMinor?.message}
          >
            <Input
              id="projectRate"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              defaultValue={project?.rateMinor != null ? Number(project.rateMinor) / factor : undefined}
              {...form.register("rateMinor", {
                setValueAs: (v: string) =>
                  v === "" || v == null ? null : Math.round(parseFloat(v) * factor),
              })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field id="projectDescription" label="Description" error={errors.description?.message}>
              <Textarea id="projectDescription" rows={3} {...form.register("description")} />
            </Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
