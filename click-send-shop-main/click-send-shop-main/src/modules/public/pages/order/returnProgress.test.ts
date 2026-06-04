import { describe, expect, it } from "vitest";
import type { ReturnRequest } from "@/types/return";
import {
  buildReturnTimeline,
  getBuyerReturnAction,
  shouldShowReturnInFilter,
} from "./returnProgress";

function makeReturn(status: ReturnRequest["status"], patch: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: "r1",
    order_id: "o1",
    order_no: "NO1",
    type: "return_refund",
    reason: "商品损坏",
    description: "",
    images: [],
    status,
    created_at: "2026-06-01 10:00:00",
    updated_at: "2026-06-01 10:00:00",
    ...patch,
  };
}

describe("returnProgress", () => {
  it("marks evidence status as buyer action", () => {
    expect(getBuyerReturnAction(makeReturn("need_evidence"))?.key).toBe("evidence");
  });

  it("marks waiting_return status as logistics action", () => {
    expect(getBuyerReturnAction(makeReturn("waiting_return"))?.key).toBe("logistics");
  });

  it("does not put cancellable pending return into action filter", () => {
    expect(shouldShowReturnInFilter(makeReturn("pending"), "action")).toBe(false);
    expect(shouldShowReturnInFilter(makeReturn("need_evidence"), "action")).toBe(true);
  });

  it("uses backend events as timeline source when available", () => {
    const timeline = buildReturnTimeline(makeReturn("waiting_return", {
      events: [
        {
          id: "e1",
          return_id: "r1",
          actor_type: "user",
          event_type: "created",
          title: "售后申请已提交",
          to_status: "pending",
          created_at: "2026-06-01 10:00:00",
        },
        {
          id: "e2",
          return_id: "r1",
          actor_type: "admin",
          event_type: "status_changed",
          title: "请寄回商品并填写物流",
          from_status: "approved",
          to_status: "waiting_return",
          created_at: "2026-06-02 10:00:00",
        },
      ],
    }));

    expect(timeline).toHaveLength(2);
    expect(timeline[1]?.current).toBe(true);
    expect(timeline[1]?.title).toBe("请寄回商品并填写物流");
  });
});
