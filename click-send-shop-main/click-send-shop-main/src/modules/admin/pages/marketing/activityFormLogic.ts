import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPayload, ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  WIP_ACTIVITY_TYPES,
  getDefaultDisplayPositionsForActivity,
  normalizeDisplayPositionsForActivity,
  type DisplayPosition,
} from "@/constants/marketingDisplayPositions";
import { invalidateHomeBootstrapCache } from "@/services/homeService";
import { adminSaveDebug } from "@/modules/admin/utils/adminDebug";

export const ACTIVITY_FORM_STEPS = ["选择类型", "基础信息", "活动规则", "适用范围", "展示设置", "预览发布"] as const;
export const OBJECT_SCOPE_TYPES = new Set<ActivityPayload["scope_type"]>(["category", "product"]);
export const ACTIVITY_PRICE_TYPES = new Set<ActivityType>(["flash_sale", "limited_time_discount"]);
export const POINTS_REWARD_TYPES = new Set<ActivityType>(["points_bonus", "points_reward", "checkin_reward"]);
export const GENERAL_SCOPE_ACTIVITY_TYPES = new Set<ActivityType>(["campaign", "coupon", "checkin_reward"]);
export const LEGACY_COUPON_ACTIVITY_TYPES = new Set<ActivityType>(["coupon_activity", "new_user_gift"]);
export type FullReductionRule = { threshold_amount: number; discount_amount: number };
export type FullDiscountRule = { threshold_amount: number; discount_percent: number };
export type MemberPriceRule = { discount_percent: number; min_order_amount?: number; member_level_ids?: string[] };

export function normalizeActivityTypeForForm(type: ActivityType): ActivityType {
  if (type === "points_bonus") return "points_reward";
  if (type === "member_activity") return "member_price";
  return type;
}

export function getDefaultScopeTypeForActivity(type: ActivityType): ActivityPayload["scope_type"] {
  if (ACTIVITY_PRICE_TYPES.has(type)) return "product";
  if (GENERAL_SCOPE_ACTIVITY_TYPES.has(type)) return "all";
  return "product";
}

export function getDefaultRuleConfigForActivity(type: ActivityType): Record<string, unknown> {
  if (type === "checkin_reward") {
    return {
      bonus_kind: "checkin",
      reward_points: 5,
      once_per_day: true,
      streak_bonus_points: 0,
      streak_bonus_every_days: 0,
    };
  }
  if (POINTS_REWARD_TYPES.has(type)) {
    return {
      bonus_kind: "normal",
      bonus_mode: "multiplier",
      multiplier_percent: 200,
      min_order_amount: 0,
      max_bonus_points: 0,
      stack_strategy: "max",
      apply_scope: "matched_items",
    };
  }
  if (type === "full_reduction") {
    return { full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }] };
  }
  if (type === "full_discount") {
    return { full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }] };
  }
  if (type === "member_price") {
    return { member_price_rules: [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }] };
  }
  if (type === "coupon") {
    return { coupon_ids: [] };
  }
  return {};
}

