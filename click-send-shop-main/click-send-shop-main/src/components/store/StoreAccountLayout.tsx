import type { ReactNode } from "react";
import PageHeader from "@/components/PageHeader";
import StoreAccountNav from "@/components/store/StoreAccountNav";
import { useGoBack } from "@/hooks/useGoBack";
import { cn } from "@/lib/utils";

type StoreAccountLayoutProps = {
  title: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  rightSlot?: ReactNode;
  backFallback?: string;
  className?: string;
  mainClassName?: string;
};

/** 账户域二级页：手机保留 PageHeader；桌面左栏账户导航 + 右栏内容 */
export default function StoreAccountLayout({
  title,
  onBack,
  children,
  rightSlot,
  backFallback,
  className,
  mainClassName,
}: StoreAccountLayoutProps) {
  const defaultBack = useGoBack(backFallback);
  const handleBack = onBack ?? defaultBack;

  return (
    <div className={cn("store-page-shell store-bottom-safe min-h-screen bg-background text-foreground", className)}>
      <div className="lg:hidden">
        <PageHeader title={title} onBack={handleBack} rightSlot={rightSlot} />
      </div>

      <main
        className={cn(
          "mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] py-[var(--store-page-y)] sm:max-w-lg sm:px-4 sm:py-4",
          "lg:grid lg:max-w-none lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-8 lg:pb-12 lg:pt-6",
          mainClassName,
        )}
      >
        <aside className="hidden lg:block">
          <div className="mb-4 text-xl font-bold tracking-tight text-[var(--theme-text)]">{title}</div>
          <StoreAccountNav className="sticky top-[calc(var(--store-desktop-header-height,4rem)+1.5rem)]" />
        </aside>
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
