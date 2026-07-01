"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "~/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "glass-chip inline-flex items-center gap-1 !rounded-sm p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "cursor-pointer rounded-sm px-3 py-1.5 text-md font-medium text-ink-secondary transition-[background-color,color] duration-[var(--duration-fast)]",
      "hover:text-ink data-[state=active]:bg-surface-selected data-[state=active]:text-ink",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;
