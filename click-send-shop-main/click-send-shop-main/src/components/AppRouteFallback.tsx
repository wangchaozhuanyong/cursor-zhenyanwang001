import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 前台路由懒加载使用安静画布，不渲染商品、Banner 或整页骨架。
 */
function StorefrontMotionCanvas({
  label = "页面加载中",
  fallbackName,
}: {
  label?: string;
  fallbackName: string;
}) {
  return (
    <div
      data-route-fallback={fallbackName}
      className="sf-motion-fallback-canvas"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sf-motion-fallback-canvas__line" aria-hidden="true" />
    </div>
  );
}

function StorefrontFallback() {
  return <StorefrontMotionCanvas fallbackName="store-app" />;
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
  return <StorefrontMotionCanvas fallbackName="store-outlet" />;
}

export function StoreTabContentFallback() {
  return <StorefrontMotionCanvas fallbackName="store-tab-content" />;
}

export function HomeShellSkeleton() {
  return <StorefrontMotionCanvas fallbackName="home-shell" label="首页加载中" />;
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
