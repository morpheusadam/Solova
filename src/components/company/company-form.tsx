"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Field } from "~/components/shared/field";
import { useMoney } from "~/components/shared/money";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
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
  const attachContact = api.contact.update.useMutation();

  // Attach EXISTING contacts to the new company (chosen from a dropdown).
  const { data: allContacts } = api.contact.list.useQuery({}, { enabled: !company });
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Clear the selection whenever the dialog closes so a stale pick can't carry
  // into the next company (and can't reference a since-deleted contact).
  useEffect(() => {
    if (!open) setSelectedContactIds([]);
  }, [open]);

  const billingModel = form.watch("billingModel");
  const currency = form.watch("currencyCode") ?? money.currency;
  const factor = minorUnitFactor(currency);

  async function onSubmit(values: FormValues) {
    try {
      if (company) {
        await update.mutateAsync({ id: company.id, data: values });
        toast.success("Company updated");
      } else {
        const created = await create.mutateAsync(companyInput.parse(values));
        // Only attach contacts that still exist (guards against deletions).
        const validIds = selectedContactIds.filter((id) =>
          allContacts?.some((c) => c.id === id),
        );
        let attached = 0;
        for (const contactId of validIds) {
          try {
            await attachContact.mutateAsync({ id: contactId, data: { companyId: created.id } });
            attached += 1;
          } catch {
            // contact was removed meanwhile — skip it rather than fail the create
          }
        }
        await utils.contact.invalidate();
        toast.success(
          attached
            ? `Company created with ${attached} contact${attached > 1 ? "s" : ""}`
            : "Company created",
        );
      }
      await utils.company.invalidate();
      onOpenChange(false);
      form.reset();
      setSelectedContactIds([]);
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

          {/* Attach existing contacts to this company (choose from the dropdown). */}
          {!company ? (
            <div className="sm:col-span-2">
              <Field id="companyContacts" label="Contacts">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      id="companyContacts"
                      className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-line-glass bg-surface-glass px-3 text-md text-ink backdrop-blur-[6px]"
                    >
                      <span className={selectedContactIds.length ? "text-ink" : "text-ink-subtle"}>
                        {selectedContactIds.length
                          ? `${selectedContactIds.length} contact${selectedContactIds.length > 1 ? "s" : ""} selected`
                          : "Select contacts…"}
                      </span>
                      <ChevronDown aria-hidden className="size-4 shrink-0 text-icon-subtle" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[--radix-popover-trigger-width]">
                    {!allContacts?.length ? (
                      <p className="text-sm text-ink-subtle">
                        No contacts yet. Create them on the Contacts page, then attach them here.
                      </p>
                    ) : (
                      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                        {allContacts.map((c) => (
                          <li key={c.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1.5 hover:bg-subtle-hover">
                              <Checkbox
                                checked={selectedContactIds.includes(c.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedContactIds((ids) =>
                                    checked === true
                                      ? [...ids, c.id]
                                      : ids.filter((x) => x !== c.id),
                                  )
                                }
                              />
                              <span className="flex-1 truncate text-md text-ink">
                                {c.name}
                                {c.company ? (
                                  <span className="text-ink-subtle"> · {c.company.name}</span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>
              </Field>
              <p className="mt-1 text-sm text-ink-subtle">
                Pick existing contacts to attach to this company (optional).
              </p>
            </div>
          ) : null}

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
