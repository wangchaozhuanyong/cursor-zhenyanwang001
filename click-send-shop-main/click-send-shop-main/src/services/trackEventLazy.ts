import type { AnalyticsEventPayload } from "@/services/analyticsService";
import { scheduleIdleTask } from "@/utils/idleScheduler";

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

  if (deferMs > 0 && typeof window !== "undefined") {
    const cancelIdle = scheduleIdleTask(`analytics:${payload.event_type}`, run, {
      delayMs: deferMs,
      timeoutMs: 5000,
      jitterMs: 2500,
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  } else {
    run();
  }

  return () => {
    cancelled = true;
  };
}
