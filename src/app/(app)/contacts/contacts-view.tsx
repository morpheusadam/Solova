"use client";

import { Contact as ContactIcon, Plus, Search } from "lucide-react";
import { useState } from "react";

import { ContactCard, type ContactData } from "~/components/contact/contact-card";
import { ContactFormDialog } from "~/components/contact/contact-form";
import { ConfirmDialog } from "~/components/shared/confirm-dialog";
import { PageHeader } from "~/components/shared/page-header";
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <ContactCard
                contact={contact}
                showCompany
                onEdit={() => setEditing(contact)}
                onDelete={() => setDeleting(contact)}
              />
            </li>
          ))}
        </ul>
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
