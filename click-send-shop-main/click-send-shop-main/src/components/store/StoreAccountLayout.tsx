import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import StoreAccountNav from "@/components/store/StoreAccountNav";
import StoreDesktopHeader from "@/components/store/StoreDesktopHeader";
import StoreTabletBar from "@/components/store/StoreTabletBar";
import { useGoBack } from "@/hooks/useGoBack";
import { cn } from "@/lib/utils";

type StoreAccountBreadcrumb = {
  label: ReactNode;
  href?: string;
};

type StoreAccountLayoutProps = {
  title: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  rightSlot?: ReactNode;
  backFallback?: string;
  desktopBackLabel?: string;
  breadcrumbs?: StoreAccountBreadcrumb[];
  className?: string;
  mainClassName?: string;
};

/** 账户域二级页：手机保留 PageHeader；桌面左栏账户导航 + 右栏内容 */
export default function StoreAccountLayout({
  title,
  onBack,
  children,
  rightSlot,
  backFallback = "/profile",
  desktopBackLabel = "返回我的",
  breadcrumbs,
  className,
  mainClassName,
}: StoreAccountLayoutProps) {
  const defaultBack = useGoBack(backFallback);
  const handleBack = onBack ?? defaultBack;

  return (
    <div className={cn("store-page-shell store-bottom-safe min-h-screen bg-background text-foreground", className)}>
      <div className="md:hidden">
        <PageHeader title={title} onBack={handleBack} rightSlot={rightSlot} />
      </div>
      <StoreTabletBar className="store-fixed-header" />
      <StoreDesktopHeader className="store-fixed-header" />

      <main
        className={cn(
          "mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] py-[var(--store-page-y)] sm:px-4 sm:py-4",
          "md:max-w-5xl md:px-6 md:py-5 lg:grid lg:max-w-6xl lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6 xl:max-w-screen-xl xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-8 xl:px-8 xl:pb-12 xl:pt-6",
          mainClassName,
        )}
      >
        <aside className="hidden lg:block">
          <StoreAccountNav className="sticky top-[var(--store-tablet-sticky-top)] xl:top-[var(--store-desktop-sticky-top)]" />
        </aside>
        <section className="min-w-0">
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
        </section>
      </main>
    </div>
  );
}
