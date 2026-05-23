import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminTableMobileCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** 管理端宽表在 md/lg 以下使用的行卡片外壳 */
export function AdminTableMobileCard({ children, className, onClick }: AdminTableMobileCardProps) {
  return (
    <article
      className={cn(
        "admin-table-mobile-card rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm",
        onClick && "cursor-pointer active:bg-[var(--theme-bg)]/80",
        className,
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
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
    <div className={cn("flex min-w-0 items-start justify-between gap-3 text-sm", className)}>
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
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

export function adminTableMobileVisibility(from: "md" | "lg" = "lg") {
  const hideDesktop = from === "md" ? "md:hidden" : "lg:hidden";
  const hideMobile = from === "md" ? "hidden md:block" : "hidden lg:block";
  return { hideDesktop, hideMobile };
}
