"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Field } from "~/components/shared/field";
import { Badge } from "~/components/ui/badge";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/toast";
import { accountTypes } from "~/schemas/accounting";
import { api } from "~/trpc/react";

function AccountCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = api.useUtils();
  const { data: accounts } = api.accounting.accounts.useQuery();
  const parents = accounts?.filter((a) => !a.parentId);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof accountTypes)[number]>("EXPENSE");
  const [parentId, setParentId] = useState("");

  const create = api.accounting.createAccount.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return toast.error("Code and name are required.");
    try {
      await create.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        type,
        parentId: parentId || null,
      });
      toast.success("Account created");
      await utils.accounting.accounts.invalidate();
      onOpenChange(false);
      setCode("");
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New account" description="Extend the chart of accounts.">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field id="accCode" label="Code" required>
            <Input
              id="accCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="5400"
            />
          </Field>
          <Field id="accName" label="Name" required>
            <Input
              id="accName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Advertising"
            />
          </Field>
          <Field id="accType" label="Type">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="accType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="accParent" label="Parent group">
            <Select value={parentId} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
              <SelectTrigger id="accParent">
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Top level</SelectItem>
                {parents?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountsTab() {
  const utils = api.useUtils();
  const { data: accounts, isLoading } = api.accounting.accounts.useQuery();
  const update = api.accounting.updateAccount.useMutation({
    onSuccess: () => utils.accounting.accounts.invalidate(),
  });
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading || !accounts) return <Skeleton className="h-96" />;

  const roots = accounts.filter((a) => !a.parentId);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden />
          New account
        </Button>
      </div>

      <div className="glass-card divide-y divide-[var(--border-default)]">
        {roots.map((root) => (
          <div key={root.id} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-sm text-ink-subtle">{root.code}</span>
              <h3 className="font-semibold text-ink">{root.name}</h3>
              <Badge variant="neutral">{root.type.toLowerCase()}</Badge>
            </div>
            <ul className="space-y-1.5">
              {accounts
                .filter((a) => a.parentId === root.id)
                .map((account) => (
                  <li key={account.id} className="flex items-center gap-3 ps-6">
                    <span className="font-mono text-sm text-ink-subtle">{account.code}</span>
                    <span className="flex-1 text-md text-ink">{account.name}</span>
                    <label className="flex items-center gap-2 text-sm text-ink-subtle">
                      active
                      <Switch
                        aria-label={`Toggle ${account.name} active`}
                        checked={account.isActive}
                        onCheckedChange={(checked) =>
                          update.mutate({
                            id: account.id,
                            name: account.name,
                            isActive: checked,
                          })
                        }
                      />
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <AccountCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
