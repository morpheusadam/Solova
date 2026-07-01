"use client";

import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
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
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="raised-card block p-4"
                aria-label={`Open company ${company.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={company.name} src={company.logoUrl} size={36} />
                    <div>
                      <p className="font-semibold text-ink">{company.name}</p>
                      <p className="text-sm text-ink-subtle">
                        {BILLING_SHORT[company.billingModel]}
                        {company.defaultRateMinor ? (
                          <>
                            {" · "}
                            <MoneyText
                              minor={company.defaultRateMinor}
                              currency={company.currencyCode}
                            />
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
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
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="glass-chip !rounded-sm px-1 py-1.5">
                    <dt className="text-xs text-ink-subtle">Open tasks</dt>
                    <dd className="font-semibold text-ink">{company.openTasks}</dd>
                  </div>
                  <div className="glass-chip !rounded-sm px-1 py-1.5">
                    <dt className="text-xs text-ink-subtle">Boards</dt>
                    <dd className="font-semibold text-ink">{company._count.boards}</dd>
                  </div>
                  <div className="glass-chip !rounded-sm px-1 py-1.5">
                    <dt className="text-xs text-ink-subtle">Unpaid</dt>
                    <dd className="font-semibold text-ink">
                      <MoneyText minor={company.unpaidMinor} currency={company.currencyCode} />
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CompanyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
