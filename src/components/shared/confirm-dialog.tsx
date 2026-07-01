"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "~/components/ui/dialog";

/** Confirmation gate for destructive actions (spec §8: confirm before destroy). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  body,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {body}
        <DialogFooter>
          <Button variant="subtle" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
