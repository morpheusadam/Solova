"use client";

import {
  Contact as ContactIcon,
  FileSignature,
  FolderKanban,
  Pencil,
  Plus,
  SquareKanban,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CompanyFormDialog } from "~/components/company/company-form";
import { ContractFormDialog } from "~/components/company/contract-form";
import { BoardFormDialog } from "~/components/board/board-form";
import { ContactCard, type ContactData } from "~/components/contact/contact-card";
import { ContactFormDialog } from "~/components/contact/contact-form";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { MoneyText } from "~/components/shared/money";
import { PageHeader } from "~/components/shared/page-header";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

const INVOICE_BADGE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "danger",
  SENT: "info",
  DRAFT: "neutral",
  VOID: "neutral",
};

export function CompanyDetail({ companyId }: { companyId: string }) {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: company, isLoading } = api.company.byId.useQuery(companyId);
  const { data: contracts } = api.contract.listByCompany.useQuery(companyId);
  const { data: contacts } = api.contact.listByCompany.useQuery(companyId);
  const { data: boards } = api.board.list.useQuery({ companyId });
  const { data: projects } = api.project.list.useQuery({ companyId });
  const { data: finance } = api.company.financeSummary.useQuery(companyId);
  const { data: deletePreview } = api.company.deletePreview.useQuery(companyId);

  const deleteCompany = api.company.delete.useMutation();
  const deleteContact = api.contact.delete.useMutation({
    onSuccess: () => utils.contact.invalidate(),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<string | null>(null);
  const [contactCreateOpen, setContactCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactData | null>(null);

  if (isLoading || !company) {
    return <Skeleton className="h-96" />;
  }

  const hasFinancialDocs =
    (deletePreview?.invoices ?? 0) > 0 || (deletePreview?.payments ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={company.name}
        description={company.legalName ?? undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden />
              Delete
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="boards">Boards</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="glass-card p-5">
            <div className="mb-5 flex items-center gap-3">
              <Avatar name={company.name} src={company.logoUrl} size={48} />
              <div>
                <p className="text-lg font-semibold text-ink">{company.name}</p>
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
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Billing model", company.billingModel.replace(/_/g, " ").toLowerCase()],
                  [
                    "Default rate",
                    company.defaultRateMinor ? (
                      <MoneyText
                        key="rate"
                        minor={company.defaultRateMinor}
                        currency={company.currencyCode}
                      />
                    ) : (
                      "—"
                    ),
                  ],
                  ["Email", company.email ?? "—"],
                  ["Phone", company.phone ?? "—"],
                  [
                    "Website",
                    company.website ? (
                      <a
                        key="web"
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink-link underline hover:text-ink-link-hover"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Tax ID", company.taxId ?? "—"],
                  ["City", company.city ?? "—"],
                  ["Country", company.country ?? "—"],
                  ["Address", company.address ?? "—"],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-ink-subtle">{label}</dt>
                  <dd className="text-md text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {company.notes ? (
              <p className="mt-5 border-t border-line pt-4 text-md whitespace-pre-wrap text-ink-secondary">
                {company.notes}
              </p>
            ) : null}
          </div>
        </TabsContent>

        {/* ── Contacts ── */}
        <TabsContent value="contacts">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setContactCreateOpen(true)}>
              <Plus aria-hidden />
              New contact
            </Button>
          </div>
          {!contacts?.length ? (
            <EmptyState
              icon={ContactIcon}
              title="No contacts"
              description="Add the people you deal with at this company."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <ContactCard
                    contact={contact}
                    onEdit={() => setEditingContact(contact)}
                    onDelete={() => deleteContact.mutate(contact.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Contracts ── */}
        <TabsContent value="contracts">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setContractOpen(true)}>
              <Plus aria-hidden />
              New contract
            </Button>
          </div>
          {!contracts?.length ? (
            <EmptyState
              icon={FileSignature}
              title="No contracts"
              description="Record what you charge this company — monthly, one-time or per milestone."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {contracts.map((contract) => (
                <li key={contract.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-ink">{contract.title}</p>
                    <Badge
                      variant={
                        contract.status === "ACTIVE"
                          ? "success"
                          : contract.status === "COMPLETED"
                            ? "info"
                            : contract.status === "CANCELLED"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {contract.status.toLowerCase()}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-md">
                    <div>
                      <dt className="text-sm text-ink-subtle">Monthly</dt>
                      <dd className="font-medium text-ink">
                        {contract.monthlyAmountMinor ? (
                          <MoneyText minor={contract.monthlyAmountMinor} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-subtle">Total value</dt>
                      <dd className="font-medium text-ink">
                        {contract.valueMinor ? <MoneyText minor={contract.valueMinor} /> : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-subtle">Period</dt>
                      <dd className="text-ink">
                        {contract.billingPeriod?.replace("_", " ").toLowerCase() ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-subtle">Dates</dt>
                      <dd className="text-ink">
                        {contract.startDate
                          ? new Date(contract.startDate).toLocaleDateString()
                          : "—"}
                        {contract.endDate
                          ? ` → ${new Date(contract.endDate).toLocaleDateString()}`
                          : ""}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingContract(contract.id)}
                    >
                      <Pencil aria-hidden />
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Boards ── */}
        <TabsContent value="boards">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => setBoardOpen(true)}>
              <Plus aria-hidden />
              New board
            </Button>
          </div>
          {!boards?.length ? (
            <EmptyState
              icon={SquareKanban}
              title="No boards"
              description="Create a Kanban board for this company's work."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/boards/${board.id}`}
                    className="raised-card block p-4"
                    aria-label={`Open board ${board.name}`}
                  >
                    <p className="font-semibold text-ink">{board.name}</p>
                    <p className="mt-1 text-sm text-ink-subtle">
                      {board._count.cards} cards
                      {board.project ? ` · ${board.project.name}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Projects ── */}
        <TabsContent value="projects">
          {!projects?.length ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects"
              description="Projects for this company appear here. Create them from the Projects section."
              action={
                <Button asChild variant="secondary">
                  <Link href="/projects">Go to Projects</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="raised-card block p-4"
                    aria-label={`Open project ${project.name}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: project.color ?? "#8993A4" }}
                      />
                      <p className="font-semibold text-ink">{project.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-ink-subtle">
                      {project.status.replace("_", " ").toLowerCase()} ·{" "}
                      {project._count.boards} boards
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Finance ── */}
        <TabsContent value="finance">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Received this month", finance?.paidThisMonth],
                ["Received this year", finance?.paidThisYear],
                ["Outstanding", finance?.outstanding],
              ] as const
            ).map(([label, minor]) => (
              <div key={label} className="glass-card p-4">
                <p className="text-sm text-ink-subtle">{label}</p>
                <p className="text-2xl font-semibold text-ink">
                  <MoneyText minor={minor ?? 0} currency={company.currencyCode} />
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass-card p-4" aria-label="Invoices">
              <h3 className="mb-3 font-semibold text-ink">Invoices</h3>
              {!finance?.invoices.length ? (
                <p className="text-md text-ink-subtle">No invoices yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--border-default)]">
                  {finance.invoices.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="font-medium text-ink">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-ink-subtle">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MoneyText
                          minor={invoice.totalMinor}
                          currency={invoice.currencyCode}
                          className="font-medium text-ink"
                        />
                        <Badge variant={INVOICE_BADGE[invoice.status] ?? "neutral"}>
                          {invoice.status.toLowerCase()}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-card p-4" aria-label="Payments">
              <h3 className="mb-3 font-semibold text-ink">Payments received</h3>
              {!finance?.payments.length ? (
                <p className="text-md text-ink-subtle">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--border-default)]">
                  {finance.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="font-medium text-ink">
                          <MoneyText minor={payment.amountMinor} currency={company.currencyCode} />
                        </p>
                        <p className="text-sm text-ink-subtle">
                          {new Date(payment.paidAt).toLocaleDateString()} ·{" "}
                          {payment.method.toLowerCase()}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <CompanyFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        company={{ ...company, defaultRateMinor: company.defaultRateMinor }}
      />
      <ContractFormDialog
        open={contractOpen || editingContract !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContractOpen(false);
            setEditingContract(null);
          }
        }}
        companyId={companyId}
        contract={
          editingContract ? (contracts?.find((c) => c.id === editingContract) ?? null) : null
        }
      />
      <BoardFormDialog open={boardOpen} onOpenChange={setBoardOpen} companyId={companyId} />

      <ContactFormDialog
        open={contactCreateOpen}
        onOpenChange={setContactCreateOpen}
        defaultCompanyId={companyId}
      />
      <ContactFormDialog
        open={editingContact !== null}
        onOpenChange={(o) => !o && setEditingContact(null)}
        contact={editingContact}
        defaultCompanyId={companyId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${company.name}?`}
        description="This cannot be undone."
        confirmLabel="Delete everything"
        body={
          <div className="rounded-sm bg-status-danger p-3 text-md text-ink">
            {hasFinancialDocs ? (
              <p>
                This company has <strong>{deletePreview?.invoices} invoices</strong> and{" "}
                <strong>{deletePreview?.payments} payments</strong>. Financial history is
                protected — void or reassign them before deleting.
              </p>
            ) : (
              <p>
                Deleting this company permanently removes{" "}
                <strong>{deletePreview?.boards} boards</strong>,{" "}
                <strong>{deletePreview?.cards} cards</strong>,{" "}
                <strong>{deletePreview?.projects} projects</strong> and{" "}
                <strong>{deletePreview?.contracts} contracts</strong>.
              </p>
            )}
          </div>
        }
        onConfirm={async () => {
          try {
            await deleteCompany.mutateAsync(companyId);
            toast.success("Company deleted");
            await utils.company.invalidate();
            router.push("/companies");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
