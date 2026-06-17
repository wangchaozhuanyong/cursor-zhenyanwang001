import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import CheckoutPromotionExplanation from "./CheckoutPromotionExplanation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CheckoutPromotionExplanation", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

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

  it("renders backend preview guardrails and discount details", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <CheckoutPromotionExplanation
          discountLines={[{ type: "coupon", label: "优惠券", amount: 8 }]}
          pointsBonusLines={[{ type: "points_bonus", label: "双倍积分", multiplier_percent: 200 }]}
          orderSnapshot={{ final_amount: 92 }}
          promotionEvaluation={{
            engine_version: "v2",
            eligible: true,
            applied: [],
            unavailable_reasons: [],
            discount_lines: [{ type: "coupon", label: "优惠券", amount: 8 }],
            reward_lines: [],
            matched_items: [],
            stacking_result: {},
            order_snapshot: { final_amount: 92 },
          }}
        />,
      );
    });

    expect(container.textContent).toContain("后端订单预览已接管优惠计算");
    expect(container.textContent).toContain("优惠券：已减 RM 8");
    expect(container.textContent).toContain("后端结算应付：RM 92");
    expect(container.textContent).toContain("提交订单时仍会再次校验库存、运费和最终金额");
  });

  it("does not show campaign progress when backend preview is blocked", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <CheckoutPromotionExplanation
          currentAmount={312}
          pricingReady={false}
          pricingError="活动「V10 秒杀测试活动」不可用：该活动不可与其他活动叠加使用，请刷新结算页后重试"
          fullReductionCampaign={{
            id: "full-reduction",
            title: "满100减15 / 满200减35",
            type: "full_reduction",
            slug: "full-reduction",
            status: "active",
            priority: 1,
            stackable: false,
            exclusiveWith: [],
            startsAt: "",
            endsAt: "",
            promoLabel: "满100减15 / 满200减35",
            ruleConfig: {
              thresholds: [{ amount: 100, discount: 15 }],
            },
            productIds: [],
            categoryIds: [],
          }}
        />,
      );
    });

    expect(container.textContent).toContain("活动「V10 秒杀测试活动」不可用");
    expect(container.textContent).not.toContain("已达成");
  });
});
