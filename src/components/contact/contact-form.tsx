"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { contactInput } from "~/schemas/contact";
import { api } from "~/trpc/react";

type FormValues = z.input<typeof contactInput>;

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: (FormValues & { id: string }) | null;
  /** Locks the company selector (opened from a company page). */
  defaultCompanyId?: string;
}) {
  const utils = api.useUtils();
  const { data: companies } = api.company.list.useQuery({});

  const defaults = useMemo<FormValues>(
    () =>
      contact
        ? { ...contact }
        : { companyId: defaultCompanyId ?? "", name: "", isPrimary: false },
    [contact, defaultCompanyId],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(contactInput),
    values: defaults,
  });

  const create = api.contact.create.useMutation();
  const update = api.contact.update.useMutation();
  const errors = form.formState.errors;

  async function onSubmit(values: FormValues) {
    try {
      if (contact) {
        await update.mutateAsync({ id: contact.id, data: values });
        toast.success("Contact updated");
      } else {
        await create.mutateAsync(contactInput.parse(values));
        toast.success("Contact created");
      }
      await utils.contact.invalidate();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={contact ? "Edit contact" : "New contact"}
        description="A person at a company, with all their details."
        wide
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <Field id="contactName" label="Name" required error={errors.name?.message}>
            <Input id="contactName" {...form.register("name")} placeholder="Jane Doe" />
          </Field>
          <Field id="contactCompany" label="Company" required error={errors.companyId?.message}>
            <Select
              value={form.watch("companyId")}
              onValueChange={(v) => form.setValue("companyId", v)}
            >
              <SelectTrigger id="contactCompany" disabled={!!defaultCompanyId}>
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

          <Field id="contactRole" label="Role / title" error={errors.role?.message}>
            <Input id="contactRole" {...form.register("role")} placeholder="Product Manager" />
          </Field>
          <Field id="contactEmail" label="Email" error={errors.email?.message}>
            <Input id="contactEmail" type="email" {...form.register("email")} />
          </Field>
          <Field id="contactPhone" label="Phone" error={errors.phone?.message}>
            <Input id="contactPhone" type="tel" {...form.register("phone")} />
          </Field>
          <Field id="contactMobile" label="Mobile" error={errors.mobile?.message}>
            <Input id="contactMobile" type="tel" {...form.register("mobile")} />
          </Field>
          <Field id="contactWhatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
            <Input id="contactWhatsapp" {...form.register("whatsapp")} />
          </Field>
          <Field id="contactTelegram" label="Telegram" error={errors.telegram?.message}>
            <Input id="contactTelegram" {...form.register("telegram")} placeholder="@handle" />
          </Field>
          <Field id="contactWebsite" label="Website" error={errors.website?.message}>
            <Input id="contactWebsite" type="url" placeholder="https://" {...form.register("website")} />
          </Field>
          <Field id="contactAddress" label="Address" error={errors.address?.message}>
            <Input id="contactAddress" {...form.register("address")} />
          </Field>

          <div className="sm:col-span-2">
            <Field id="contactNotes" label="Notes" error={errors.notes?.message}>
              <Textarea id="contactNotes" rows={2} {...form.register("notes")} />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-md text-ink sm:col-span-2">
            <Switch
              checked={form.watch("isPrimary") ?? false}
              onCheckedChange={(c) => form.setValue("isPrimary", c)}
            />
            Primary contact for this company
          </label>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {contact ? "Save changes" : "Create contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
