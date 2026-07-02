"use client";

import { Contact as ContactIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { type ContactData } from "~/components/contact/contact-card";
import { ContactFormDialog } from "~/components/contact/contact-form";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { PageHeader } from "~/components/shared/page-header";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import { api } from "~/trpc/react";

export function ContactsView() {
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ContactData | null>(null);
  const [deleting, setDeleting] = useState<ContactData | null>(null);

  const { data: companies } = api.company.list.useQuery({});
  const { data: contacts, isLoading } = api.contact.list.useQuery({
    search: search || undefined,
    companyId: companyId === "ALL" ? undefined : companyId,
  });

  const remove = api.contact.delete.useMutation({
    onSuccess: () => utils.contact.invalidate(),
  });

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Everyone you work with. A contact can belong to a company — or none."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New contact
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
            aria-label="Search contacts"
            className="ps-8"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger aria-label="Filter by company" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All companies</SelectItem>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !contacts?.length ? (
        <EmptyState
          icon={ContactIcon}
          title="No contacts yet"
          description="Add the people you work with — assign them to a company or leave it blank."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              New contact
            </Button>
          }
        />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Role</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Company</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Email</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Phone</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => setEditing(contact)}
                  className="cursor-pointer border-b border-line-glass-subtle transition-[background-color] duration-[var(--duration-fast)] hover:bg-surface-hover"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={contact.name} size={28} />
                      <span className="font-medium text-ink">{contact.name}</span>
                      {contact.isPrimary ? <Badge variant="brand">primary</Badge> : null}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{contact.role ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {contact.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-ink-link hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {contact.phone ?? contact.mobile ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Edit ${contact.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(contact);
                        }}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Delete ${contact.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(contact);
                        }}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ContactFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        contact={editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This contact will be permanently removed."
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success("Contact deleted");
        }}
      />
    </>
  );
}
