import { type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="size-8 text-icon-subtle" />
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-md text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
