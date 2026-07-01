import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-[background-color,opacity] duration-[var(--duration-fast)] select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-ink-onbrand hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "glass-chip !rounded-sm bg-secondary text-ink hover:bg-secondary-hover",
        subtle: "bg-transparent text-ink hover:bg-subtle-hover",
        danger: "bg-danger text-ink-onbrand hover:bg-danger-hover",
        ghost: "bg-transparent text-ink-secondary hover:bg-subtle-hover hover:text-ink",
      },
      size: {
        sm: "h-8 px-2 text-sm",
        md: "h-9 px-3 text-md",
        lg: "h-10 px-4 text-md",
        icon: "size-9",
        iconSm: "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
