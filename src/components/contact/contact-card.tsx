"use client";

import {
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";

import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export interface ContactData {
  id: string;
  companyId: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  website?: string | null;
  address?: string | null;
  notes?: string | null;
  isPrimary: boolean;
  company?: { id: string; name: string } | null;
}

function Row({
  icon: Icon,
  children,
  href,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
  href?: string;
}) {
  const content = (
    <span className="flex items-center gap-2 text-md text-ink">
      <Icon aria-hidden className="size-4 shrink-0 text-icon-subtle" />
      <span className="truncate">{children}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="hover:text-ink-link hover:underline">
      {content}
    </a>
  ) : (
    content
  );
}

export function ContactCard({
  contact,
  onEdit,
  onDelete,
  showCompany,
}: {
  contact: ContactData;
  onEdit: () => void;
  onDelete: () => void;
  showCompany?: boolean;
}) {
  return (
    <div className="glass-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={contact.name} size={40} />
          <div>
            <p className="font-semibold text-ink">{contact.name}</p>
            <p className="text-sm text-ink-subtle">
              {contact.role ?? "—"}
              {showCompany && contact.company ? ` · ${contact.company.name}` : ""}
            </p>
          </div>
        </div>
        {contact.isPrimary ? <Badge variant="brand">primary</Badge> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        {contact.email ? (
          <Row icon={Mail} href={`mailto:${contact.email}`}>
            {contact.email}
          </Row>
        ) : null}
        {contact.phone ? (
          <Row icon={Phone} href={`tel:${contact.phone}`}>
            {contact.phone}
          </Row>
        ) : null}
        {contact.mobile ? (
          <Row icon={Smartphone} href={`tel:${contact.mobile}`}>
            {contact.mobile}
          </Row>
        ) : null}
        {contact.whatsapp ? (
          <Row
            icon={MessageCircle}
            href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
          >
            {contact.whatsapp}
          </Row>
        ) : null}
        {contact.telegram ? (
          <Row
            icon={Send}
            href={`https://t.me/${contact.telegram.replace(/^@/, "")}`}
          >
            {contact.telegram}
          </Row>
        ) : null}
        {contact.website ? (
          <Row icon={Globe} href={contact.website}>
            {contact.website.replace(/^https?:\/\//, "")}
          </Row>
        ) : null}
        {contact.address ? <Row icon={MapPin}>{contact.address}</Row> : null}
      </div>

      {contact.notes ? (
        <p className="text-sm whitespace-pre-wrap text-ink-secondary">{contact.notes}</p>
      ) : null}

      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="iconSm" aria-label={`Edit ${contact.name}`} onClick={onEdit}>
          <Pencil aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={`Delete ${contact.name}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </div>
  );
}
