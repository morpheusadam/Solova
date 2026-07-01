"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "~/lib/utils";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer items-center rounded-full bg-secondary p-0.5 transition-[background-color] duration-[var(--duration-fast)]",
      "data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "block size-4.5 rounded-full bg-surface-solid shadow-card transition-transform duration-[var(--duration-fast)]",
        "data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
