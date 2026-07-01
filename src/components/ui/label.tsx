"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "~/lib/utils";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("mb-1.5 block text-sm font-medium text-ink-secondary", className)}
    {...props}
  >
    {children}
    {required ? (
      <span aria-hidden className="text-ink-danger">
        {" "}
        *
      </span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