export function getCouponIdsFromActivityConfig(config: ActivityPayload["activity_config"]): string[] {
  const source = config && typeof config === "object" ? config as Record<string, unknown> : {};
  const raw = Array.isArray(source.coupon_ids) ? source.coupon_ids : Array.isArray(source.couponIds) ? source.couponIds : [];
  return [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
}

export function getStepLabel(stepIndex: number, type: ActivityType) {
  if (stepIndex === 2 && ACTIVITY_PRICE_TYPES.has(type)) return "活动商品配置";
  if (stepIndex === 3 && ACTIVITY_PRICE_TYPES.has(type)) return "范围说明";
  return ACTIVITY_FORM_STEPS[stepIndex] || "";
}

export function normalizePayloadForSubmit(form: ActivityPayload, status: ActivityStatus): ActivityPayload {
  const base = { ...form, status, rule_config: form.rule_config || form.activity_config || null };
  if (!ACTIVITY_PRICE_TYPES.has(form.type)) return base;
  const productIds = form.items.map((item) => item.product_id).filter(Boolean);
  return {
    ...base,
    status,
    scope_type: "product",
    scope_ids: Array.from(new Set(productIds)),
  };
}

export function createInitialActivityForm(type: ActivityType = "flash_sale"): ActivityPayload {
  const defaultRuleConfig = getDefaultRuleConfigForActivity(type);
  return {
    type,
    title: "",
    subtitle: "",
    description: "",
    start_at: "",
    end_at: "",
    status: "draft",
    disabled: false,
    threshold_amount: null,
    discount_amount: null,
    scope_type: getDefaultScopeTypeForActivity(type),
    scope_ids: [],
    allow_coupon_stack: true,
    allow_points_stack: true,
    allow_reward: false,
    publish_at: null,
    internal_note: "",
    display_positions: getDefaultDisplayPositionsForActivity(type),
    activity_config: defaultRuleConfig,
    rule_config: defaultRuleConfig,
    slug: null,
    priority: 0,
    stackable: true,
    exclusive_with: [],
    usage_limit_total: null,
    usage_limit_per_user: null,
    sort_order: 0,
    items: [],
  };
}

export function createActivityCopyDraft(source: MarketingActivity): ActivityPayload {
  return {
    type: source.type,
    title: `${source.title || ""} 副本`.trim(),
    subtitle: source.subtitle || "",
    description: source.description || "",
    start_at: "",
    end_at: "",
    status: "draft",
    disabled: false,
    threshold_amount: source.threshold_amount ?? null,
    discount_amount: source.discount_amount ?? null,
    scope_type: ACTIVITY_PRICE_TYPES.has(source.type)
      ? "product"
      : source.scope_type || getDefaultScopeTypeForActivity(source.type),
    scope_ids: ACTIVITY_PRICE_TYPES.has(source.type)
      ? (source.items || []).map((item) => item.product_id).filter(Boolean)
      : source.scope_ids || [],
    allow_coupon_stack: source.allow_coupon_stack ?? true,
    allow_points_stack: source.allow_points_stack ?? true,
    allow_reward: source.allow_reward ?? false,
    publish_at: null,
    internal_note: source.internal_note || "",
    display_positions: source.display_positions || getDefaultDisplayPositionsForActivity(source.type),
    activity_config: source.activity_config || {},
    rule_config: source.rule_config || source.activity_config || {},
    slug: null,
    priority: source.priority || 0,
    stackable: source.stackable ?? true,
    exclusive_with: source.exclusive_with || [],
    usage_limit_total: source.usage_limit_total ?? null,
    usage_limit_per_user: source.usage_limit_per_user ?? null,
    version: undefined,
    sort_order: source.sort_order || 0,
    items: (source.items || []).map(({ id: _id, sold_count: _soldCount, ...item }) => ({
      ...item,
    })),
  };
}

export function toggleDisplayPosition(current: string[] | undefined, key: DisplayPosition) {
  const set = new Set(current || []);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set];
}

export function uniqueIds(ids: string[] | undefined) {
  return Array.from(new Set((ids || []).map((id) => String(id).trim()).filter(Boolean)));
}

export function setScopeIds(current: string[] | undefined, id: string, checked: boolean) {
  const set = new Set(uniqueIds(current));
  if (checked) set.add(id);
  else set.delete(id);
  return Array.from(set);
}

export type ActivityFormValidationInput = {
  form: ActivityPayload;
  selectedScopeIds: string[];
  invalidDisplayPositions: string[];
  fullReductionRules: FullReductionRule[];
  fullDiscountRules?: FullDiscountRule[];
  memberPriceRules?: MemberPriceRule[];
};

