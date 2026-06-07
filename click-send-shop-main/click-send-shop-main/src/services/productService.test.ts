import { beforeEach, describe, expect, it, vi } from "vitest";
import * as productApi from "@/api/modules/product";
import { trackHomeEngagement } from "./productService";

vi.mock("@/api/modules/product", () => ({
  trackHomeEvent: vi.fn(),
}));

describe("productService.trackHomeEngagement", () => {
  beforeEach(() => {
    vi.mocked(productApi.trackHomeEvent).mockReset();
    vi.useRealTimers();
  });

  it("sends home engagement events", async () => {
    vi.mocked(productApi.trackHomeEvent).mockResolvedValue({ code: 0, message: "ok", data: null });

    await trackHomeEngagement({
      module: "new_arrivals",
      event: "impression",
      product_id: "p1",
      session_id: "s1",
      meta: { index: 0 },
    });

    expect(productApi.trackHomeEvent).toHaveBeenCalledWith({
      module: "new_arrivals",
      event: "impression",
      product_id: "p1",
      session_id: "s1",
      meta: { index: 0 },
    });
  });

  it("does not reject when tracking fails", async () => {
    vi.mocked(productApi.trackHomeEvent).mockRejectedValue(new Error("network failed"));

    await expect(trackHomeEngagement({
      module: "new_arrivals",
      event: "click",
      product_id: "p1",
    })).resolves.toBeUndefined();
  });

  it("defers home engagement events when requested", async () => {
    vi.useFakeTimers();
    vi.mocked(productApi.trackHomeEvent).mockResolvedValue({ code: 0, message: "ok", data: null });

    await trackHomeEngagement({
      module: "new_arrivals",
      event: "impression",
      product_id: "p1",
    }, { deferMs: 9000 });

    expect(productApi.trackHomeEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(9000);

    expect(productApi.trackHomeEvent).toHaveBeenCalledWith({
      module: "new_arrivals",
      event: "impression",
      product_id: "p1",
    });
  });
});
