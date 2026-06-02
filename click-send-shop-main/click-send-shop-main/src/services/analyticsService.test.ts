import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  trackAnalyticsEvent,
  trackAnalyticsEventsBatch,
} from "@/api/modules/analytics";
import { trackEvent } from "@/services/analyticsService";

vi.mock("@/api/modules/analytics", () => ({
  trackAnalyticsEvent: vi.fn().mockResolvedValue(null),
  trackAnalyticsEventsBatch: vi.fn().mockResolvedValue(null),
}));

describe("analyticsService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(trackAnalyticsEvent).mockClear();
    vi.mocked(trackAnalyticsEventsBatch).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("batches startup analytics events into one request", async () => {
    const first = trackEvent({ event_type: "session_start", module: "storefront", page: "/" });
    const second = trackEvent({ event_type: "page_view", module: "storefront", page: "/" });
    const third = trackEvent({ event_type: "product_impression", module: "product_card", product_id: "p1" });

    expect(trackAnalyticsEventsBatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(160);
    await Promise.all([first, second, third]);

    expect(trackAnalyticsEventsBatch).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
    const batch = vi.mocked(trackAnalyticsEventsBatch).mock.calls[0]?.[0] ?? [];
    expect(batch.map((item) => item.event_type)).toEqual([
      "session_start",
      "page_view",
      "product_impression",
    ]);
    expect(batch.every((item) => item.session_id && item.anonymous_id)).toBe(true);
  });

  it("keeps beacon analytics out of the batch queue", async () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });

    await trackEvent({ event_type: "page_leave", module: "storefront", page: "/" }, { beacon: true });
    await vi.advanceTimersByTimeAsync(200);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEventsBatch).not.toHaveBeenCalled();
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });
});
