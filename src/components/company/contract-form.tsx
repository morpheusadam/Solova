"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  contractBillingPeriods,
  contractInput,
  contractStatuses,
} from "~/schemas/contract";
import { api } from "~/trpc/react";

type FormValues = z.input<typeof contractInput>;

function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function ContractFormDialog({
  open,
  onOpenChange,
  companyId,
  contract,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  contract?:
    | (Omit<FormValues, "valueMinor" | "monthlyAmountMinor"> & {
        id: string;
        valueMinor?: number | null;
        monthlyAmountMinor?: number | null;
      })
    | null;
}) {
  const utils = api.useUtils();
  const money = useMoney();
  const factor = minorUnitFactor(money.currency);

  const form = useForm<FormValues>({
    resolver: zodResolver(contractInput),
    values: contract
      ? { ...contract, companyId }
      : { companyId, title: "", status: "DRAFT" },
  });

  const create = api.contract.create.useMutation();
  const update = api.contract.update.useMutation();

  async function onSubmit(values: FormValues) {
    try {
      if (contract) {
        await update.mutateAsync({ id: contract.id, data: values });
        toast.success("Contract updated");
      } else {
        await create.mutateAsync(contractInput.parse(values));
        toast.success("Contract created");
      }
      await utils.contract.invalidate();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={contract ? "Edit contract" : "New contract"}
        description="What you charge this company and when."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="title" label="Title" required error={errors.title?.message}>
              <Input id="title" {...form.register("title")} placeholder="2026 Maintenance Retainer" />
            </Field>
          </div>

          <Field id="startDate" label="Start date" error={errors.startDate?.message as string}>
            <Input
              id="startDate"
              type="date"
              defaultValue={toDateInput(contract?.startDate)}
              {...form.register("startDate", {
                setValueAs: (v: string) => (v ? new Date(v) : null),
              })}
            />
          </Field>
          <Field id="endDate" label="End date" error={errors.endDate?.message as string}>
            <Input
              id="endDate"
              type="date"
              defaultValue={toDateInput(contract?.endDate)}
              {...form.register("endDate", {
                setValueAs: (v: string) => (v ? new Date(v) : null),
              })}
            />
          </Field>

          <Field
            id="valueMinor"
            label={`Total value (${money.currency})`}
            error={errors.valueMinor?.message}
          >
            <Input
              id="valueMinor"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              defaultValue={contract?.valueMinor != null ? contract.valueMinor / factor : undefined}
              {...form.register("valueMinor", {
                setValueAs: (v: string) =>
                  v === "" || v == null ? null : Math.round(parseFloat(v) * factor),
              })}
            />
          </Field>
          <Field
            id="monthlyAmountMinor"
            label={`Monthly amount (${money.currency})`}
            hint="How much you take from this company monthly."
            error={errors.monthlyAmountMinor?.message}
          >
            <Input
              id="monthlyAmountMinor"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              defaultValue={
                contract?.monthlyAmountMinor != null
                  ? contract.monthlyAmountMinor / factor
                  : undefined
              }
              {...form.register("monthlyAmountMinor", {
                setValueAs: (v: string) =>
                  v === "" || v == null ? null : Math.round(parseFloat(v) * factor),
              })}
            />
          </Field>

          <Field id="billingPeriod" label="Billing period">
            <Select
              value={form.watch("billingPeriod") ?? ""}
              onValueChange={(v) =>
                form.setValue("billingPeriod", v as FormValues["billingPeriod"])
              }
            >
              <SelectTrigger id="billingPeriod">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {contractBillingPeriods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace("_", " ").toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="contractStatus" label="Status">
            <Select
              value={form.watch("status") ?? "DRAFT"}
              onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
            >
              <SelectTrigger id="contractStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contractStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field id="contractNotes" label="Notes" error={errors.notes?.message}>
              <Textarea id="contractNotes" rows={3} {...form.register("notes")} />
            </Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {contract ? "Save changes" : "Create contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
