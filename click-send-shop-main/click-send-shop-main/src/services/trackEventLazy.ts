import type { AnalyticsEventPayload } from "@/services/analyticsService";

type LazyTrackEventOptions = {
  beacon?: boolean;
  deferMs?: number;
};

export function trackEventLazy(payload: AnalyticsEventPayload, options: LazyTrackEventOptions = {}) {
  const { beacon, deferMs = 0 } = options;
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    void import("@/services/analyticsService").then(({ trackEvent }) => {
      if (cancelled) return;
      void trackEvent(payload, beacon === undefined ? undefined : { beacon });
    });
  };

  let timeoutId: number | undefined;
  if (deferMs > 0 && typeof window !== "undefined") {
    timeoutId = window.setTimeout(run, deferMs);
  } else {
    run();
  }

  return () => {
    cancelled = true;
    if (timeoutId) window.clearTimeout(timeoutId);
  };
}
