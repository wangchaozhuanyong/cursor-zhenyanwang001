import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 路由懒加载时的极简占位（非全屏 Spinner）：仅顶栏 + 一条主内容区。
 * 与 TopProgressBar 并存，避免首屏/切页瞬间空白。
 */
function StorefrontFallback() {
  return (
    <div className="min-h-screen bg-[var(--theme-bg)]" aria-busy="true" aria-label="页面加载中">
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
      className="flex min-h-screen bg-muted/30"
      aria-busy="true"
      aria-label="后台加载中"
    >
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full theme-rounded" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <Skeleton className="mb-6 h-9 w-48 max-w-full" />
        <Skeleton className="h-[min(40vh,18rem)] w-full max-w-4xl theme-rounded" />
      </div>
    </div>
  );
}

export default function AppRouteFallback() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) {
    return <AdminFallback />;
  }
  return <StorefrontFallback />;
}
