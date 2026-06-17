import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CartPromotionNudge from "./CartPromotionNudge";
import type { PromotionEvaluation } from "@/types/orderPreview";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CartPromotionNudge", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderNudge(evaluation: PromotionEvaluation) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<CartPromotionNudge campaign={null} amount={88} evaluation={evaluation} onBrowse={vi.fn()} />);
    });
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it("renders discount and unavailable reasons", async () => {
    await renderNudge({
      engine_version: "v2",
      eligible: true,
      applied: [],
      discount_lines: [{ type: "full_reduction", label: "满 100 减 10", amount: 10 }],
      reward_lines: [],
      unavailable_reasons: [
        {
          promotion_id: "p2",
          type: "full_discount",
          title: "满折活动",
          reason: "amount_shortfall",
          current_amount: 88,
          threshold_amount: 120,
          shortfall_amount: 32,
        },
      ],
      matched_items: [],
      stacking_result: {},
      order_snapshot: { goods_amount: 88, final_amount: 78 },
    });

    expect(container?.textContent).toContain("满 100 减 10");
    expect(container?.textContent).toContain("已为你计算可用优惠 RM 10");
    expect(container?.textContent).toContain("满折活动：还差 RM 32");
    expect(container?.textContent).toContain("结算页会显示最终金额");
  });

  it("does not present discounts as applied when evaluation is ineligible", async () => {
    await renderNudge({
      engine_version: "v2",
      eligible: false,
      applied: [],
      discount_lines: [{ type: "flash_sale", label: "秒杀优惠", amount: 51 }],
      reward_lines: [],
      unavailable_reasons: [
        {
          promotion_id: "p1",
          type: "flash_sale",
          title: "V10 秒杀测试活动",
          reason: "该活动不可与其他活动叠加使用",
          blocking: true,
        },
      ],
      matched_items: [],
      stacking_result: {},
      order_snapshot: { goods_amount: 312, final_amount: 205.4 },
    });

    expect(container?.textContent).toContain("活动「V10 秒杀测试活动」不可用");
    expect(container?.textContent).toContain("该活动不可与其他活动叠加使用");
    expect(container?.textContent).not.toContain("已为你计算可用优惠");
    expect(container?.textContent).not.toContain("RM 51");
  });
});
