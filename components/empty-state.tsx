import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper-dim">
        <Icon className="h-5 w-5 text-ink-muted" />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      )}
      {children}
    </div>
  );
}
