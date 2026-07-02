"use client";

import { Building2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CompanyFormDialog } from "~/components/company/company-form";
import { MoneyText } from "~/components/shared/money";
import { PageHeader } from "~/components/shared/page-header";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { companyStatuses } from "~/schemas/company";
import { api } from "~/trpc/react";

const BILLING_SHORT: Record<string, string> = {
  MONTHLY_RETAINER: "Retainer",
  PER_PROJECT: "Per project",
  PER_TASK: "Per task",
  HOURLY: "Hourly",
};

export function CompaniesView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: companies, isLoading } = api.company.list.useQuery({
    search: search || undefined,
    status: status === "ALL" ? undefined : (status as (typeof companyStatuses)[number]),
  });

  return (
    <>
      <PageHeader
        title="Companies"
        description="Your clients, their billing model and health at a glance."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New company
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-icon-subtle"
          />
          <Input
            aria-label="Search companies"
            className="ps-8"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {companyStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !companies?.length ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Create your first client to start tracking boards, contracts and income."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              New company
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Company</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Billing</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">Open tasks</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">Boards</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">Unpaid</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  onClick={() => router.push(`/companies/${company.id}`)}
                  className="cursor-pointer border-b border-line-glass-subtle transition-[background-color] duration-[var(--duration-fast)] hover:bg-surface-hover"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={company.name} src={company.logoUrl} size={30} />
                      <span className="font-medium text-ink">{company.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {BILLING_SHORT[company.billingModel]}
                    {company.defaultRateMinor ? (
                      <>
                        {" · "}
                        <MoneyText minor={company.defaultRateMinor} currency={company.currencyCode} />
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-end text-ink">{company.openTasks}</td>
                  <td className="px-4 py-2.5 text-end text-ink">{company._count.boards}</td>
                  <td className="px-4 py-2.5 text-end text-ink">
                    <MoneyText minor={company.unpaidMinor} currency={company.currencyCode} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        company.status === "ACTIVE"
                          ? "success"
                          : company.status === "PAUSED"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {company.status.toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompanyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
