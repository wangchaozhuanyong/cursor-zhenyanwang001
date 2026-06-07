import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const DEFAULT_DEFERRED_HOME_SECTION_DELAY_MS = 9000;

export default function LazyHomeSection({
  children,
  delayMs = DEFAULT_DEFERRED_HOME_SECTION_DELAY_MS,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const node = ref.current;
    const reveal = () => setReady(true);
    const timeoutId = window.setTimeout(reveal, delayMs);

    if (!node || typeof IntersectionObserver === "undefined") {
      return () => window.clearTimeout(timeoutId);
    }

    const revealIfNearViewport = () => {
      if (!userScrolledRef.current) return;
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 160) reveal();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!userScrolledRef.current) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px 160px 0px", threshold: 0.01 },
    );
    observer.observe(node);

    const onScroll = () => {
      if (window.scrollY <= 80) return;
      userScrolledRef.current = true;
      revealIfNearViewport();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [delayMs, ready]);

  return (
    <div
      ref={ref}
      aria-hidden={ready ? undefined : true}
      className={ready ? "contents" : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"}
    >
      {ready ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}
