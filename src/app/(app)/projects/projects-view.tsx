"use client";

import { FolderKanban, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        <Skeleton className="h-80" />
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
        <div className="glass-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-md">
            <thead>
              <tr className="border-b border-line text-sm text-ink-subtle">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Project</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Company</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Started</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Due</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium">Boards</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="cursor-pointer border-b border-line-glass-subtle transition-[background-color] duration-[var(--duration-fast)] hover:bg-surface-hover"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <ProjectFavicon website={project.website} color={project.color} size={20} />
                      <span className="font-medium text-ink">{project.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">{project.company.name}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {new Date(project.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-end text-ink">{project._count.boards}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={STATUS_BADGE[project.status] ?? "neutral"}>
                      {project.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