export function validateActivityForm({
  form,
  selectedScopeIds,
  invalidDisplayPositions,
  fullReductionRules,
  fullDiscountRules = [],
  memberPriceRules = [],
}: ActivityFormValidationInput) {
  if (!form.title.trim()) return "活动名称必填";
  if (!form.start_at || !form.end_at) return "开始/结束时间必填";
  if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) return "结束时间必须晚于开始时间";
  if (ACTIVITY_PRICE_TYPES.has(form.type) && form.items.length === 0) return "请先选择活动商品";
  if (WIP_ACTIVITY_TYPES.includes(form.type)) return "该活动类型尚在开发中，仅可保存草稿";
  if (!ACTIVITY_PRICE_TYPES.has(form.type) && form.scope_type === "category" && selectedScopeIds.length === 0) return "请选择活动适用分类";
  if (!ACTIVITY_PRICE_TYPES.has(form.type) && form.scope_type === "product" && selectedScopeIds.length === 0) return "请选择活动适用商品";
  if (!normalizeDisplayPositionsForActivity(form.type, form.display_positions).length) return "请至少选择一个当前活动类型允许的展示位置";
  if (invalidDisplayPositions.length) return "当前活动类型存在不支持的展示位置，请重新选择";
  if (form.type === "coupon" && !getCouponIdsFromActivityConfig(form.activity_config).length) return "请选择至少一张优惠券模板";
  if (form.usage_limit_total != null && Number(form.usage_limit_total) < 0) return "总使用次数上限不能为负数";
  if (form.usage_limit_per_user != null && Number(form.usage_limit_per_user) < 0) return "每用户使用上限不能为负数";
  if (form.type === "checkin_reward") {
    const cfg = (form.activity_config || {}) as Record<string, unknown>;
    const points = Number(cfg.reward_points ?? cfg.points ?? 0);
    const streakBonusPoints = Number(cfg.streak_bonus_points ?? 0);
    const streakBonusEveryDays = Number(cfg.streak_bonus_every_days ?? 0);
    if (!Number.isFinite(points) || points < 1) return "签到奖励积分必须至少为 1";
    if (streakBonusPoints < 0) return "连续签到奖励积分不能为负数";
    if (streakBonusEveryDays < 0) return "连续签到天数不能为负数";
  } else if (POINTS_REWARD_TYPES.has(form.type)) {
    const cfg = (form.activity_config || {}) as Record<string, unknown>;
    const pct = Number(cfg.multiplier_percent ?? 0);
    if (!Number.isFinite(pct) || pct < 100) return "积分倍率必须至少为 100（200=2倍）";
  }
  if (form.type === "full_reduction") {
    if (!fullReductionRules.length) return "至少配置一档满减";
    for (const r of fullReductionRules) {
      if (Number(r.threshold_amount || 0) <= 0) return "满减门槛必须大于 0";
      if (Number(r.discount_amount || 0) <= 0) return "满减金额必须大于 0";
      if (Number(r.discount_amount || 0) > Number(r.threshold_amount || 0)) return "满减金额不能大于门槛";
    }
  }
  if (form.type === "full_discount") {
    if (!fullDiscountRules.length) return "至少配置一档满折";
    for (const r of fullDiscountRules) {
      const threshold = Number(r.threshold_amount || 0);
      const percent = Number(r.discount_percent || 0);
      if (threshold <= 0) return "满折门槛必须大于 0";
      if (percent <= 0 || percent >= 100) return "满折折扣必须大于 0 且小于 100（90=9折）";
    }
  }
  if (form.type === "member_price") {
    if (!memberPriceRules.length) return "至少配置一档会员价";
    for (const r of memberPriceRules) {
      const percent = Number(r.discount_percent || 0);
      const minOrderAmount = Number(r.min_order_amount || 0);
      if (percent <= 0 || percent >= 100) return "会员价折扣必须大于 0 且小于 100（95=9.5折）";
      if (minOrderAmount < 0) return "会员价最低订单金额不能为负数";
    }
  }
  return "";
}

export function useActivitySave({
  form,
  id,
  isEdit,
  queryClient,
  navigate,
  markClean,
  setSaving,
  tText,
  onError,
}: {
  form: ActivityPayload;
  id?: string;
  isEdit: boolean;
  queryClient: QueryClient;
  navigate: NavigateFunction;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  tText: (text: string) => string;
  onError?: (error: unknown) => void;
}) {
  return useCallback(
    async (targetStatus: ActivityStatus) => {
      const saveStartedAt = performance.now();
      let dirtyCleared = false;
      setSaving(true);
      try {
        const payload = normalizePayloadForSubmit(form, targetStatus);
        if (targetStatus !== "draft") await activityService.validateActivity(payload, id);
        if (isEdit && id) await activityService.updateActivity(id, payload);
        else await activityService.createActivity(payload);
        invalidateHomeBootstrapCache();
        markClean();
        dirtyCleared = true;
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.activitiesRoot() }),
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() }),
        ]);
        toast.success(targetStatus === "draft" ? tText("草稿已保存") : tText("活动已发布"));
        navigate("/admin/marketing/activities", { replace: true });
        return true;
      } catch (e) {
        onError?.(e);
        toast.error(toastErrorMessage(e, tText("保存失败")));
        return false;
      } finally {
        setSaving(false);
        adminSaveDebug({
          page: "AdminActivityForm",
          duration: performance.now() - saveStartedAt,
          success: dirtyCleared,
          dirtyCleared,
          savingReleased: true,
        });
      }
    },
    [form, id, isEdit, markClean, navigate, onError, queryClient, setSaving, tText],
  );
}
