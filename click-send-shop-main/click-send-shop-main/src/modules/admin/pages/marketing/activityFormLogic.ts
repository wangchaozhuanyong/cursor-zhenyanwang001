import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPayload, ActivityStatus, ActivityType } from "@/types/activity";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  WIP_ACTIVITY_TYPES,
  getDefaultDisplayPositionsForActivity,
  normalizeDisplayPositionsForActivity,
  type DisplayPosition,
} from "@/constants/marketingDisplayPositions";
import { invalidateHomeBootstrapCache } from "@/services/homeService";

export const ACTIVITY_FORM_STEPS = ["选择类型", "基础信息", "活动规则", "适用范围", "展示设置", "预览发布"] as const;
export const OBJECT_SCOPE_TYPES = new Set<ActivityPayload["scope_type"]>(["category", "product"]);

export function getStepLabel(stepIndex: number, type: ActivityType) {
  if (stepIndex === 2 && type === "flash_sale") return "秒杀商品配置";
  if (stepIndex === 3 && type === "flash_sale") return "范围说明";
  return ACTIVITY_FORM_STEPS[stepIndex] || "";
}

export function normalizePayloadForSubmit(form: ActivityPayload, status: ActivityStatus): ActivityPayload {
  if (form.type !== "flash_sale") return { ...form, status };
  const productIds = form.items.map((item) => item.product_id).filter(Boolean);
  return {
    ...form,
    status,
    scope_type: "product",
    scope_ids: Array.from(new Set(productIds)),
  };
}

export function createInitialActivityForm(type: ActivityType = "flash_sale"): ActivityPayload {
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
    scope_type: "product",
    scope_ids: [],
    allow_coupon_stack: true,
    allow_points_stack: true,
    allow_reward: false,
    publish_at: null,
    internal_note: "",
    display_positions: getDefaultDisplayPositionsForActivity(type),
    activity_config: { full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }] },
    sort_order: 0,
    items: [],
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
  fullReductionRules: Array<{ threshold_amount: number; discount_amount: number }>;
};

export function validateActivityForm({
  form,
  selectedScopeIds,
  invalidDisplayPositions,
  fullReductionRules,
}: ActivityFormValidationInput) {
  if (!form.title.trim()) return "活动名称必填";
  if (!form.start_at || !form.end_at) return "开始/结束时间必填";
  if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) return "结束时间必须晚于开始时间";
  if (form.type === "flash_sale" && form.items.length === 0) return "请先选择秒杀商品";
  if (form.type !== "flash_sale" && form.scope_type === "category" && selectedScopeIds.length === 0) return "请选择活动适用分类";
  if (form.type !== "flash_sale" && form.scope_type === "product" && selectedScopeIds.length === 0) return "请选择活动适用商品";
  if (!normalizeDisplayPositionsForActivity(form.type, form.display_positions).length) return "请至少选择一个当前活动类型允许的展示位置";
  if (invalidDisplayPositions.length) return "当前活动类型存在不支持的展示位置，请重新选择";
  if (WIP_ACTIVITY_TYPES.includes(form.type)) return "该活动类型尚在开发中，仅可保存草稿";
  if (form.type === "points_bonus") {
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
}: {
  form: ActivityPayload;
  id?: string;
  isEdit: boolean;
  queryClient: QueryClient;
  navigate: NavigateFunction;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  tText: (text: string) => string;
}) {
  return useCallback(
    async (targetStatus: ActivityStatus) => {
      setSaving(true);
      try {
        const payload = normalizePayloadForSubmit(form, targetStatus);
        if (targetStatus !== "draft") await activityService.validateActivity(payload, id);
        if (isEdit && id) await activityService.updateActivity(id, payload);
        else await activityService.createActivity(payload);
        invalidateHomeBootstrapCache();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.activitiesRoot() }),
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() }),
        ]);
        toast.success(targetStatus === "draft" ? tText("草稿已保存") : tText("活动已发布"));
        markClean();
        navigate("/admin/marketing/activities");
      } catch (e) {
        toast.error(toastErrorMessage(e, tText("保存失败")));
      } finally {
        setSaving(false);
      }
    },
    [form, id, isEdit, markClean, navigate, queryClient, setSaving, tText],
  );
}
