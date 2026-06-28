import type { ReactNode } from "react";
import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminTableScrollContainer } from "@/components/admin/AdminTableScrollContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import {
  adminTableClassName,
  adminTdClassName,
  ADMIN_TABLE_STICKY_FIRST_CLASS,
} from "@/utils/adminTableClasses";

type AdminNativeTableProps = {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  stickyFirstColumn?: boolean;
};

/** 非 AnimatedTable 场景（监控、系统设置等）的统一响应式表格容器 */
export function AdminNativeTable({
  children,
  className,
  tableClassName,
  stickyFirstColumn = true,
}: AdminNativeTableProps) {
  return (
    <div className={cn("admin-native-table-card", className)}>
      <AdminTableScrollContainer>
        <table
          className={adminTableClassName(
            cn(
              "w-full text-sm",
              stickyFirstColumn && ADMIN_TABLE_STICKY_FIRST_CLASS,
              tableClassName,
            ),
          )}
        >
          {children}
        </table>
      </AdminTableScrollContainer>
    </div>
  );
}

type AdminNativeTableSkeletonRowsProps = {
  columns: number;
  rows?: number;
  label?: ReactNode;
};

export function AdminNativeTableSkeletonRows({
  columns,
  rows = 5,
  label = "数据加载中",
}: AdminNativeTableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`admin-table-skeleton-${rowIndex}`} className="border-t" aria-hidden={rowIndex > 0}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td
              key={`admin-table-skeleton-${rowIndex}-${columnIndex}`}
              className={adminTdClassName("px-4 py-3", columnIndex === columns - 1 ? "right" : "left")}
            >
              <Skeleton
                className={cn(
                  "h-4 rounded-md",
                  columnIndex === 0 && "w-12",
                  columnIndex > 0 && columnIndex < columns - 1 && (columnIndex % 2 === 0 ? "w-28" : "w-20"),
                  columnIndex === columns - 1 && "ml-auto w-16",
                )}
              />
              {rowIndex === 0 && columnIndex === 0 ? <span className="sr-only">{label}</span> : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

type AdminNativeTableStateRowProps = {
  colSpan: number;
  title: ReactNode;
  description?: ReactNode;
  type?: "empty" | "error";
  actionLabel?: ReactNode;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
};

export function AdminNativeTableStateRow({
  colSpan,
  title,
  description,
  type = "empty",
  actionLabel,
  onAction,
  icon,
  className,
}: AdminNativeTableStateRowProps) {
  const Icon = icon ?? (type === "error" ? AlertTriangle : Inbox);

  return (
    <tr>
      <td className={adminTdClassName("px-4 py-10", "center")} colSpan={colSpan}>
        <div
          className={cn("mx-auto flex max-w-md flex-col items-center justify-center gap-3 text-center", className)}
          role={type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border",
              type === "error"
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : "border-border bg-muted/50 text-muted-foreground",
            )}
            aria-hidden
          >
            <Icon size={18} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
          {onAction && actionLabel ? (
            <UnifiedButton
              type="button"
              onClick={onAction}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              {actionLabel}
            </UnifiedButton>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default AdminNativeTable;
