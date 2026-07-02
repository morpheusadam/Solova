"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
    /** Visually hide the header (title stays available to screen readers). */
    hideHeader?: boolean;
    wide?: boolean;
  }
>(({ className, children, title, description, hideHeader, wide, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className="animate-overlay-in fixed inset-0 z-[600] bg-backdrop"
    />
    <DialogPrimitive.Content
      ref={ref}
      // Selects/popovers/dropdowns portal outside the dialog DOM, so a click on
      // one registers as an "outside" interaction and would close the dialog.
      // Ignore interactions that originate inside any Radix popper.
      onPointerDownOutside={(event) => {
        if (
          (event.target as Element | null)?.closest(
            "[data-radix-popper-content-wrapper],[data-radix-select-viewport]",
          )
        ) {
          event.preventDefault();
        }
      }}
      onInteractOutside={(event) => {
        if (
          (event.target as Element | null)?.closest(
            "[data-radix-popper-content-wrapper],[data-radix-select-viewport]",
          )
        ) {
          event.preventDefault();
        }
      }}
      className={cn(
        "glass-modal animate-modal-in fixed top-1/2 left-1/2 z-[700] max-h-[85dvh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6",
        wide ? "max-w-3xl" : "max-w-lg",
        className,
      )}
      {...props}
    >
      <div className={cn("mb-4 flex items-start justify-between gap-4", hideHeader && "sr-only")}>
        <div>
          <DialogPrimitive.Title className="text-xl font-semibold text-ink">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-md text-ink-secondary">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
      </div>
      <DialogPrimitive.Close
        type="button"
        aria-label="Close dialog"
        className="absolute top-4 end-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-icon-subtle hover:bg-subtle-hover hover:text-icon"
      >
        <X aria-hidden className="size-4" />
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
