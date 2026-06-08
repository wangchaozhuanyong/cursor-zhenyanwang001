import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StoreDesktopHeader from "@/components/store/StoreDesktopHeader";
import StoreTabletBar from "@/components/store/StoreTabletBar";
import { useGoBack } from "@/hooks/useGoBack";
import { cn } from "@/lib/utils";

type StoreStandardBreadcrumb = {
  label: ReactNode;
  href?: string;
};

export type StoreStandardPageShellProps = {
  title: ReactNode;
  children: ReactNode;
  backFallback?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  breadcrumbs?: StoreStandardBreadcrumb[];
  mobileHeader?: boolean;
  desktopBackLabel?: string;
  className?: string;
  contentClassName?: string;
};

/** 普通商城二级页：手机 PageHeader，平板/桌面使用商城顶栏 + 标准标题区。 */
export default function StoreStandardPageShell({
  title,
  children,
  backFallback = "/",
  onBack,
  rightSlot,
  breadcrumbs,
  mobileHeader = true,
  desktopBackLabel = "返回",
  className,
  contentClassName,
}: StoreStandardPageShellProps) {
  const defaultBack = useGoBack(backFallback);
  const handleBack = onBack ?? defaultBack;

  return (
    <div className={cn("store-page-shell store-bottom-safe min-h-screen bg-background text-foreground", className)}>
      {mobileHeader ? (
        <div className="md:hidden">
          <PageHeader title={title} onBack={handleBack} rightSlot={rightSlot} />
        </div>
      ) : null}
      <StoreTabletBar className="store-fixed-header" />
      <StoreDesktopHeader className="store-fixed-header" />

      <main className={cn("mx-auto w-full max-w-lg px-[var(--store-page-x)] py-[var(--store-page-y)] sm:px-4 md:max-w-5xl md:px-6 md:py-5 xl:max-w-7xl xl:px-8 xl:pb-12 xl:pt-6", contentClassName)}>
        <div className="mb-5 hidden items-start justify-between gap-4 md:flex">
          <div className="min-w-0">
            <UnifiedButton
              type="button"
              onClick={handleBack}
              className="mb-2 inline-flex h-8 items-center gap-1 rounded-full px-0 text-sm font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
            >
              <ChevronLeft size={16} />
              {desktopBackLabel}
            </UnifiedButton>
            {breadcrumbs?.length ? (
              <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-[var(--theme-text-muted)]" aria-label="面包屑">
                {breadcrumbs.map((item, index) => (
                  <span key={index} className="inline-flex items-center gap-1">
                    <span className={index === breadcrumbs.length - 1 ? "font-medium text-[var(--theme-text)]" : undefined}>
                      {item.label}
                    </span>
                    {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                  </span>
                ))}
              </nav>
            ) : null}
            <h1 className="truncate text-2xl font-bold tracking-normal text-[var(--theme-text)]">{title}</h1>
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
