import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BANNER_SKELETON_HEIGHT_CLASS } from "@/constants/bannerAspect";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 路由懒加载时的极简占位（非全屏 Spinner）：仅顶栏 + 一条主内容区。
 * 与 TopProgressBar 并存，避免首屏/切页瞬间空白。
 */
function StorefrontFallback() {
  return (
    <div
      data-route-fallback="store-app"
      className="sf-next-page-shell sf-next-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]"
      aria-busy="true"
      aria-label="页面加载中"
    >
      <div className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-4 py-3 md:px-6">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full md:max-w-md" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:w-10" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-4 pt-5 md:px-6 md:pt-8">
        <Skeleton className="h-[min(42vh,20rem)] w-full md:h-72" />
      </div>
    </div>
  );
}

function AdminFallback() {
  return (
    <div
      data-route-fallback="admin-app"
      className="flex min-h-screen bg-muted/30"
      aria-busy="true"
      aria-label="后台加载中"
    >
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full sf-next-theme-radius" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <Skeleton className="mb-6 h-9 w-48 max-w-full" />
        <Skeleton className="h-[min(40vh,18rem)] w-full max-w-4xl sf-next-theme-radius" />
      </div>
    </div>
  );
}

/** 仅主内容区占位：与 AdminLayout 中 `<main>` 同级，避免懒加载子路由时整站侧栏被根 Suspense 卸掉导致闪跳 */
export function AdminOutletFallback() {
  return (
    <div data-route-fallback="admin-outlet" className="space-y-6" aria-busy="true" aria-label="页面加载中">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-md sf-next-theme-radius" />
      <Skeleton className="h-[min(42vh,20rem)] w-full sf-next-theme-radius" />
    </div>
  );
}

export function StoreOutletFallback() {
  return (
    <div
      data-route-fallback="store-outlet"
      className="sf-next-page-shell sf-next-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]"
      aria-busy="true"
      aria-label="页面加载中"
    >
      <div className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-4 py-3 md:px-6">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full md:max-w-md" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:w-10" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-screen-xl px-4 py-4 md:px-6">
        <Skeleton className={`${BANNER_SKELETON_HEIGHT_CLASS} w-full rounded-2xl`} />
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function StoreTabContentFallback() {
  return (
    <main
      data-route-fallback="store-tab-content"
      className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] pb-6 pt-[var(--store-page-y)] md:px-6"
      aria-busy="true"
      aria-label="页面加载中"
    >
      <div className="sf-next-surface-card p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full rounded-full" />
            <Skeleton className="h-3 w-44 max-w-full rounded-full" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export function HomeShellSkeleton() {
  return (
    <div
      data-route-fallback="home-shell"
      className="sf-next-page-shell sf-next-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]"
      aria-busy="true"
      aria-label="首页加载中"
    >
      <div className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-[var(--store-page-x)] py-2 md:px-6 md:py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full md:h-10 md:max-w-xl" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-4 px-[var(--store-page-x)] pt-[var(--store-page-y)] pb-6 md:px-6 lg:px-8">
        <Skeleton className={`${BANNER_SKELETON_HEIGHT_CLASS} w-full rounded-2xl`} />
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 sm:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function DelayedRouteFallback({
  fallback,
  delayMs = 120,
}: {
  fallback: ReactNode;
  delayMs?: number;
}) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return visible ? <>{fallback}</> : null;
}

export default function AppRouteFallback() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) {
    return <AdminFallback />;
  }
  return <StorefrontFallback />;
}
