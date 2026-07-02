"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useState } from "react";
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
  const createContact = api.contact.create.useMutation();

  // Inline contacts you can add while defining a NEW company.
  type DraftContact = { name: string; role: string; email: string; phone: string };
  const [contacts, setContacts] = useState<DraftContact[]>([]);

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
        const validContacts = contacts.filter((c) => c.name.trim());
        for (const c of validContacts) {
          await createContact.mutateAsync({
            companyId: created.id,
            name: c.name.trim(),
            role: c.role || null,
            email: c.email || null,
            phone: c.phone || null,
            isPrimary: false,
          });
        }
        await utils.contact.invalidate();
        toast.success(
          validContacts.length
            ? `Company created with ${validContacts.length} contact${validContacts.length > 1 ? "s" : ""}`
            : "Company created",
        );
      }
      await utils.company.invalidate();
      onOpenChange(false);
      form.reset();
      setContacts([]);
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

          {/* Inline contacts (create mode) — add the people at this company here. */}
          {!company ? (
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-secondary">Contacts</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setContacts((cs) => [...cs, { name: "", role: "", email: "", phone: "" }])
                  }
                >
                  <Plus aria-hidden />
                  Add contact
                </Button>
              </div>
              {contacts.length === 0 ? (
                <p className="text-sm text-ink-subtle">
                  Optionally add one or more people at this company.
                </p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        aria-label={`Contact ${i + 1} name`}
                        placeholder="Name"
                        value={c.name}
                        onChange={(e) =>
                          setContacts((cs) =>
                            cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        className="min-w-32 flex-1"
                      />
                      <Input
                        aria-label={`Contact ${i + 1} role`}
                        placeholder="Role"
                        value={c.role}
                        onChange={(e) =>
                          setContacts((cs) =>
                            cs.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)),
                          )
                        }
                        className="min-w-24 flex-1"
                      />
                      <Input
                        aria-label={`Contact ${i + 1} email`}
                        type="email"
                        placeholder="Email"
                        value={c.email}
                        onChange={(e) =>
                          setContacts((cs) =>
                            cs.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                          )
                        }
                        className="min-w-32 flex-1"
                      />
                      <Input
                        aria-label={`Contact ${i + 1} phone`}
                        type="tel"
                        placeholder="Phone"
                        value={c.phone}
                        onChange={(e) =>
                          setContacts((cs) =>
                            cs.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)),
                          )
                        }
                        className="min-w-28 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Remove contact ${i + 1}`}
                        onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
