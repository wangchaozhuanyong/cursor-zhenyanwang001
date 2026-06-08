import { BANNER_SKELETON_HEIGHT_CLASS } from "@/constants/bannerAspect";
import { Skeleton } from "@/components/ui/skeleton";

type SilkPageLoaderProps = {
  variant?: "home" | "page";
};

export default function SilkPageLoader({ variant = "home" }: SilkPageLoaderProps) {
  return (
    <div
      className="store-page-shell store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]"
      aria-busy="true"
      aria-label="页面加载中"
    >
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center gap-3 px-[var(--store-page-x)] py-2 md:px-6 md:py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full md:max-w-xl" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl px-[var(--store-page-x)] py-4 md:px-6 lg:px-8">
        {variant === "home" ? (
          <>
            <Skeleton className={`${BANNER_SKELETON_HEIGHT_CLASS} w-full rounded-2xl`} />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl md:h-44" />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        )}
      </main>
    </div>
  );
}
