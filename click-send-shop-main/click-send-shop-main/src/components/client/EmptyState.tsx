import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientEmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: ClientEmptyStateProps) {
  return (
    <div className={cn("sf-next-empty-state sf-next-card", className)} role="status">
      <div className="sf-next-empty-state__icon" aria-hidden>
        {icon ?? <SearchX size={30} />}
      </div>
      <h3 className="sf-next-empty-state__title">{title}</h3>
      {description ? <p className="sf-next-empty-state__desc">{description}</p> : null}
      {action ? <div className="sf-next-empty-state__action">{action}</div> : null}
    </div>
  );
}
