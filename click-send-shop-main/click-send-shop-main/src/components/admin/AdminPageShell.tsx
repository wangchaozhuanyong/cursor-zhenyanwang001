import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  /** 列表页在标签模式下默认不重复显示大标题 */
  showTitle?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  hintContentClassName?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
};

function AdminPageHintCollapse({
  hint,
  className,
}: {
  hint: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]", className)}>
      <UnifiedButton
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span><Tx>页面说明</Tx></span>
        <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </UnifiedButton>
      {open ? (
        <div className="border-t border-[var(--theme-border)] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/** 管理端页面统一外壳：压缩顶部占用，说明默认折叠 */
export default function AdminPageShell({
  children,
  className,
  showTitle = false,
  title,
  hint,
  hintContentClassName,
  toolbar,
  filters,
}: AdminPageShellProps) {
  const useCompactHeader = !showTitle && Boolean(hint) && Boolean(toolbar);

  return (
    <div className={cn("admin-page-shell min-w-0 space-y-4", className)}>
      {(showTitle && title) || (toolbar && !useCompactHeader) ? (
        <div className="admin-page-header flex min-w-0 flex-wrap items-start justify-between gap-3">
          {showTitle && title ? (
            <AdminPageTitle title={title} hint={hint} hintContentClassName={hintContentClassName} className="text-lg" />
          ) : null}
          {toolbar ? <div className="admin-page-toolbar flex min-w-0 flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}
      {useCompactHeader ? (
        <div className="admin-page-header flex min-w-0 flex-wrap items-start justify-between gap-3">
          <AdminPageHintCollapse hint={hint} className="min-w-0 flex-1" />
          <div className="admin-page-toolbar flex min-w-0 shrink-0 flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      ) : null}
      {!showTitle && hint && !useCompactHeader ? (
        <AdminPageHintCollapse hint={hint} />
      ) : null}
      {filters ? <div className="admin-page-filters min-w-0">{filters}</div> : null}
      {children}
    </div>
  );
}
