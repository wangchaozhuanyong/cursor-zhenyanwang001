import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminTableScrollContainerProps = {
  children: ReactNode;
  className?: string;
  showScrollHint?: boolean;
};

export function AdminTableScrollContainer({
  children,
  className,
  showScrollHint = true,
}: AdminTableScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(overflow && scrollLeft < scrollWidth - clientWidth - 2);
    if (showScrollHint && overflow && scrollLeft < 4) {
      setShowHint(true);
    } else if (scrollLeft > 12) {
      setShowHint(false);
    }
  }, [showScrollHint]);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro?.disconnect();
    };
  }, [updateScrollState, children]);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(() => setShowHint(false), 4000);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  return (
    <div
      className="admin-table-scroll-wrap relative"
      data-scroll-left={canScrollLeft || undefined}
      data-scroll-right={canScrollRight || undefined}
    >
      {showHint ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[3] flex items-center justify-end pr-2 lg:hidden"
          aria-hidden
        >
          <span className="whitespace-nowrap rounded-full bg-[var(--theme-bg)]/95 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
            滑动查看更多 →
          </span>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className={cn(
          "admin-table-scroll -mx-[var(--admin-mobile-page-x)] px-[var(--admin-mobile-page-x)] sm:mx-0 sm:px-0",
          "overflow-x-auto overscroll-x-contain touch-pan-x",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default AdminTableScrollContainer;
