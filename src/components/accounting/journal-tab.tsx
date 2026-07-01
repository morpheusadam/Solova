"use client";

import { BookOpen, ChevronLeft, ChevronRight, Plus, Undo2, X } from "lucide-react";
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

interface DraftLine {
  accountId: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
}

function ManualEntryDialog({
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
  const leafAccounts = accounts?.filter((a) => a.parentId);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { accountId: "", side: "DEBIT", amount: 0 },
    { accountId: "", side: "CREDIT", amount: 0 },
  ]);

  const create = api.accounting.createJournalEntry.useMutation();

  const debits = lines
    .filter((l) => l.side === "DEBIT")
    .reduce((s, l) => s + l.amount, 0);
  const credits = lines
    .filter((l) => l.side === "CREDIT")
    .reduce((s, l) => s + l.amount, 0);
  const balanced = debits === credits && debits > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) return toast.error("Debits must equal credits.");
    if (lines.some((l) => !l.accountId || l.amount <= 0))
      return toast.error("Every line needs an account and a positive amount.");
    try {
      await create.mutateAsync({
        entryDate: new Date(entryDate),
        memo: memo || undefined,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debitMinor: l.side === "DEBIT" ? Math.round(l.amount * factor) : 0,
          creditMinor: l.side === "CREDIT" ? Math.round(l.amount * factor) : 0,
        })),
      });
      toast.success("Journal entry posted");
      await utils.accounting.invalidate();
      onOpenChange(false);
      setMemo("");
      setLines([
        { accountId: "", side: "DEBIT", amount: 0 },
        { accountId: "", side: "CREDIT", amount: 0 },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Entry rejected");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Manual journal entry"
        description="Debits must equal credits — unbalanced entries are rejected."
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="jeDate" label="Date" required>
              <Input
                id="jeDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </Field>
            <Field id="jeMemo" label="Memo">
              <Input
                id="jeMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Owner investment…"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-secondary">Lines</legend>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={line.accountId}
                    onValueChange={(v) =>
                      setLines((ls) => ls.map((l, j) => (j === i ? { ...l, accountId: v } : l)))
                    }
                  >
                    <SelectTrigger aria-label={`Line ${i + 1} account`} className="flex-1">
                      <SelectValue placeholder="Account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {leafAccounts?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={line.side}
                    onValueChange={(v) =>
                      setLines((ls) =>
                        ls.map((l, j) => (j === i ? { ...l, side: v as DraftLine["side"] } : l)),
                      )
                    }
                  >
                    <SelectTrigger aria-label={`Line ${i + 1} side`} className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={`Line ${i + 1} amount`}
                    type="number"
                    min={0}
                    step={factor === 1 ? 1 : 0.01}
                    value={line.amount || ""}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((l, j) =>
                          j === i ? { ...l, amount: Number(e.target.value) } : l,
                        ),
                      )
                    }
                    className="w-32"
                  />
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.length <= 2}
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
                setLines((ls) => [...ls, { accountId: "", side: "DEBIT", amount: 0 }])
              }
            >
              <Plus aria-hidden />
              Add line
            </Button>
          </fieldset>

          <p
            className={`rounded-sm px-3 py-2 text-md ${balanced ? "bg-status-success" : "bg-status-warning"} text-ink`}
          >
            Debits <MoneyText minor={Math.round(debits * factor)} /> · Credits{" "}
            <MoneyText minor={Math.round(credits * factor)} />{" "}
            {balanced ? "— balanced ✓" : "— must be equal"}
          </p>

          <DialogFooter>
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!balanced} loading={create.isPending}>
              Post entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JournalTab() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const { data, isLoading } = api.accounting.journal.useQuery({ page });
  const reverse = api.accounting.reverseEntry.useMutation({
    onSuccess: () => {
      toast.success("Reversing entry posted");
      void utils.accounting.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading || !data) return <Skeleton className="h-96" />;

  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          Manual entry
        </Button>
      </div>

      {!data.entries.length ? (
        <EmptyState
          icon={BookOpen}
          title="Empty journal"
          description="Every invoice, payment and expense posts here automatically."
        />
      ) : (
        <div className="space-y-3">
          {data.entries.map((entry) => (
            <article key={entry.id} className="glass-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <time
                  dateTime={new Date(entry.entryDate).toISOString()}
                  className="font-medium text-ink"
                >
                  {new Date(entry.entryDate).toLocaleDateString()}
                </time>
                <Badge variant="neutral">{entry.referenceType.toLowerCase()}</Badge>
                {entry.company ? (
                  <Badge variant="info">{entry.company.name}</Badge>
                ) : null}
                {entry.reversedByEntryId ? (
                  <Badge variant="warning">reversed</Badge>
                ) : null}
                <span className="flex-1 truncate text-md text-ink-secondary">
                  {entry.memo}
                </span>
                {!entry.reversedByEntryId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Reverse this entry"
                    onClick={() => reverse.mutate(entry.id)}
                  >
                    <Undo2 aria-hidden />
                    Reverse
                  </Button>
                ) : null}
              </div>
              <table className="w-full text-md">
                <tbody>
                  {entry.lines.map((line) => (
                    <tr key={line.id} className="border-t border-line-glass-subtle">
                      <td className="py-1.5 text-ink-secondary">
                        <span className="me-2 font-mono text-sm text-ink-subtle">
                          {line.account.code}
                        </span>
                        {line.account.name}
                      </td>
                      <td className="w-32 py-1.5 text-end text-ink">
                        {line.debitMinor > 0 ? <MoneyText minor={line.debitMinor} /> : ""}
                      </td>
                      <td className="w-32 py-1.5 text-end text-ink-secondary">
                        {line.creditMinor > 0 ? <MoneyText minor={line.creditMinor} /> : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}

          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-subtle">
              {data.total} entries · page {data.page} of {pageCount}
            </p>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="iconSm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variant="secondary"
                size="iconSm"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      )}

      <ManualEntryDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
