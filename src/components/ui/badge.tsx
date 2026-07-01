import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "glass-chip text-ink-secondary",
        success: "bg-status-success text-ink",
        warning: "bg-status-warning text-ink",
        danger: "bg-status-danger text-ink",
        info: "bg-status-info text-ink",
        discovery: "bg-status-discovery text-ink",
        brand: "bg-primary text-ink-onbrand",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
