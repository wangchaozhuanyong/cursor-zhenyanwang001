import { describe, expect, it } from "vitest";
import {
  createActivityCopyDraft,
  createInitialActivityForm,
  getCouponIdsFromActivityConfig,
  normalizeActivityTypeForForm,
  normalizePayloadForSubmit,
  validateActivityForm,
} from "./activityFormLogic";
import { getAllowedDisplayPositionsForActivity } from "@/constants/marketingDisplayPositions";

describe("activityFormLogic", () => {
  it("creates clean copy drafts without source item ids, sold counts, version, or slug", () => {
    const draft = createActivityCopyDraft({
      id: "activity-1",
      type: "flash_sale",
      title: "周末秒杀",
      description: "source",
      start_at: "2026-01-01T00:00",
      end_at: "2026-01-02T00:00",
      disabled: false,
      scope_type: "product",
      scope_ids: ["p1"],
      allow_coupon_stack: false,
      allow_points_stack: true,
      allow_reward: true,
      display_positions: ["promotion_banner"],
      activity_config: { label: "source" },
      rule_config: { label: "source" },
      slug: "weekend-flash",
      priority: 8,
      stackable: false,
      exclusive_with: ["coupon"],
      usage_limit_total: 100,
      usage_limit_per_user: 1,
      sort_order: 2,
      product_count: 1,
      activity_stock_total: 10,
      sold_count_total: 6,
      version: 7,
      status: "active",
      status_label: "进行中",
      items: [
        {
          id: "old-row-1",
          product_id: "p1",
          product_name: "商品 A",
          activity_price: 9,
          activity_stock: 10,
          limit_per_user: 1,
          sold_count: 6,
          sort_order: 0,
        },
      ],
    });

    expect(draft.title).toBe("周末秒杀 副本");
    expect(draft.status).toBe("draft");
    expect(draft.start_at).toBe("");
    expect(draft.end_at).toBe("");
    expect(draft.slug).toBeNull();
    expect(draft.version).toBeUndefined();
    expect(draft.scope_ids).toEqual(["p1"]);
    expect(draft.items).toEqual([
      {
        product_id: "p1",
        product_name: "商品 A",
        activity_price: 9,
        activity_stock: 10,
        limit_per_user: 1,
        sort_order: 0,
      },
    ]);
  });

  it("keeps flash sale scope derived from selected items", () => {
    const form = createInitialActivityForm("flash_sale");
    form.version = 3;
    form.items = [
      { product_id: "p1", activity_price: 8, activity_stock: 5, limit_per_user: 1 },
      { product_id: "p1", activity_price: 8, activity_stock: 5, limit_per_user: 1 },
      { product_id: "p2", activity_price: 9, activity_stock: 3, limit_per_user: 0 },
    ];

    const payload = normalizePayloadForSubmit(form, "active");

    expect(payload.scope_type).toBe("product");
    expect(payload.scope_ids).toEqual(["p1", "p2"]);
    expect(payload.status).toBe("active");
    expect(payload.version).toBe(3);
  });

  it("requires object scope selections for non-flash-sale publish validation", () => {
    const form = createInitialActivityForm("full_reduction");
    form.title = "满减";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = [];

    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [{ threshold_amount: 100, discount_amount: 10 }],
    })).toBe("请选择活动适用商品");
  });

  it("accepts a complete full reduction form", () => {
    const form = createInitialActivityForm("full_reduction");
    form.title = "满减";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = ["p1"];

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [{ threshold_amount: 100, discount_amount: 10 }],
    })).toBe("");
  });

  it("creates full discount forms with publishable rule defaults", () => {
    const form = createInitialActivityForm("full_discount");

    expect(form.display_positions).toEqual(["full_reduction_notice"]);
    expect(form.activity_config).toEqual({
      full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
    });
    expect(form.rule_config).toEqual(form.activity_config);
  });

  it("validates full discount rule thresholds and percentages", () => {
    const form = createInitialActivityForm("full_discount");
    form.title = "满折";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = ["p1"];

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [],
      fullDiscountRules: [{ threshold_amount: 100, discount_percent: 100 }],
    })).toBe("满折折扣必须大于 0 且小于 100（90=9折）");

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [],
      fullDiscountRules: [{ threshold_amount: 100, discount_percent: 90 }],
    })).toBe("");
  });

  it("creates member price forms with publishable rule defaults", () => {
    const form = createInitialActivityForm("member_price");

    expect(form.display_positions).toEqual(["product_detail"]);
    expect(form.activity_config).toEqual({
      member_price_rules: [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }],
    });
    expect(form.rule_config).toEqual(form.activity_config);
  });

  it("maps legacy member and points activity types to the new form model", () => {
    expect(normalizeActivityTypeForForm("member_activity")).toBe("member_price");
    expect(normalizeActivityTypeForForm("points_bonus")).toBe("points_reward");
    expect(createInitialActivityForm(normalizeActivityTypeForForm("member_activity")).type).toBe("member_price");
  });

  it("validates member price discounts before publish", () => {
    const form = createInitialActivityForm("member_price");
    form.title = "会员专享价";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.scope_type = "product";
    form.scope_ids = ["p1"];

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [],
      memberPriceRules: [{ discount_percent: 100, min_order_amount: 0, member_level_ids: [] }],
    })).toBe("会员价折扣必须大于 0 且小于 100（95=9.5折）");

    expect(validateActivityForm({
      form,
      selectedScopeIds: ["p1"],
      invalidDisplayPositions: [],
      fullReductionRules: [],
      memberPriceRules: [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }],
    })).toBe("");
  });

  it("creates checkin reward forms with daily points defaults", () => {
    const form = createInitialActivityForm("checkin_reward");

    expect(form.scope_type).toBe("all");
    expect(form.display_positions).toEqual(["profile_center"]);
    expect(form.activity_config).toEqual({
      bonus_kind: "checkin",
      reward_points: 5,
      once_per_day: true,
      streak_bonus_points: 0,
      streak_bonus_every_days: 0,
    });
  });

  it("validates checkin reward points before publish", () => {
    const form = createInitialActivityForm("checkin_reward");
    form.title = "签到奖励";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.activity_config = { bonus_kind: "checkin", reward_points: 0 };

    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [],
    })).toBe("签到奖励积分必须至少为 1");

    form.activity_config = { bonus_kind: "checkin", reward_points: 8, streak_bonus_points: 0, streak_bonus_every_days: 0 };

    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [],
    })).toBe("");
  });

  it("creates coupon activity drafts with coupon defaults", () => {
    const form = createInitialActivityForm("coupon");

    expect(form.scope_type).toBe("all");
    expect(form.scope_ids).toEqual([]);
    expect(form.display_positions).toEqual(["home_coupon_center"]);
    expect(form.activity_config).toEqual({ coupon_ids: [] });
    expect(form.rule_config).toEqual({ coupon_ids: [] });
  });

  it("requires at least one coupon template for coupon activity publish", () => {
    const form = createInitialActivityForm("coupon");
    form.title = "统一优惠券活动";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";

    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [],
    })).toBe("请选择至少一张优惠券模板");
  });

  it("accepts coupon activity publish validation with coupon templates", () => {
    const form = createInitialActivityForm("coupon");
    form.title = "统一优惠券活动";
    form.start_at = "2026-01-01T00:00";
    form.end_at = "2026-01-02T00:00";
    form.activity_config = { coupon_ids: ["coupon-1", "coupon-1", "coupon-2"] };
    form.rule_config = form.activity_config;

    expect(getCouponIdsFromActivityConfig(form.activity_config)).toEqual(["coupon-1", "coupon-2"]);
    expect(validateActivityForm({
      form,
      selectedScopeIds: [],
      invalidDisplayPositions: [],
      fullReductionRules: [],
    })).toBe("");
  });

  it("允许可发布活动选择营销横幅位", () => {
    for (const type of ["flash_sale", "full_reduction", "full_discount", "points_bonus"]) {
      expect(getAllowedDisplayPositionsForActivity(type)).toContain("promotion_banner");
    }
  });
});
