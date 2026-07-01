import * as React from "react";

import { cn } from "~/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-20 w-full rounded-sm border border-line-glass bg-surface-glass px-3 py-2 text-md text-ink placeholder:text-ink-subtle",
      "backdrop-blur-[6px] transition-[border-color] duration-[var(--duration-fast)]",
      "focus:border-line-focus disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
