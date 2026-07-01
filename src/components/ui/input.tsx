import * as React from "react";

import { cn } from "~/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-sm border border-line-glass bg-surface-glass px-3 text-md text-ink placeholder:text-ink-subtle",
        "backdrop-blur-[6px] transition-[border-color] duration-[var(--duration-fast)]",
        "focus:border-line-focus disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
