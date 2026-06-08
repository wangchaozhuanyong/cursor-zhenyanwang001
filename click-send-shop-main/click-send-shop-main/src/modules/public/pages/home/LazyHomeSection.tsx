import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { getPerfDuration, logPerf, markPerfStart } from "@/utils/performanceDebug";
import { scheduleIdleTask } from "@/utils/idleScheduler";

const DEFAULT_DEFERRED_HOME_SECTION_DELAY_MS = 9000;
const SECTION_ROOT_MARGIN = "360px 0px 480px 0px";

type RevealCallback = () => void;

const observedSections = new Map<Element, RevealCallback>();
let sharedObserver: IntersectionObserver | null = null;
let fallbackDelayOffset = 0;

function getSharedObserver() {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const reveal = observedSections.get(entry.target);
          if (!reveal) return;
          reveal();
          observedSections.delete(entry.target);
          sharedObserver?.unobserve(entry.target);
        });
      },
      { rootMargin: SECTION_ROOT_MARGIN, threshold: 0.01 },
    );
  }
  return sharedObserver;
}

function observeLazyHomeSection(node: Element, reveal: RevealCallback) {
  const observer = getSharedObserver();
  if (!observer) return false;
  observedSections.set(node, reveal);
  observer.observe(node);
  return true;
}

function unobserveLazyHomeSection(node: Element) {
  observedSections.delete(node);
  sharedObserver?.unobserve(node);
}

export default function LazyHomeSection({
  children,
  delayMs = DEFAULT_DEFERRED_HOME_SECTION_DELAY_MS,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mountStartRef = useRef(markPerfStart());
  const renderCountRef = useRef(0);
  const [ready, setReady] = useState(delayMs <= 0);

  renderCountRef.current += 1;

  useEffect(() => {
    if (ready) {
      logPerf("home-section:render", {
        renders: renderCountRef.current,
        mountDuration: getPerfDuration(mountStartRef.current),
      });
    }
  });

  useEffect(() => {
    if (ready) return;
    const node = ref.current;
    if (!node) return;

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setReady(true);
    };

    fallbackDelayOffset = (fallbackDelayOffset + 240) % 1200;
    const cancelFallback = scheduleIdleTask("lazy-home-section-fallback", reveal, {
      delayMs: Math.max(0, delayMs + fallbackDelayOffset),
      timeoutMs: 5000,
      jitterMs: 1200,
    });
    const usingObserver = observeLazyHomeSection(node, reveal);
    if (usingObserver) {
      return () => {
        cancelFallback();
        unobserveLazyHomeSection(node);
      };
    }

    return () => cancelFallback();
  }, [delayMs, ready]);

  return (
    <div
      ref={ref}
      aria-hidden={ready ? undefined : true}
      className={ready ? "contents" : "pointer-events-none min-h-0 overflow-hidden opacity-0"}
    >
      {ready ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}
