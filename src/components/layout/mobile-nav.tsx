"use client";

import {
  Building2,
  Calculator,
  LayoutDashboard,
  ListTodo,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

/** Bottom navigation for small screens (max 5 items, icon + label). */
const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/boards", label: "Boards", icon: SquareKanban },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/companies", label: "Clients", icon: Building2 },
  { href: "/accounting", label: "Money", icon: Calculator },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="glass-sidebar fixed inset-x-0 bottom-0 z-[300] flex border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium text-ink-secondary",
              active && "text-ink-link",
            )}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
