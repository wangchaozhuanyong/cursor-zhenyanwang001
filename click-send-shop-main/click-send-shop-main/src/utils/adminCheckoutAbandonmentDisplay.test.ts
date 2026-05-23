import { describe, expect, it } from "vitest";
import type { CheckoutAbandonment } from "@/types/order";
import {
  formatCheckoutAbandonmentDisplayLabel,
  formatMergedSnapshotsLabel,
  getCheckoutAbandonmentActionLabel,
} from "./adminCheckoutAbandonmentDisplay";

const baseRow = {
  id: "snap-1",
  display_id: "NO1001",
  display_type: "order" as const,
  action_type: "view_order" as const,
  status: "ordered" as const,
  order_id: "ord-1",
  order_no: "NO1001",
  snapshot_count: 2,
  has_duplicates: true,
  items_count: 1,
  items_summary: [],
  items_preview: "商品A x1，等 3 件",
  raw_amount: 0,
  discount_amount: 0,
  shipping_fee: 0,
  total_amount: 10,
  payment_method: "online",
  contact_name: "Lee",
  contact_phone_masked: "138****0000",
  created_at: "2026-01-01",
  updated_at: "2026-01-02",
} satisfies CheckoutAbandonment;

describe("adminCheckoutAbandonmentDisplay", () => {
  it("shows merged snapshots label when snapshot_count > 1", () => {
    expect(formatMergedSnapshotsLabel(2)).toBe("已合并 2 条快照");
    expect(formatMergedSnapshotsLabel(1)).toBeNull();
  });

  it("uses view order action when order_id exists", () => {
    expect(getCheckoutAbandonmentActionLabel(baseRow)).toBe("查看订单");
    expect(
      getCheckoutAbandonmentActionLabel({
        ...baseRow,
        order_id: null,
        action_type: "view_checkout",
      }),
    ).toBe("仅记录");
  });

  it("formats order and checkout display labels", () => {
    expect(formatCheckoutAbandonmentDisplayLabel(baseRow)).toBe("#NO1001");
    expect(
      formatCheckoutAbandonmentDisplayLabel({
        ...baseRow,
        display_type: "checkout",
        display_id: "12345678",
        order_no: "",
      }),
    ).toBe("快照 #12345678");
  });

  it("keeps items_preview short for table rendering", () => {
    expect(baseRow.items_preview.length).toBeLessThan(40);
    expect(baseRow.items_preview).toContain("等 3 件");
  });
});
