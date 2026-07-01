"use client";

import { HandCoins, Plus } from "lucide-react";
import { useState } from "react";

import { Field } from "~/components/shared/field";
import { MoneyText, useMoney } from "~/components/shared/money";
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
import { minorUnitFactor } from "~/lib/money";
import { paymentMethods } from "~/schemas/accounting";
import { api } from "~/trpc/react";

function PaymentCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const money = useMoney();
  const factor = minorUnitFactor(money.currency);
  const { data: companies } = api.company.list.useQuery({});

  const [companyId, setCompanyId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<(typeof paymentMethods)[number]>("BANK");
  const [reference, setReference] = useState("");

  const { data: invoices } = api.accounting.invoices.useQuery(
    { companyId: companyId || undefined },
    { enabled: !!companyId },
  );
  const openInvoices = invoices?.filter((i) =>
    ["SENT", "PARTIAL", "OVERDUE"].includes(i.status),
  );

  const create = api.accounting.createPayment.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(amount) * factor);
    if (!companyId) return toast.error("Pick a company.");
    if (!amountMinor || amountMinor <= 0) return toast.error("Enter a positive amount.");
    try {
      await create.mutateAsync({
        companyId,
        invoiceId: invoiceId || null,
        amountMinor,
        paidAt: new Date(paidAt),
        method,
        reference: reference || null,
      });
      toast.success("Payment recorded — posted DR Bank / CR Accounts Receivable");
      await utils.accounting.invalidate();
      await utils.dashboard.invalidate();
      onOpenChange(false);
      setAmount("");
      setReference("");
      setInvoiceId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record payment" description="Money received from a client.">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field id="payCompany" label="Company" required>
            <Select
              value={companyId}
              onValueChange={(v) => {
                setCompanyId(v);
                setInvoiceId("");
              }}
            >
              <SelectTrigger id="payCompany">
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

          <Field id="payInvoice" label="Applies to invoice">
            <Select
              value={invoiceId}
              onValueChange={(v) => setInvoiceId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="payInvoice" disabled={!companyId}>
                <SelectValue placeholder="No specific invoice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific invoice</SelectItem>
                {openInvoices?.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoiceNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="payAmount" label={`Amount (${money.currency})`} required>
            <Input
              id="payAmount"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field id="payDate" label="Paid on" required>
            <Input
              id="payDate"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </Field>

          <Field id="payMethod" label="Method">
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger id="payMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="payRef" label="Reference">
            <Input
              id="payRef"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer id…"
            />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentsTab() {
  const { data: payments, isLoading } = api.accounting.payments.useQuery({ take: 100 });
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          Record payment
        </Button>
      </div>

      {!payments?.length ? (
        <EmptyState
          icon={HandCoins}
          title="No payments yet"
          description="Record money received; the ledger entry is posted automatically."
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Company
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Method
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Invoice
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line-glass-subtle">
                  <td className="px-4 py-2.5 font-medium text-ink">{p.company.name}</td>
                  <td className="px-4 py-2.5 text-end font-semibold text-ink-success">
                    <MoneyText minor={p.amountMinor} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {new Date(p.paidAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{p.method.toLowerCase()}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {p.invoice?.invoiceNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{p.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaymentCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
