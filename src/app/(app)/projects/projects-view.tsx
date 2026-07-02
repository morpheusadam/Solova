"use client";

import { FolderKanban, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProjectFavicon } from "~/components/project/project-favicon";
import { ProjectFormDialog } from "~/components/project/project-form";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { projectStatuses } from "~/schemas/project";
import { api } from "~/trpc/react";

const STATUS_BADGE: Record<string, "success" | "warning" | "info" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PLANNING: "info",
  ON_HOLD: "warning",
  DONE: "neutral",
  CANCELLED: "danger",
};

export function ProjectsView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects, isLoading } = api.project.list.useQuery({
    search: search || undefined,
    status: status === "ALL" ? undefined : (status as (typeof projectStatuses)[number]),
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Bodies of work per company — each with notes, custom fields and boards."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            New project
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-icon-subtle"
          />
          <Input
            aria-label="Search projects"
            className="ps-8"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {projectStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !projects?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to group boards and track delivery per client."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden />
              New project
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="raised-card block p-4"
                aria-label={`Open project ${project.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ProjectFavicon website={project.website} color={project.color} size={22} />
                    <p className="font-semibold text-ink">{project.name}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[project.status] ?? "neutral"}>
                    {project.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-ink-subtle">
                  {project.company.name} · started{" "}
                  {new Date(project.startDate).toLocaleDateString()}
                  {project.dueDate
                    ? ` · due ${new Date(project.dueDate).toLocaleDateString()}`
                    : ""}
                </p>
                <p className="mt-2 text-sm text-ink-secondary">
                  {project._count.boards} boards · {project._count.notes} notes
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
