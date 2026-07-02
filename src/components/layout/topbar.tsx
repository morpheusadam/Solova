"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { signOutAction } from "~/components/layout/actions";
import { TimerWidget } from "~/components/time/timer-widget";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="size-9" aria-hidden />;

  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}

export function Topbar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  return (
    <header className="glass-sidebar sticky top-0 z-[200] flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 ps-4 pe-3 md:ms-60">
      {/* mobile brand (sidebar hidden below md) */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-sm bg-primary text-md font-bold text-ink-onbrand"
        >
          F
        </span>
        <span className="font-semibold text-ink">FreelanceOS</span>
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5">
        <TimerWidget />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="cursor-pointer rounded-full"
          >
            <Avatar name={userName} size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2.5 py-2">
              <p className="font-medium text-ink">{userName}</p>
              <p className="text-sm text-ink-subtle">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOutAction()}>
              <LogOut aria-hidden className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
