"use client";

import { Plus, Receipt, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Field } from "~/components/shared/field";
import { MoneyText, useMoney } from "~/components/shared/money";
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
import { minorUnitFactor } from "~/lib/money";
import { api } from "~/trpc/react";

export const INVOICE_BADGE: Record<
  string,
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "danger",
  SENT: "info",
  DRAFT: "neutral",
  VOID: "neutral",
};

interface DraftLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

function InvoiceCreateDialog({
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
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const create = api.accounting.createInvoice.useMutation();

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Pick a company first.");
    const validLines = lines.filter((l) => l.description.trim() && l.unitPrice > 0);
    if (!validLines.length) return toast.error("Add at least one line item.");
    try {
      await create.mutateAsync({
        companyId,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        taxMinor: 0,
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity,
          unitPriceMinor: Math.round(l.unitPrice * factor),
        })),
      });
      toast.success("Draft invoice created");
      await utils.accounting.invalidate();
      onOpenChange(false);
      setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New invoice" description="Created as a draft; issue it to post to the ledger." wide>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="invCompany" label="Company" required>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger id="invCompany">
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
            <Field id="invIssue" label="Issue date" required>
              <Input
                id="invIssue"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </Field>
            <Field id="invDue" label="Due date">
              <Input
                id="invDue"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-secondary">Line items</legend>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    aria-label={`Line ${i + 1} description`}
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) => (j === i ? { ...l, description: e.target.value } : l)),
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    aria-label={`Line ${i + 1} quantity`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) =>
                          j === i ? { ...l, quantity: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className="w-20"
                  />
                  <Input
                    aria-label={`Line ${i + 1} unit price (${money.currency})`}
                    type="number"
                    min={0}
                    step={factor === 1 ? 1 : 0.01}
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) =>
                          j === i ? { ...l, unitPrice: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className="w-28"
                  />
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() =>
                setLines((ls) => [...ls, { description: "", quantity: 1, unitPrice: 0 }])
              }
            >
              <Plus aria-hidden />
              Add line
            </Button>
          </fieldset>

          <p className="text-end text-lg font-semibold text-ink">
            Total: <MoneyText minor={Math.round(subtotal * factor)} />
          </p>

          <DialogFooter>
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InvoicesTab() {
  const utils = api.useUtils();
  const { data: invoices, isLoading } = api.accounting.invoices.useQuery();
  const post = api.accounting.postInvoice.useMutation({
    onSuccess: () => utils.accounting.invalidate(),
  });
  const voidInvoice = api.accounting.voidInvoice.useMutation({
    onSuccess: () => utils.accounting.invalidate(),
  });
  const deleteDraft = api.accounting.deleteDraftInvoice.useMutation({
    onSuccess: () => utils.accounting.invalidate(),
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          New invoice
        </Button>
      </div>

      {!invoices?.length ? (
        <EmptyState
          icon={Receipt}
          title="No invoices"
          description="Create an invoice; issuing it posts DR Accounts Receivable / CR Revenue automatically."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              New invoice
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[680px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Number
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Company
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Issued
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Paid
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line-glass-subtle">
                  <td className="px-4 py-2.5 font-medium text-ink">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{invoice.company.name}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-end font-medium text-ink">
                    <MoneyText minor={invoice.totalMinor} currency={invoice.currencyCode} />
                  </td>
                  <td className="px-4 py-2.5 text-end text-ink-secondary">
                    <MoneyText minor={invoice.paidMinor} currency={invoice.currencyCode} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={INVOICE_BADGE[invoice.status] ?? "neutral"}>
                      {invoice.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {invoice.status === "DRAFT" ? (
                        <>
                          <Button
                            size="sm"
                            loading={post.isPending}
                            onClick={() => post.mutate(invoice.id)}
                          >
                            Issue
                          </Button>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Delete draft ${invoice.invoiceNumber}`}
                            onClick={() => deleteDraft.mutate(invoice.id)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </>
                      ) : invoice.status !== "VOID" && invoice.paidMinor === 0 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={voidInvoice.isPending}
                          onClick={() => voidInvoice.mutate(invoice.id)}
                        >
                          Void
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
