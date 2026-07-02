"use client";

import { Package, Pencil, Plus, X } from "lucide-react";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { minorUnitFactor } from "~/lib/money";
import { productTypes } from "~/schemas/product";
import { api, type RouterOutputs } from "~/trpc/react";

type Product = RouterOutputs["product"]["list"][number];

function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const utils = api.useUtils();
  const money = useMoney();
  const factor = minorUnitFactor(money.currency);
  const { data: accounts } = api.accounting.accounts.useQuery();
  const revenueAccounts = accounts?.filter((a) => a.type === "REVENUE" && a.parentId);

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [type, setType] = useState<(typeof productTypes)[number]>(product?.type ?? "SERVICE");
  const [price, setPrice] = useState(
    product ? String(product.unitPriceMinor / factor) : "",
  );
  const [taxRate, setTaxRate] = useState(String(product?.taxRatePct ?? 0));
  const [incomeAccountId, setIncomeAccountId] = useState(product?.incomeAccountId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");

  const create = api.product.create.useMutation();
  const update = api.product.update.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required.");
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      type,
      unitPriceMinor: Math.round(parseFloat(price || "0") * factor),
      taxRatePct: parseFloat(taxRate || "0"),
      incomeAccountId: incomeAccountId || null,
      description: description.trim() || null,
    };
    try {
      if (product) {
        await update.mutateAsync({ id: product.id, data: payload });
        toast.success("Product updated");
      } else {
        await create.mutateAsync({ ...payload, isActive: true });
        toast.success("Product created");
      }
      await utils.product.invalidate();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={product ? "Edit product" : "New product / service"}
        description="Reusable catalog item you can drop onto invoices."
      >
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="prodName" label="Name" required>
              <Input
                id="prodName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Website maintenance (monthly)"
              />
            </Field>
          </div>
          <Field id="prodSku" label="SKU / code">
            <Input id="prodSku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <Field id="prodType" label="Type">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="prodType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="prodPrice" label={`Unit price (${money.currency})`} required>
            <Input
              id="prodPrice"
              type="number"
              min={0}
              step={factor === 1 ? 1 : 0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field id="prodTax" label="Tax rate (%)">
            <Input
              id="prodTax"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="prodAccount" label="Revenue account" hint="Where sales of this item post (optional).">
              <Select
                value={incomeAccountId}
                onValueChange={(v) => setIncomeAccountId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="prodAccount">
                  <SelectValue placeholder="Default (Service Revenue)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default (Service Revenue)</SelectItem>
                  {revenueAccounts?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="prodDesc" label="Description">
              <Textarea
                id="prodDesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button variant="subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsTab() {
  const utils = api.useUtils();
  const { data: products, isLoading } = api.product.list.useQuery();
  const update = api.product.update.useMutation({
    onSuccess: () => utils.product.invalidate(),
  });
  const remove = api.product.delete.useMutation({
    onSuccess: () => utils.product.invalidate(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus aria-hidden />
          New product
        </Button>
      </div>

      {!products?.length ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Build a catalog of goods & services, then add them to invoices in one click."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden />
              New product
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  SKU
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Type
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Unit price
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  Tax
                </th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">
                  Active
                </th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line-glass-subtle">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-ink">{p.name}</p>
                    {p.description ? (
                      <p className="text-sm text-ink-subtle">{p.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={p.type === "SERVICE" ? "info" : "discovery"}>
                      {p.type.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-end font-medium text-ink">
                    <MoneyText minor={p.unitPriceMinor} currency={p.currencyCode} />
                  </td>
                  <td className="px-4 py-2.5 text-end text-ink-secondary">
                    {p.taxRatePct ? `${p.taxRatePct}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Switch
                      aria-label={`Toggle ${p.name} active`}
                      checked={p.isActive}
                      onCheckedChange={(checked) =>
                        update.mutate({ id: p.id, data: { isActive: checked } })
                      }
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => remove.mutate(p.id)}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
      />
    </>
  );
}
