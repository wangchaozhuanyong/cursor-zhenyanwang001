import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AdminTableScrollContainer } from "@/components/admin/AdminTableScrollContainer";
import { AdminTableMobileCardSkeleton } from "@/components/admin/AdminTableMobileCard";
import { adminTableMobileVisibility } from "@/components/admin/adminTableMobileCardUtils";
import { adminTableClassName, ADMIN_TABLE_STICKY_FIRST_CLASS } from "@/utils/adminTableClasses";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { tableRowTransition } from "../motionConfig";
import { AnimatedEmptyState } from "./AnimatedEmptyState";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AnimatedTableProps<T> = {
  loading?: boolean;
  rows: T[];
  rowKey: (row: T) => string;
  renderRow: (row: T, index: number) => ReactNode;
  /** lg 以下以卡片展示宽表行（与 renderRow 并存，桌面仍用表格） */
  renderMobileCard?: (row: T, index: number) => ReactNode;
  /** 卡片模式生效断点：默认 lg（<1024px 为卡片） */
  mobileCardFrom?: "md" | "lg";
  skeletonRows?: number;
  skeletonCols?: number;
  thead?: ReactNode;
  theadClassName?: string;
  footer?: ReactNode;
  error?: boolean;
  errorTitle?: string;
  errorDescription?: string;
  errorAction?: ReactNode;
  onRetry?: () => void;
  /** 嵌入外层卡片时使用：去掉内层圆角/边框，分页栏在横向滚动区域外渲染 */
  embedded?: boolean;
  /** 移动端/平板冻结首列，便于宽表横滑时定位主键列 */
  stickyFirstColumn?: boolean;
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
  const scrollArea = (
    <AdminTableScrollContainer className={embedded ? className : undefined}>
      {children}
    </AdminTableScrollContainer>
  );

  if (embedded) {
    return (
      <>
        {scrollArea}
        {footer}
      </>
    );
  }

  return (
    <div className={cn("rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]", className)}>
      {scrollArea}
      {footer}
    </div>
  );
}

function mobileCardMediaQuery(from: "md" | "lg") {
  return from === "md" ? "(max-width: 767px)" : "(max-width: 1023px)";
}

function useMobileCardViewport(enabled: boolean, from: "md" | "lg") {
  const query = useMemo(() => mobileCardMediaQuery(from), [from]);
  const [matches, setMatches] = useState(() => (
    enabled && typeof window !== "undefined" && window.matchMedia(query).matches
  ));

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setMatches(false);
      return;
    }
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [enabled, query]);

  return enabled && matches;
}

export function AnimatedTable<T>({
  loading,
  rows,
  rowKey,
  renderRow,
  renderMobileCard,
  mobileCardFrom = "lg",
  skeletonRows = 6,
  skeletonCols = 5,
  thead,
  theadClassName,
  footer,
  error,
  errorTitle = "加载失败",
  errorDescription = "数据暂时没有加载成功，请检查网络或稍后重试。",
  errorAction,
  onRetry,
  embedded,
  stickyFirstColumn = true,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  tableClassName,
}: AnimatedTableProps<T>) {
  const { level, enabled } = useMotionConfig();
  const mobileCards = Boolean(renderMobileCard);
  const showMobileCards = useMobileCardViewport(mobileCards, mobileCardFrom);
  const showDesktopTable = !mobileCards || !showMobileCards;
  const { hideDesktop, hideMobile } = adminTableMobileVisibility(mobileCardFrom);
  const resolvedTableClass = adminTableClassName(
    cn(
      "w-full text-sm text-[var(--theme-text)]",
      stickyFirstColumn && ADMIN_TABLE_STICKY_FIRST_CLASS,
      tableClassName,
    ),
  );
  const loadingTableClass = adminTableClassName(
    cn("w-full text-sm", stickyFirstColumn && ADMIN_TABLE_STICKY_FIRST_CLASS, tableClassName),
  );
  const tableFrameClass = cn(className, mobileCards && hideMobile);
  const tableFooter = mobileCards ? undefined : footer;
  const mobileCardListClass = cn(
    "space-y-2",
    hideDesktop,
    !embedded && "rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-2 sm:p-3",
  );

  if (loading) {
    return (
      <>
        {showMobileCards ? <AdminTableMobileCardSkeleton rows={skeletonRows} from={mobileCardFrom} /> : null}
        {showDesktopTable ? (
          <TableFrame embedded={embedded} className={tableFrameClass} footer={tableFooter}>
            <table className={loadingTableClass}>
              {thead ? <thead className={theadClassName}>{thead}</thead> : null}
              <tbody>
                <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
              </tbody>
            </table>
          </TableFrame>
        ) : null}
        {mobileCards ? footer : null}
      </>
    );
  }

  if (error && rows.length === 0) {
    const retryAction = errorAction ?? (onRetry ? (
      <UnifiedButton
        type="button"
        onClick={onRetry}
        className="rounded-lg btn-theme-price px-4 py-2 text-xs font-semibold text-[var(--theme-price-foreground)]"
      >
        重试
      </UnifiedButton>
    ) : null);

    return (
      <AnimatedEmptyState
        icon={AlertTriangle}
        title={errorTitle}
        description={errorDescription}
        action={retryAction}
        className={className}
      />
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
    <>
      {showMobileCards ? (
        <div className={mobileCardListClass}>
          <AnimatePresence initial={false}>
            {rows.map((row, index) => {
              const key = rowKey(row);
              const motionProps = tableRowTransition(level, index, rows.length);
              if (!enabled) {
                return <div key={key}>{renderMobileCard!(row, index)}</div>;
              }
              return (
                <motion.div
                  key={key}
                  layout={false}
                  initial={motionProps.initial}
                  animate={motionProps.animate}
                  exit={motionProps.exit}
                  transition={motionProps.transition}
                >
                  {renderMobileCard!(row, index)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : null}
      {showDesktopTable ? (
        <TableFrame embedded={embedded} className={tableFrameClass} footer={tableFooter}>
          <table className={resolvedTableClass}>
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
      ) : null}
      {mobileCards ? footer : null}
    </>
  );
}

export default AnimatedTable;
