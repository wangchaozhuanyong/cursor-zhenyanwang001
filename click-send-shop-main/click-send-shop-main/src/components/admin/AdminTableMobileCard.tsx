import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminTableMobileVisibility } from "./adminTableMobileCardUtils";

type AdminTableMobileCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** 管理端宽表在 md/lg 以下使用的行卡片外壳 */
export function AdminTableMobileCard({ children, className, onClick }: AdminTableMobileCardProps) {
  const handleKeyDown = onClick
    ? (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter") {
          onClick();
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <article
      className={cn(
        "admin-table-mobile-card rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm",
        onClick && "cursor-pointer active:bg-[var(--theme-bg)]/80",
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </article>
  );
}

type AdminTableMobileCardFieldProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminTableMobileCardField({ label, children, className }: AdminTableMobileCardFieldProps) {
  return (
    <div className={cn("admin-table-mobile-card-field flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3", className)}>
      <span className="min-w-0 text-xs text-muted-foreground sm:shrink-0">{label}</span>
      <div className="min-w-0 flex-1 break-words sm:text-right">{children}</div>
    </div>
  );
}

export function AdminTableMobileCardSkeleton({ rows = 4, from = "lg" }: { rows?: number; from?: "md" | "lg" }) {
  const { hideDesktop } = adminTableMobileVisibility(from);
  return (
    <div className={cn("space-y-2", hideDesktop)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-table-mobile-card rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          <div className="skeleton-base skeleton-shimmer mb-3 h-4 w-2/3 rounded" />
          <div className="space-y-2">
            <div className="skeleton-base skeleton-shimmer h-3 w-full rounded" />
            <div className="skeleton-base skeleton-shimmer h-3 w-4/5 rounded" />
            <div className="skeleton-base skeleton-shimmer h-3 w-3/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
