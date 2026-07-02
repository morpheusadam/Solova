"use client";

import { Play, Square, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Field } from "~/components/shared/field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

function formatElapsed(from: Date): string {
  const total = Math.max(0, Math.floor((Date.now() - from.getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Topbar start/stop timer (one running entry at a time). */
export function TimerWidget() {
  const utils = api.useUtils();
  const { data: running } = api.timeEntry.running.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const { data: companies } = api.company.list.useQuery({ status: "ACTIVE" });

  const start = api.timeEntry.startTimer.useMutation({
    onSuccess: () => utils.timeEntry.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const stop = api.timeEntry.stopTimer.useMutation({
    onSuccess: () => {
      toast.success("Timer stopped — entry saved");
      void utils.timeEntry.invalidate();
      void utils.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [companyId, setCompanyId] = useState("");
  const [description, setDescription] = useState("");
  const [, tick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  if (running) {
    return (
      <div className="glass-chip flex items-center gap-2 py-1 ps-3 pe-1">
        <Link
          href="/time"
          className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-ink-link"
          aria-label={`Running timer for ${running.company.name} — open time entries`}
        >
          <Timer aria-hidden className="size-4 text-icon-brand" />
          <span className="hidden sm:inline">{running.company.name}</span>
          <span className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatElapsed(new Date(running.startedAt))}
          </span>
        </Link>
        <Button
          variant="danger"
          size="iconSm"
          aria-label="Stop timer"
          loading={stop.isPending}
          onClick={() => stop.mutate(running.id)}
        >
          <Square aria-hidden className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Start a timer">
          <Timer aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Start timer">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!companyId) return toast.error("Pick a company first.");
            start.mutate({ companyId, description: description || undefined });
            setDescription("");
          }}
        >
          <h4 className="font-semibold text-ink">Start timer</h4>
          <Field id="timerCompany" label="Company" required>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="timerCompany">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="timerDesc" label="What are you working on?">
            <Input
              id="timerDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional…"
            />
          </Field>
          <div className="flex items-center justify-between gap-2">
            <Link href="/time" className="text-sm text-ink-link underline hover:text-ink-link-hover">
              View all entries
            </Link>
            <Button type="submit" size="sm" loading={start.isPending}>
              <Play aria-hidden />
              Start
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
