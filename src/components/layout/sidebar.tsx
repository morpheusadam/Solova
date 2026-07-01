"use client";

import {
  Building2,
  Calculator,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/boards", label: "Boards", icon: SquareKanban },
  { href: "/accounting", label: "Accounting", icon: Calculator },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="glass-sidebar fixed inset-y-0 start-0 z-[300] hidden w-60 flex-col border-y-0 border-s-0 p-3 md:flex"
    >
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-2.5 rounded-sm px-2 py-1.5"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-sm bg-primary text-lg font-bold text-ink-onbrand"
        >
          F
        </span>
        <span className="text-lg font-semibold text-ink">FreelanceOS</span>
      </Link>

      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-3 py-2 text-md font-medium text-ink-secondary transition-[background-color,color] duration-[var(--duration-fast)]",
                  "hover:bg-surface-hover hover:text-ink",
                  active && "bg-surface-selected font-semibold text-ink",
                )}
              >
                <Icon aria-hidden className="size-4.5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
