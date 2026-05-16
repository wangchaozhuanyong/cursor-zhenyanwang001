import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
            <td key={j} className="px-3 py-3">
              <div className="skeleton-base skeleton-shimmer h-4 w-full max-w-[8rem] rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
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
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  tableClassName,
}: AnimatedTableProps<T>) {
  const { level, enabled } = useMotionConfig();

  const wrapperClass = cn(
    "overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]",
    className,
  );

  if (loading) {
    return (
      <div className={wrapperClass}>
        <table className={cn("w-full text-sm", tableClassName)}>
          {thead ? <thead className={theadClassName}>{thead}</thead> : null}
          <tbody>
            <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
          </tbody>
        </table>
        {footer}
      </div>
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
    <div className={wrapperClass}>
      <table className={cn("w-full text-sm text-[var(--theme-text)]", tableClassName)}>
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
      {footer}
    </div>
  );
}

export default AnimatedTable;
