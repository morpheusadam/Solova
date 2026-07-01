"use client";

import { Plus, Wallet } from "lucide-react";
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
import { api } from "~/trpc/react";

function ExpenseCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const money = useMoney();
  const factor = minorUnitFactor(money.currency);
  const { data: accounts } = api.accounting.accounts.useQuery();
  const { data: companies } = api.company.list.useQuery({});
  const expenseAccounts = accounts?.filter((a) => a.type === "EXPENSE" && a.parentId);

  const [description, setDescription] = useState("");
  const [categoryAccountId, setCategoryAccountId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));

  const create = api.accounting.createExpense.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(amount) * factor);
    if (!description.trim()) return toast.error("Describe the expense.");
    if (!categoryAccountId) return toast.error("Pick a category.");
    if (!amountMinor || amountMinor <= 0) return toast.error("Enter a positive amount.");
    try {
      await create.mutateAsync({
        description: description.trim(),
        categoryAccountId,
        companyId: companyId || null,
        amountMinor,
        spentAt: new Date(spentAt),
        billable: false,
      });
      toast.success("Expense recorded and posted to the ledger");
      await utils.accounting.invalidate();
      onOpenChange(false);
      setDescription("");
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record expense");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New expense" description="Posts DR category / CR Bank.">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="expDesc" label="Description" required>
              <Input
                id="expDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="VPS hosting…"
              />
            </Field>
          </div>

          <Field id="expCategory" label="Category" required>
            <Select value={categoryAccountId} onValueChange={setCategoryAccountId}>
              <SelectTrigger id="expCategory">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="expCompany" label="Company (if billable/related)">
            <Select
              value={companyId}
              onValueChange={(v) => setCompanyId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="expCompany">
                <SelectValue placeholder="General expense" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General expense</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="expAmount" label={`Amount (${money.currency})`} required>
            <Input
              id="expAmount"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field id="expDate" label="Spent on" required>
            <Input
              id="expDate"
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Record expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesTab() {
  const { data: expenses, isLoading } = api.accounting.expenses.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          New expense
        </Button>
      </div>

      {!expenses?.length ? (
        <EmptyState
          icon={Wallet}
          title="No expenses"
          description="Track software, hosting and fees; each posts a balanced ledger entry."
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Description
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Category
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Company
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-line-glass-subtle">
                  <td className="px-4 py-2.5 font-medium text-ink">{e.description}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {e.categoryAccount.code} {e.categoryAccount.name}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{e.company?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-end font-semibold text-ink-danger">
                    <MoneyText minor={e.amountMinor} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {new Date(e.spentAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExpenseCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
