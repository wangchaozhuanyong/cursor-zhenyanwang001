import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { adminTableClassName } from "@/utils/adminTableClasses";
import type { LucideIcon } from "lucide-react";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { tableRowTransition } from "../motionConfig";
import { AnimatedEmptyState } from "./AnimatedEmptyState";

type AnimatedTableProps<T> = {
  loading?: boolean;
  rows: T[];
  rowKey: (row: T) => string;
  renderRow: (row: T, index: number) => ReactNode;
  skeletonRows?: number;
  skeletonCols?: number;
  thead?: ReactNode;
  theadClassName?: string;
  footer?: ReactNode;
  /** 嵌入外层卡片时使用：去掉内层圆角/边框，分页栏在横向滚动区域外渲染 */
  embedded?: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  tableClassName?: string;
};

function TableSkeleton({ rows, cols = 5 }: { rows: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--theme-border)]">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j}>
              <div className="skeleton-base skeleton-shimmer h-4 w-full max-w-[8rem] rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableFrame({
  embedded,
  className,
  footer,
  children,
}: {
  embedded?: boolean;
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const scrollClass = cn("overflow-x-auto", className);

  if (embedded) {
    return (
      <>
        <div className={scrollClass}>{children}</div>
        {footer}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]">
      <div className={scrollClass}>{children}</div>
      {footer}
    </div>
  );
}

export function AnimatedTable<T>({
  loading,
  rows,
  rowKey,
  renderRow,
  skeletonRows = 6,
  skeletonCols = 5,
  thead,
  theadClassName,
  footer,
  embedded,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  tableClassName,
}: AnimatedTableProps<T>) {
  const { level, enabled } = useMotionConfig();

  if (loading) {
    return (
      <TableFrame embedded={embedded} className={className} footer={footer}>
        <table className={adminTableClassName(cn("w-full text-sm", tableClassName))}>
          {thead ? <thead className={theadClassName}>{thead}</thead> : null}
          <tbody>
            <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
          </tbody>
        </table>
      </TableFrame>
    );
  }

  if (rows.length === 0) {
    return (
      <AnimatedEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <TableFrame embedded={embedded} className={className} footer={footer}>
      <table className={adminTableClassName(cn("w-full text-sm text-[var(--theme-text)]", tableClassName))}>
        {thead ? <thead className={theadClassName}>{thead}</thead> : null}
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((row, index) => {
              const key = rowKey(row);
              const motionProps = tableRowTransition(level, index, rows.length);
              if (!enabled) {
                return (
                  <tr
                    key={key}
                    className="border-b border-[var(--theme-border)] transition-colors hover:bg-[var(--theme-bg)]/80"
                  >
                    {renderRow(row, index)}
                  </tr>
                );
              }
              return (
                <motion.tr
                  key={key}
                  layout={false}
                  initial={motionProps.initial}
                  animate={motionProps.animate}
                  exit={motionProps.exit}
                  transition={motionProps.transition}
                  className="border-b border-[var(--theme-border)] transition-colors hover:bg-[var(--theme-bg)]/80"
                >
                  {renderRow(row, index)}
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </TableFrame>
  );
}

export default AnimatedTable;
