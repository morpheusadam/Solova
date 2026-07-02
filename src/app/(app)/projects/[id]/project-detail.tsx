"use client";

import { Pencil, Plus, SquareKanban, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProjectFormDialog } from "~/components/project/project-form";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { MoneyText } from "~/components/shared/money";
import { Field } from "~/components/shared/field";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { customFieldTypes } from "~/schemas/project";
import { api } from "~/trpc/react";

function CustomFieldValue({ type, value }: { type: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return <>—</>;
  if (type === "BOOLEAN") return <>{value ? "Yes" : "No"}</>;
  if (type === "DATE") return <>{new Date(String(value)).toLocaleDateString()}</>;
  const text = String(value);
  return text.startsWith("http") ? (
    <a
      href={text}
      target="_blank"
      rel="noreferrer"
      className="text-ink-link underline hover:text-ink-link-hover"
    >
      {text}
    </a>
  ) : (
    <>{text}</>
  );
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: project, isLoading } = api.project.byId.useQuery(projectId);

  const addNote = api.project.addNote.useMutation({
    onSuccess: () => utils.project.byId.invalidate(projectId),
  });
  const deleteNote = api.project.deleteNote.useMutation({
    onSuccess: () => utils.project.byId.invalidate(projectId),
  });
  const setField = api.project.setCustomField.useMutation({
    onSuccess: () => utils.project.byId.invalidate(projectId),
  });
  const deleteField = api.project.deleteCustomField.useMutation({
    onSuccess: () => utils.project.byId.invalidate(projectId),
  });
  const deleteProject = api.project.delete.useMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<(typeof customFieldTypes)[number]>("TEXT");
  const [fieldValue, setFieldValue] = useState("");

  if (isLoading || !project) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader
        title={project.name}
        description={`${project.company.name} · started ${new Date(project.startDate).toLocaleDateString()}${project.dueDate ? ` · due ${new Date(project.dueDate).toLocaleDateString()}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden />
              Delete
            </Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <span
          aria-hidden
          className="size-3 rounded-full"
          style={{ backgroundColor: project.color ?? "#8993A4" }}
        />
        <Badge
          variant={
            project.status === "ACTIVE"
              ? "success"
              : project.status === "ON_HOLD"
                ? "warning"
                : project.status === "CANCELLED"
                  ? "danger"
                  : "info"
          }
        >
          {project.status.replace("_", " ").toLowerCase()}
        </Badge>
        {project.billingModel ? (
          <Badge variant="info">
            {project.billingModel.replace(/_/g, " ").toLowerCase()}
            {project.rateMinor ? (
              <>
                {" · "}
                <MoneyText
                  minor={Number(project.rateMinor)}
                  currency={project.currencyCode}
                />
              </>
            ) : null}
          </Badge>
        ) : null}
        {project.description ? (
          <p className="text-md text-ink-secondary">{project.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* notes */}
        <section className="glass-card p-4 lg:col-span-2" aria-label="Notes">
          <h3 className="mb-3 font-semibold text-ink">Notes</h3>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              addNote.mutate({ projectId, body: note.trim() });
              setNote("");
            }}
          >
            <Textarea
              aria-label="New note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note…"
              className="min-h-10"
            />
            <Button type="submit" variant="secondary" loading={addNote.isPending}>
              Add
            </Button>
          </form>
          {!project.notes.length ? (
            <p className="text-md text-ink-subtle">No notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {project.notes.map((n) => (
                <li key={n.id} className="glass-chip !rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <time
                      dateTime={new Date(n.createdAt).toISOString()}
                      className="text-xs text-ink-subtle"
                    >
                      {new Date(n.createdAt).toLocaleString()}
                    </time>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Delete note"
                      onClick={() => deleteNote.mutate(n.id)}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                  <p className="text-md whitespace-pre-wrap text-ink">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* custom fields */}
        <section className="glass-card p-4" aria-label="Custom fields">
          <h3 className="mb-3 font-semibold text-ink">Custom fields</h3>
          <dl className="mb-4 space-y-2">
            {project.customFields.map((field) => (
              <div key={field.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-sm text-ink-subtle">{field.fieldKey}</dt>
                  <dd className="truncate text-md text-ink">
                    <CustomFieldValue type={field.fieldType} value={field.fieldValue} />
                  </dd>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Delete field ${field.fieldKey}`}
                  onClick={() => deleteField.mutate(field.id)}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ))}
            {!project.customFields.length ? (
              <p className="text-md text-ink-subtle">Define anything you need per project.</p>
            ) : null}
          </dl>

          <form
            className="space-y-2 border-t border-line pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!fieldKey.trim()) return;
              const value =
                fieldType === "NUMBER"
                  ? Number(fieldValue)
                  : fieldType === "BOOLEAN"
                    ? fieldValue === "true"
                    : fieldValue;
              setField.mutate({
                projectId,
                fieldKey: fieldKey.trim(),
                fieldType,
                fieldValue: value,
              });
              setFieldKey("");
              setFieldValue("");
            }}
          >
            <Field id="cfKey" label="Field name">
              <Input
                id="cfKey"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="e.g. Staging URL"
              />
            </Field>
            <Field id="cfType" label="Type">
              <Select
                value={fieldType}
                onValueChange={(v) => setFieldType(v as typeof fieldType)}
              >
                <SelectTrigger id="cfType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customFieldTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="cfValue" label="Value">
              {fieldType === "BOOLEAN" ? (
                <Select value={fieldValue || "true"} onValueChange={setFieldValue}>
                  <SelectTrigger id="cfValue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="cfValue"
                  type={fieldType === "NUMBER" ? "number" : fieldType === "DATE" ? "date" : "text"}
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" size="sm" className="w-full" loading={setField.isPending}>
              <Plus aria-hidden />
              Set field
            </Button>
          </form>
        </section>
      </div>

      {/* linked boards */}
      <section className="mt-4" aria-label="Boards">
        <h3 className="mb-3 font-semibold text-ink">Boards</h3>
        {!project.boards.length ? (
          <p className="text-md text-ink-subtle">No boards linked to this project.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {project.boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/boards/${board.id}`}
                  className="raised-card flex items-center gap-2.5 p-3.5"
                  aria-label={`Open board ${board.name}`}
                >
                  <SquareKanban aria-hidden className="size-4.5 text-icon-brand" />
                  <span className="font-medium text-ink">{board.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={{
          id: project.id,
          companyId: project.companyId,
          name: project.name,
          description: project.description,
          startDate: project.startDate,
          dueDate: project.dueDate,
          status: project.status,
          color: project.color,
          website: project.website,
          billingModel: project.billingModel,
          rateMinor: project.rateMinor != null ? Number(project.rateMinor) : null,
          currencyCode: project.currencyCode,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete project "${project.name}"?`}
        description="Its notes and custom fields are deleted; linked boards are kept (unlinked)."
        onConfirm={async () => {
          try {
            await deleteProject.mutateAsync(projectId);
            toast.success("Project deleted");
            await utils.project.invalidate();
            router.push("/projects");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
