"use client";

import { Plus, Timer, X } from "lucide-react";
import { useState } from "react";

import { Field } from "~/components/shared/field";
import { MoneyText, useMoney } from "~/components/shared/money";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ManualEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const { data: companies } = api.company.list.useQuery({});

  const [companyId, setCompanyId] = useState("");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [hours, setHours] = useState("1");

  const create = api.timeEntry.create.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durationSeconds = Math.round(parseFloat(hours) * 3600);
    if (!companyId) return toast.error("Pick a company.");
    if (!durationSeconds || durationSeconds <= 0)
      return toast.error("Enter a positive duration.");
    const start = new Date(startedAt);
    try {
      await create.mutateAsync({
        companyId,
        description: description || null,
        startedAt: start,
        endedAt: new Date(start.getTime() + durationSeconds * 1000),
        durationSeconds,
        billable: true,
      });
      toast.success("Time entry added");
      await Promise.all([utils.timeEntry.invalidate(), utils.dashboard.invalidate()]);
      onOpenChange(false);
      setDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add entry");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Log time" description="Add a manual time entry.">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field id="teCompany" label="Company" required>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="teCompany">
                <SelectValue placeholder="Select…" />
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
          <Field id="teHours" label="Duration (hours)" required>
            <Input
              id="teHours"
              type="number"
              min={0.1}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </Field>
          <Field id="teStart" label="Started at" required>
            <Input
              id="teStart"
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="teDesc" label="Description">
              <Input
                id="teDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
              />
            </Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TimeView() {
  const utils = api.useUtils();
  const money = useMoney();
  const { data: entries, isLoading } = api.timeEntry.list.useQuery({});
  const remove = api.timeEntry.delete.useMutation({
    onSuccess: () =>
      Promise.all([utils.timeEntry.invalidate(), utils.dashboard.invalidate()]),
  });
  const [addOpen, setAddOpen] = useState(false);

  const totalSeconds = entries?.reduce((s, e) => s + e.durationSeconds, 0) ?? 0;
  const billableMinor =
    entries?.reduce(
      (s, e) =>
        s + (e.billable && e.rateMinor ? (e.durationSeconds / 3600) * e.rateMinor : 0),
      0,
    ) ?? 0;

  return (
    <>
      <PageHeader
        title="Time"
        description={`${formatDuration(totalSeconds)} logged · billable value ${money.format(Math.round(billableMinor))}`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus aria-hidden />
            Log time
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !entries?.length ? (
        <EmptyState
          icon={Timer}
          title="No time entries"
          description="Start a timer from the top bar, or log time manually."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Log time
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Company
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Description
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Started
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Duration
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Value
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line-glass-subtle">
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {entry.company.name}
                    {!entry.endedAt ? (
                      <Badge variant="info" className="ms-2">
                        running
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {entry.description ?? entry.card?.title ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {new Date(entry.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-end font-medium text-ink">
                    {entry.endedAt ? formatDuration(entry.durationSeconds) : "…"}
                  </td>
                  <td className="px-4 py-2.5 text-end text-ink-secondary">
                    {entry.billable && entry.rateMinor ? (
                      <MoneyText
                        minor={Math.round((entry.durationSeconds / 3600) * entry.rateMinor)}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Delete time entry"
                      onClick={() => remove.mutate(entry.id)}
                    >
                      <X aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ManualEntryDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
