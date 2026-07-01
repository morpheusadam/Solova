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
import { billingModels, companyInput, companyStatuses } from "~/schemas/company";
import { api } from "~/trpc/react";

type FormValues = z.input<typeof companyInput>;

const BILLING_LABEL: Record<(typeof billingModels)[number], string> = {
  MONTHLY_RETAINER: "Monthly retainer",
  PER_PROJECT: "Per project",
  PER_TASK: "Per task",
  HOURLY: "Hourly",
};

const RATE_LABEL: Record<(typeof billingModels)[number], string> = {
  MONTHLY_RETAINER: "Monthly retainer amount",
  PER_PROJECT: "Typical project rate",
  PER_TASK: "Rate per task",
  HOURLY: "Hourly rate",
};

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the dialog edits, otherwise it creates. */
  company?: (FormValues & { id: string; defaultRateMinor?: number | null }) | null;
}) {
  const utils = api.useUtils();
  const money = useMoney();

  const form = useForm<FormValues>({
    resolver: zodResolver(companyInput),
    values: company
      ? { ...company }
      : {
          name: "",
          billingModel: "MONTHLY_RETAINER",
          status: "ACTIVE",
        },
  });

  const create = api.company.create.useMutation();
  const update = api.company.update.useMutation();

  const billingModel = form.watch("billingModel");
  const currency = form.watch("currencyCode") ?? money.currency;
  const factor = minorUnitFactor(currency);

  async function onSubmit(values: FormValues) {
    try {
      if (company) {
        await update.mutateAsync({ id: company.id, data: values });
        toast.success("Company updated");
      } else {
        await create.mutateAsync(companyInput.parse(values));
        toast.success("Company created");
      }
      await utils.company.invalidate();
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
        title={company ? "Edit company" : "New company"}
        description="Client record with its billing model."
        wide
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Name" required error={errors.name?.message}>
            <Input id="name" {...form.register("name")} placeholder="Acme Studio" />
          </Field>
          <Field id="legalName" label="Legal name" error={errors.legalName?.message}>
            <Input id="legalName" {...form.register("legalName")} />
          </Field>

          <Field id="billingModel" label="Billing model" required>
            <Select
              value={billingModel}
              onValueChange={(v) => form.setValue("billingModel", v as FormValues["billingModel"])}
            >
              <SelectTrigger id="billingModel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {billingModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {BILLING_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="defaultRate"
            label={`${RATE_LABEL[billingModel as (typeof billingModels)[number]]} (${currency})`}
            error={errors.defaultRateMinor?.message}
          >
            <Input
              id="defaultRate"
              type="number"
              inputMode="decimal"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              {...form.register("defaultRateMinor", {
                setValueAs: (v: string) =>
                  v === "" || v === null ? null : Math.round(parseFloat(v) * factor),
              })}
              defaultValue={
                company?.defaultRateMinor != null
                  ? company.defaultRateMinor / factor
                  : undefined
              }
            />
          </Field>

          <Field id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" {...form.register("email")} />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...form.register("phone")} />
          </Field>
          <Field id="website" label="Website" error={errors.website?.message}>
            <Input id="website" type="url" placeholder="https://" {...form.register("website")} />
          </Field>
          <Field id="taxId" label="Tax ID" error={errors.taxId?.message}>
            <Input id="taxId" {...form.register("taxId")} />
          </Field>
          <Field id="city" label="City" error={errors.city?.message}>
            <Input id="city" {...form.register("city")} />
          </Field>
          <Field id="country" label="Country" error={errors.country?.message}>
            <Input id="country" {...form.register("country")} />
          </Field>
          <Field id="currencyCode" label="Currency (3-letter)" error={errors.currencyCode?.message}>
            <Input
              id="currencyCode"
              maxLength={3}
              placeholder={money.currency}
              {...form.register("currencyCode", {
                setValueAs: (v: string) => (v ? v.toUpperCase() : null),
              })}
            />
          </Field>
          <Field id="status" label="Status">
            <Select
              value={form.watch("status") ?? "ACTIVE"}
              onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companyStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field id="address" label="Address" error={errors.address?.message}>
              <Input id="address" {...form.register("address")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="notes" label="Notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {company ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
