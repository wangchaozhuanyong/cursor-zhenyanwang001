import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPayload, ActivityProductItem, ActivityStatus, ActivityType } from "@/types/activity";
import { toastErrorMessage } from "@/utils/errorMessage";
import ActivityProductPicker from "@/components/admin/ActivityProductPicker";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { Tx } from "@/components/admin/AdminText";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { DISPLAY_POSITIONS, DISPLAY_POSITION_LABELS, WIP_ACTIVITY_TYPES, type DisplayPosition } from "@/constants/marketingDisplayPositions";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { fetchCoupons } from "@/services/admin/couponService";
import type { Coupon } from "@/types/coupon";
import { adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";

const STEPS = ["选择类型", "基础信息", "活动规则", "适用范围", "展示设置", "预览发布"] as const;

function toggleDisplayPosition(current: string[] | undefined, key: DisplayPosition) {
  const set = new Set(current || []);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set];
}

export default function AdminActivityForm() {
  const { tText } = useAdminT();
  const { activityType: labelType } = useAdminDisplayLabel();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [search] = useSearchParams();
  const copyFromId = !isEdit ? search.get("copy_from") : null;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [pendingPublishStatus, setPendingPublishStatus] = useState<ActivityStatus | null>(null);
  const [statusLabel, setStatusLabel] = useState("草稿");

  const [form, setForm] = useState<ActivityPayload>({
    type: (search.get("type") as ActivityType) || "flash_sale",
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
    display_positions: [],
    activity_config: { full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }] },
    sort_order: 0,
    items: [],
  });

  const activityQuery = useQuery({
    queryKey: adminQueryKeys.activityDetail(id || ""),
    queryFn: () => activityService.fetchActivity(id!),
    enabled: isEdit && !!id,
    staleTime: 60_000,
  });

  const copySourceQuery = useQuery({
    queryKey: adminQueryKeys.activityDetail(copyFromId || ""),
    queryFn: () => activityService.fetchActivity(copyFromId!),
    enabled: !!copyFromId,
    staleTime: 60_000,
  });

  const couponsQuery = useQuery({
    queryKey: adminQueryKeys.activityFormCoupons(),
    queryFn: () => fetchCoupons({ page: 1, pageSize: 200 }).then((res) => res.list || []),
    enabled: form.type === "coupon_activity" || form.type === "new_user_gift",
    staleTime: 60_000,
  });

  const couponOptions = couponsQuery.data ?? [];
  const couponsLoading = couponsQuery.isLoading && !couponsQuery.data;

  const activityLoading = (isEdit && activityQuery.isLoading && !activityQuery.data)
    || (!!copyFromId && copySourceQuery.isLoading && !copySourceQuery.data);
  const [formHydrated, setFormHydrated] = useState(!isEdit && !copyFromId);
  const { markClean } = useAdminFormDirty(form, formHydrated && !activityLoading);

  useEffect(() => {
    if (!activityQuery.data) return;
    const d = activityQuery.data;
    setForm({
      type: d.type,
      title: d.title,
      subtitle: d.subtitle || "",
      description: d.description || "",
      start_at: d.start_at,
      end_at: d.end_at,
      status: (d.status || "draft") as ActivityStatus,
      disabled: d.disabled,
      threshold_amount: d.threshold_amount ?? null,
      discount_amount: d.discount_amount ?? null,
      scope_type: d.scope_type || "product",
      scope_ids: d.scope_ids || [],
      allow_coupon_stack: d.allow_coupon_stack ?? true,
      allow_points_stack: d.allow_points_stack ?? true,
      allow_reward: d.allow_reward ?? false,
      publish_at: d.publish_at || null,
      internal_note: d.internal_note || "",
      display_positions: d.display_positions || [],
      activity_config: d.activity_config || {},
      sort_order: d.sort_order || 0,
      items: (d.items || []).map(({ id: _id, sold_count: _soldCount, ...item }) => ({
        ...item,
        sold_count: 0,
      })),
    });
    setStatusLabel(d.status_label || "草稿");
    setFormHydrated(true);
  }, [activityQuery.data]);

  useEffect(() => {
    if (!copySourceQuery.data) return;
    const d = copySourceQuery.data;
    setForm({
      type: d.type,
      title: `${d.title || ""} 副本`.trim(),
      subtitle: d.subtitle || "",
      description: d.description || "",
      start_at: "",
      end_at: "",
      status: "draft",
      disabled: false,
      threshold_amount: d.threshold_amount ?? null,
      discount_amount: d.discount_amount ?? null,
      scope_type: d.scope_type || "product",
      scope_ids: d.scope_ids || [],
      allow_coupon_stack: d.allow_coupon_stack ?? true,
      allow_points_stack: d.allow_points_stack ?? true,
      allow_reward: d.allow_reward ?? false,
      publish_at: null,
      internal_note: d.internal_note || "",
      display_positions: d.display_positions || [],
      activity_config: d.activity_config || {},
      sort_order: d.sort_order || 0,
      items: d.items || [],
    });
    setStatusLabel("草稿");
    toast.success(tText("已载入复制活动内容，请重新设置活动时间后发布"));
    setFormHydrated(true);
  }, [copySourceQuery.data, tText]);

  const selectedCouponIds = useMemo(
    () => (Array.isArray((form.activity_config as { coupon_ids?: string[] })?.coupon_ids)
      ? (form.activity_config as { coupon_ids: string[] }).coupon_ids
      : []),
    [form.activity_config],
  );

  const toggleCouponId = (couponId: string) => {
    setForm((prev) => {
      const cfg = { ...(prev.activity_config || {}) } as { coupon_ids?: string[] };
      const set = new Set(cfg.coupon_ids || []);
      if (set.has(couponId)) set.delete(couponId);
      else set.add(couponId);
      return { ...prev, activity_config: { ...cfg, coupon_ids: [...set] } };
    });
  };

  const fullReductionRules = useMemo(
    () => (Array.isArray((form.activity_config as unknown as Record<string, unknown>)?.full_reduction_rules)
      ? (form.activity_config as unknown as Record<string, unknown>).full_reduction_rules as Array<{ threshold_amount: number; discount_amount: number }>
      : [{ threshold_amount: Number(form.threshold_amount || 0), discount_amount: Number(form.discount_amount || 0) }]),
    [form.activity_config, form.threshold_amount, form.discount_amount],
  );

  const setFullReductionRules = (rules: Array<{ threshold_amount: number; discount_amount: number }>) => {
    setForm((prev) => ({
      ...prev,
      threshold_amount: rules[0]?.threshold_amount ?? null,
      discount_amount: rules[0]?.discount_amount ?? null,
      activity_config: { ...(prev.activity_config || {}), full_reduction_rules: rules },
    }));
  };

  const localValidate = useCallback(() => {
    if (!form.title.trim()) return "活动名称必填";
    if (!form.start_at || !form.end_at) return "开始/结束时间必填";
    if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) return "结束时间必须晚于开始时间";
    if (form.type === "flash_sale" && form.items.length === 0) return "秒杀活动必须选择商品";
    if ((form.type === "coupon_activity" || form.type === "new_user_gift") && !selectedCouponIds.length) return "请至少选择一张优惠券";
    if (!(form.display_positions || []).length) return "请至少选择一个展示位置";
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
  }, [form, fullReductionRules, selectedCouponIds]);

  const performSave = async (targetStatus: ActivityStatus) => {
    setSaving(true);
    try {
      const payload = { ...form, status: targetStatus };
      if (targetStatus !== "draft") await activityService.validateActivity(payload, id);
      if (isEdit && id) await activityService.updateActivity(id, payload);
      else await activityService.createActivity(payload);
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
  };

  const validateAndSave = async (targetStatus: ActivityStatus) => {
    const err = localValidate();
    if (targetStatus !== "draft" && err) {
      toast.error(tText(err));
      return;
    }
    if (targetStatus !== "draft") {
      setPendingPublishStatus(targetStatus);
      setPublishConfirmOpen(true);
      return;
    }
    await performSave(targetStatus);
  };

  const previewHint = useMemo(
    () => (localValidate() ? tText("请先完成活动规则") : tText("配置完整，可发布")),
    [localValidate, tText],
  );

  const updateItem = (idx: number, patch: Partial<ActivityProductItem>) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });
  };

  return (
    <AdminPageShell
      hint={<Tx>状态：{tText(statusLabel)}</Tx>}
      toolbar={(
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted-foreground"><Tx>返回</Tx></button>
      )}
      filters={(
      <div className="-mx-1 overflow-x-auto pb-1 lg:hidden">
        <div className="flex w-max gap-2 px-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={`touch-manipulation shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${
                i === step ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}. {tText(s)}
            </button>
          ))}
        </div>
      </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
        <div className="hidden rounded-xl border border-border bg-card p-3 lg:block">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={`mb-2 block w-full rounded-lg px-3 py-2 text-left text-sm ${i === step ? "bg-gold/15 text-theme-price" : "text-muted-foreground hover:bg-secondary"}`}>
              {i + 1}. {tText(s)}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {step === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { k: "flash_sale" as const, t: "限时秒杀", d: "短时低价促销" },
                { k: "full_reduction" as const, t: "满减活动", d: "按门槛减免" },
                { k: "coupon_activity" as const, t: "优惠券活动", d: "在首页领券中心展示" },
                { k: "new_user_gift" as const, t: "新人礼包", d: "注册后自动发券" },
                { k: "points_bonus" as const, t: "积分多倍活动", d: "下单可获得额外积分倍率" },
              ].map((x) => (
                <button
                  key={x.k}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      type: x.k,
                      display_positions: (p.display_positions || []).length > 0
                        ? p.display_positions
                        : x.k === "coupon_activity"
                          ? ["home_coupon_center"]
                          : x.k === "new_user_gift"
                            ? ["home_new_user_gift"]
                            : x.k === "points_bonus"
                              ? ["checkout_notice", "profile_center"]
                              : p.display_positions,
                      activity_config: x.k === "points_bonus"
                        ? {
                          bonus_kind: "normal",
                          bonus_mode: "multiplier",
                          multiplier_percent: 200,
                          min_order_amount: 0,
                          max_bonus_points: 0,
                          stack_strategy: "max",
                          apply_scope: "matched_items",
                        }
                        : p.activity_config,
                    }))
                  }
                  className={`rounded-xl border p-3 text-left ${form.type === x.k ? "border-gold bg-gold/5" : "border-border"}`}
                >
                  <p className="font-semibold">{tText(x.t)}</p>
                  <p className="text-xs text-muted-foreground">{tText(x.d)}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <label className="block text-sm">活动名称（{form.title.length}/60）<input maxLength={60} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <label className="block text-sm"><Tx>副标题</Tx><input value={form.subtitle || ""} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <label className="block text-sm"><Tx>活动说明</Tx><textarea rows={3} value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm"><Tx>开始时间</Tx><SegmentedDateTimeInput value={form.start_at ? form.start_at.slice(0, 16) : ""} onChange={(start_at) => setForm((p) => ({ ...p, start_at }))} className="mt-1 w-full" /></label>
                <label className="text-sm"><Tx>结束时间</Tx><SegmentedDateTimeInput value={form.end_at ? form.end_at.slice(0, 16) : ""} onChange={(end_at) => setForm((p) => ({ ...p, end_at }))} className="mt-1 w-full" /></label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {form.type === "flash_sale" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground"><Tx>活动商品配置</Tx></p>
                    <button type="button" onClick={() => setPickerOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm"><Tx>选择商品</Tx></button>
                  </div>
                  <AdminNativeTable tableClassName="min-w-[720px] text-sm">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className={adminThClassName()}><Tx>商品</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>原价</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>活动价</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>真实库存</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>活动库存</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>限购</Tx></th>
                          <th className={adminThClassName("text-center")}><Tx>操作</Tx></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it, idx) => (
                          <tr key={`${it.product_id}-${idx}`} className="border-t border-border">
                            <td className={adminTdClassName()}>{it.product_name || it.product_id}</td>
                            <td className={adminTdClassName("text-center")}>{it.product_price ?? "-"}</td>
                            <td className={adminTdClassName()}><input type="number" value={it.activity_price} onChange={(e) => updateItem(idx, { activity_price: Number(e.target.value) })} className="w-24 rounded bg-secondary px-2 py-1" /></td>
                            <td className={adminTdClassName("text-center")}>{it.product_stock ?? "-"}</td>
                            <td className={adminTdClassName()}><input type="number" value={it.activity_stock} onChange={(e) => updateItem(idx, { activity_stock: Number(e.target.value) })} className="w-24 rounded bg-secondary px-2 py-1" /></td>
                            <td className={adminTdClassName()}><input type="number" value={it.limit_per_user} onChange={(e) => updateItem(idx, { limit_per_user: Number(e.target.value) })} className="w-20 rounded bg-secondary px-2 py-1" /></td>
                            <td className={adminTdClassName("text-center")}><button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-xs text-muted-foreground"><Tx>删除</Tx></button></td>
                          </tr>
                        ))}
                      </tbody>
                  </AdminNativeTable>
                </>
              )}

              {(form.type === "coupon_activity" || form.type === "new_user_gift") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium"><Tx>关联优惠券</Tx><span className="ml-2 text-xs text-muted-foreground">已选 {selectedCouponIds.length} 张</span></p>
                  {couponsLoading ? (
                    <p className="text-sm text-muted-foreground"><Tx>加载优惠券列表...</Tx></p>
                  ) : couponOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground"><Tx>暂无可用优惠券，请先在优惠券管理中创建</Tx></p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                      {couponOptions.map((c) => {
                        const checked = selectedCouponIds.includes(c.id);
                        return (
                          <label key={c.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-gold bg-gold/5" : "border-border"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleCouponId(c.id)} className="mt-1" />
                            <span>
                              <span className="font-medium">{c.title}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{c.code}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{c.type === "percentage" ? `${c.value}%` : `RM ${c.value}`}{c.min_amount > 0 ? ` · 满 RM ${c.min_amount}` : ""}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {form.type === "points_bonus" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm"><Tx>活动种类</Tx>
                    <select
                      className="mt-1 w-full rounded-lg bg-secondary px-3 py-2"
                      value={String((form.activity_config as Record<string, unknown>)?.bonus_kind || "normal")}
                      onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), bonus_kind: e.target.value } }))}
                    >
                      <option value="normal"><Tx>普通积分活动</Tx></option>
                      <option value="holiday"><Tx>节日多倍</Tx></option>
                      <option value="birthday"><Tx>生日多倍</Tx></option>
                    </select>
                  </label>
                  <label className="text-sm"><Tx>积分倍率 %</Tx>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg bg-secondary px-3 py-2"
                      value={String((form.activity_config as Record<string, unknown>)?.multiplier_percent ?? 200)}
                      onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), multiplier_percent: Number(e.target.value) } }))}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground"><Tx>200=2倍，300=3倍</Tx></span>
                  </label>
                  <label className="text-sm"><Tx>最低订单金额 (RM)</Tx>
                    <input type="number" className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.min_order_amount ?? 0)} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), min_order_amount: Number(e.target.value) } }))} />
                  </label>
                  <label className="text-sm"><Tx>额外积分上限</Tx>
                    <input type="number" className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.max_bonus_points ?? 0)} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), max_bonus_points: Number(e.target.value) } }))} />
                    <span className="mt-1 block text-xs text-muted-foreground"><Tx>0 表示不限制</Tx></span>
                  </label>
                  <label className="text-sm"><Tx>叠加策略</Tx>
                    <select className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.stack_strategy || "max")} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), stack_strategy: e.target.value } }))}>
                      <option value="max"><Tx>多个活动取最高倍率</Tx></option>
                    </select>
                  </label>
                  <label className="text-sm"><Tx>生效范围</Tx>
                    <select className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.apply_scope || "matched_items")} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), apply_scope: e.target.value } }))}>
                      <option value="matched_items"><Tx>仅命中范围的商品行</Tx></option>
                      <option value="all"><Tx>整单生效</Tx></option>
                    </select>
                  </label>
                  {String((form.activity_config as Record<string, unknown>)?.bonus_kind || "") === "holiday" ? (
                    <label className="text-sm md:col-span-2"><Tx>节日名称</Tx>
                      <input className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.holiday_name || "")} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), holiday_name: e.target.value } }))} />
                    </label>
                  ) : null}
                  {String((form.activity_config as Record<string, unknown>)?.bonus_kind || "") === "birthday" ? (
                    <>
                      <label className="text-sm"><Tx>生日前窗口（天）</Tx>
                        <input type="number" className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.birthday_window_before_days ?? 0)} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), birthday_window_before_days: Number(e.target.value) } }))} />
                      </label>
                      <label className="text-sm"><Tx>生日后窗口（天）</Tx>
                        <input type="number" className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" value={String((form.activity_config as Record<string, unknown>)?.birthday_window_after_days ?? 7)} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), birthday_window_after_days: Number(e.target.value) } }))} />
                      </label>
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input type="checkbox" checked={(form.activity_config as Record<string, unknown>)?.once_per_year !== false} onChange={(e) => setForm((p) => ({ ...p, activity_config: { ...(p.activity_config || {}), once_per_year: e.target.checked } }))} />
                        <Tx>每年仅享受一次（按 KL 自然年）</Tx>
                      </label>
                    </>
                  ) : null}
                </div>
              )}

              {form.type === "full_reduction" && (
                <div className="space-y-2">
                  {fullReductionRules.map((r, idx) => (
                    <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <label className="text-sm"><Tx>满减门槛</Tx><input type="number" value={r.threshold_amount ?? ""} onChange={(e) => setFullReductionRules(fullReductionRules.map((x, i) => i === idx ? { ...x, threshold_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                      <label className="text-sm"><Tx>减免金额</Tx><input type="number" value={r.discount_amount ?? ""} onChange={(e) => setFullReductionRules(fullReductionRules.map((x, i) => i === idx ? { ...x, discount_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                      <button type="button" onClick={() => setFullReductionRules(fullReductionRules.filter((_, i) => i !== idx))} className="mt-7 rounded border border-border px-2 py-1 text-xs"><Tx>删除</Tx></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFullReductionRules([...fullReductionRules, { threshold_amount: 0, discount_amount: 0 }])} className="rounded border border-border px-3 py-1 text-sm"><Tx>新增一档</Tx></button>
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_coupon_stack} onChange={(e) => setForm((p) => ({ ...p, allow_coupon_stack: e.target.checked }))} /><Tx>允许叠加优惠券</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_points_stack} onChange={(e) => setForm((p) => ({ ...p, allow_points_stack: e.target.checked }))} /><Tx>允许使用积分</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_reward} onChange={(e) => setForm((p) => ({ ...p, allow_reward: e.target.checked }))} /><Tx>参与返现</Tx></label>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm"><Tx>适用范围</Tx><select value={form.scope_type || "product"} onChange={(e) => setForm((p) => ({ ...p, scope_type: e.target.value as ActivityPayload["scope_type"] }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2">
                <option value="all"><Tx>全场</Tx></option>
                <option value="category"><Tx>指定分类</Tx></option>
                <option value="product"><Tx>指定商品</Tx></option>
                <option value="new_user"><Tx>新用户</Tx></option>
                <option value="old_user"><Tx>老用户</Tx></option>
              </select></label>
              <label className="text-sm"><Tx>范围 ID 列表（逗号分隔）</Tx><input value={(form.scope_ids || []).join(",")} onChange={(e) => setForm((p) => ({ ...p, scope_ids: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-medium"><Tx>展示位置</Tx></p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DISPLAY_POSITIONS.map((key) => {
                    const checked = (form.display_positions || []).includes(key);
                    return (
                      <label key={key} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${checked ? "border-gold bg-gold/10" : "border-border"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setForm((p) => ({ ...p, display_positions: toggleDisplayPosition(p.display_positions, key) }))} />
                        {tText(DISPLAY_POSITION_LABELS[key])}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="text-sm"><Tx>内部备注</Tx><input value={form.internal_note || ""} onChange={(e) => setForm((p) => ({ ...p, internal_note: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
            </div>
          )}

          {step === 5 && <p className="text-sm text-muted-foreground">发布前校验：{previewHint}</p>}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold"><Tx>活动摘要</Tx></h3>
          <p className="text-sm">{tText("类型")}：{labelType(form.type)}</p>
          <p className="text-sm">{tText("名称")}：{form.title || "-"}</p>
          <p className="text-sm">{tText("时间")}：{form.start_at || "-"} ~ {form.end_at || "-"}</p>
          <p className="text-sm">{tText("商品数")}：{form.items.length}</p>
          <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">{tText("前台预览")}：{previewHint}</div>
        </div>
      </div>

      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap justify-end gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur-md lg:bottom-0">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>上一步</Tx></button>
        <LoadingButton type="button" variant="outline" state={saving ? "loading" : "normal"} loadingText="保存中..." onClick={() => void validateAndSave("draft")} className="rounded-lg px-3 py-2 text-sm"><Tx>保存草稿</Tx></LoadingButton>
        <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>下一步</Tx></button>
        <LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} loadingText="发布中..." onClick={() => void validateAndSave("active")} className="rounded-lg px-3 py-2 text-sm font-semibold"><Tx>发布活动</Tx></LoadingButton>
        <button onClick={() => navigate("/admin/marketing/activities")} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>取消</Tx></button>
      </div>

      <AnimatedConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title={tText("确认发布活动")}
        description={pendingPublishStatus ? (
          <span className="block whitespace-pre-line text-sm">
            {`活动名称：${form.title}\n类型：${labelType(form.type)}\n时间：${form.start_at} ~ ${form.end_at}\n商品数：${form.items.length}\n发布后不可回退为草稿。`}
          </span>
        ) : null}
        confirmText="发布"
        onConfirm={async () => {
          if (pendingPublishStatus) await performSave(pendingPublishStatus);
          setPublishConfirmOpen(false);
          setPendingPublishStatus(null);
        }}
      />

      <ActivityProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={form.items.map((x) => x.product_id)}
        onConfirm={(rows) => setForm((p) => ({ ...p, items: [...p.items, ...rows] }))}
      />
    </AdminPageShell>
  );
}
