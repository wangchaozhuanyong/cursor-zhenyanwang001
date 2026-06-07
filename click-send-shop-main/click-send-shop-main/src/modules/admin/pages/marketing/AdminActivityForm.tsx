import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPayload, ActivityProductItem, ActivityStatus, ActivityType } from "@/types/activity";
import ActivityProductPicker from "@/components/admin/ActivityProductPicker";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { Tx } from "@/components/admin/AdminText";
import SegmentedDateTimeInput from "@/components/admin/SegmentedDateTimeInput";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import {
  DISPLAY_POSITION_LABELS,
  getAllowedDisplayPositionsForActivity,
  getDefaultDisplayPositionsForActivity,
  type DisplayPosition,
} from "@/constants/marketingDisplayPositions";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { fetchProducts } from "@/services/admin/productService";
import { fetchCategories } from "@/services/admin/categoryService";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import { flattenCategories } from "@/utils/categoryTree";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import {
  ACTIVITY_FORM_STEPS,
  OBJECT_SCOPE_TYPES,
  createInitialActivityForm,
  getStepLabel,
  setScopeIds,
  toggleDisplayPosition,
  uniqueIds,
  useActivitySave,
  validateActivityForm,
} from "./activityFormLogic";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function productLabel(product: Product | undefined, id: string) {
  return product?.name || `商品 ${id}`;
}

function categoryLabel(category: Category | undefined, id: string) {
  return category?.name || `分类 ${id}`;
}

const LEGACY_COUPON_ACTIVITY_TYPES = new Set<ActivityType>(["coupon_activity", "new_user_gift"]);
const EMPTY_PRODUCTS: Product[] = [];

export default function AdminActivityForm() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const { activityType: labelType } = useAdminDisplayLabel();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const goBack = useAdminGoBack("/admin/marketing/activities");
  const { id } = useParams();
  const isEdit = !!id;
  const [search] = useSearchParams();
  const copyFromId = !isEdit ? search.get("copy_from") : null;
  const requestedCreateType = (search.get("type") as ActivityType) || "flash_sale";
  const createType = LEGACY_COUPON_ACTIVITY_TYPES.has(requestedCreateType) ? "flash_sale" : requestedCreateType;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [pendingPublishStatus, setPendingPublishStatus] = useState<ActivityStatus | null>(null);
  const [statusLabel, setStatusLabel] = useState("草稿");
  const [scopeKeyword, setScopeKeyword] = useState("");

  const [form, setForm] = useState<ActivityPayload>(() => createInitialActivityForm(createType));

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

  const selectedScopeIds = useMemo(() => uniqueIds(form.scope_ids), [form.scope_ids]);
  const productScopeEnabled = form.scope_type === "product";
  const categoryScopeEnabled = form.scope_type === "category";

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories(),
    queryFn: fetchCategories,
    enabled: categoryScopeEnabled,
    staleTime: 300_000,
  });

  const productSearchQuery = useQuery({
    queryKey: ["admin", "activityScopeProducts", scopeKeyword],
    queryFn: () => fetchProducts({ page: 1, pageSize: 30, keyword: scopeKeyword, status: "active" }),
    enabled: productScopeEnabled,
    staleTime: 60_000,
  });

  const selectedProductsQuery = useQuery({
    queryKey: ["admin", "activityScopeSelectedProducts", selectedScopeIds],
    queryFn: () => fetchProducts({ page: 1, pageSize: Math.max(selectedScopeIds.length, 1), ids: selectedScopeIds }),
    enabled: productScopeEnabled && selectedScopeIds.length > 0,
    staleTime: 60_000,
  });

  const flatCategories = useMemo(
    () => flattenCategories(categoriesQuery.data || []),
    [categoriesQuery.data],
  );
  const categoryById = useMemo(
    () => new Map(flatCategories.map((category) => [category.id, category])),
    [flatCategories],
  );
  const categoryOptions = useMemo(() => {
    const keyword = scopeKeyword.trim().toLowerCase();
    if (!keyword) return flatCategories;
    return flatCategories.filter((category) => category.name.toLowerCase().includes(keyword));
  }, [flatCategories, scopeKeyword]);
  const productOptions = productSearchQuery.data?.list || EMPTY_PRODUCTS;
  const allowedDisplayPositions = useMemo(
    () => getAllowedDisplayPositionsForActivity(form.type),
    [form.type],
  );
  const invalidDisplayPositions = useMemo(() => {
    const allowed = new Set(allowedDisplayPositions);
    return (form.display_positions || []).filter((position) => !allowed.has(position as DisplayPosition));
  }, [allowedDisplayPositions, form.display_positions]);
  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of selectedProductsQuery.data?.list || []) map.set(product.id, product);
    for (const product of productOptions) map.set(product.id, product);
    return map;
  }, [productOptions, selectedProductsQuery.data?.list]);

  const activityLoading = (isEdit && activityQuery.isLoading && !activityQuery.data)
    || (!!copyFromId && copySourceQuery.isLoading && !copySourceQuery.data);
  const [formHydrated, setFormHydrated] = useState(!isEdit && !copyFromId);
  const { markClean } = useAdminFormDirty(form, formHydrated && !activityLoading);

  useEffect(() => {
    if (isEdit || copyFromId || !LEGACY_COUPON_ACTIVITY_TYPES.has(requestedCreateType)) return;
    navigate("/admin/marketing/coupons/new", { replace: true });
  }, [copyFromId, isEdit, navigate, requestedCreateType]);

  const tabTitle = useMemo(() => {
    if (isEdit && form.title.trim()) return tText(`编辑活动：${form.title.trim()}`);
    if (copyFromId && form.title.trim()) return tText(`复制活动：${form.title.trim()}`);
    return null;
  }, [copyFromId, form.title, isEdit, tText]);
  useAdminTabTitle(tabTitle, formHydrated && !activityLoading && Boolean(tabTitle));

  useEffect(() => {
    if (isEdit || copyFromId) return;
    const nextForm = createInitialActivityForm(createType);
    setForm(nextForm);
    setStep(0);
    setStatusLabel("草稿");
    setScopeKeyword("");
    setFormHydrated(true);
    markClean(nextForm);
  }, [copyFromId, createType, isEdit, markClean]);

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
      scope_type: d.type === "flash_sale" ? "product" : d.scope_type || "product",
      scope_ids: d.type === "flash_sale" ? (d.items || []).map((item) => item.product_id).filter(Boolean) : d.scope_ids || [],
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
      scope_type: d.type === "flash_sale" ? "product" : d.scope_type || "product",
      scope_ids: d.type === "flash_sale" ? (d.items || []).map((item) => item.product_id).filter(Boolean) : d.scope_ids || [],
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

  const localValidate = useCallback(
    () => validateActivityForm({
      form,
      selectedScopeIds,
      invalidDisplayPositions,
      fullReductionRules,
    }),
    [form, fullReductionRules, invalidDisplayPositions, selectedScopeIds],
  );

  const performSave = useActivitySave({
    form,
    id,
    isEdit,
    queryClient,
    navigate,
    markClean,
    setSaving,
    tText,
  });

  const validateAndSave = async (targetStatus: ActivityStatus) => {
    if (targetStatus !== "draft" && form.type === "flash_sale" && form.items.length === 0) {
      setStep(2);
      toast.error(tText("请先选择秒杀商品"));
      return;
    }
    const err = localValidate();
    if (targetStatus !== "draft" && err) {
      toast.error(tText(err));
      if (form.type === "flash_sale" && err.includes("秒杀商品")) setStep(2);
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

  const applyScopeTypeChange = (nextScopeType: ActivityPayload["scope_type"]) => {
    setScopeKeyword("");
    setForm((prev) => ({
      ...prev,
      scope_type: nextScopeType,
      scope_ids: OBJECT_SCOPE_TYPES.has(nextScopeType) ? [] : [],
    }));
  };

  const handleScopeTypeChange = (nextScopeType: ActivityPayload["scope_type"]) => {
    const currentScopeType = form.scope_type || "product";
    if (nextScopeType === currentScopeType) return;
    const shouldClearIds =
      selectedScopeIds.length > 0
      && (OBJECT_SCOPE_TYPES.has(currentScopeType) || OBJECT_SCOPE_TYPES.has(nextScopeType));
    if (shouldClearIds) {
      confirm({
        title: tText("确认切换适用对象"),
        description: tText("切换后，已选择的商品或分类会被清空。请确认是否继续。"),
        confirmText: tText("继续切换"),
        danger: true,
        onConfirm: () => applyScopeTypeChange(nextScopeType),
      });
      return;
    }
    applyScopeTypeChange(nextScopeType);
  };

  const toggleScopeId = (id: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      scope_ids: setScopeIds(prev.scope_ids, id, checked),
    }));
  };

  const clearScopeIds = () => {
    setForm((prev) => ({ ...prev, scope_ids: [] }));
  };

  const scopeSummary = (() => {
    if (form.scope_type === "all") return tText("活动对全场商品生效");
    if (form.scope_type === "new_user") return tText("活动仅新用户可参与");
    if (form.scope_type === "old_user") return tText("活动仅老用户可参与");
    if (form.scope_type === "category") {
      const names = selectedScopeIds.slice(0, 3).map((id) => categoryLabel(categoryById.get(id), id));
      return selectedScopeIds.length
        ? `${tText("已选")} ${selectedScopeIds.length} ${tText("个分类")}：${names.join("、")}${selectedScopeIds.length > 3 ? "..." : ""}`
        : tText("请选择活动适用的分类");
    }
    if (form.scope_type === "product") {
      const names = selectedScopeIds.slice(0, 3).map((id) => productLabel(productById.get(id), id));
      return selectedScopeIds.length
        ? `${tText("已选")} ${selectedScopeIds.length} ${tText("个商品")}：${names.join("、")}${selectedScopeIds.length > 3 ? "..." : ""}`
        : tText("请选择活动适用的商品");
    }
    return tText("请选择活动适用对象");
  })();

  return (
    <AdminPageShell
      hint={<Tx>状态：{tText(statusLabel)}</Tx>}
      toolbar={(
        <UnifiedButton type="button" onClick={goBack} className="text-sm text-muted-foreground"><Tx>返回</Tx></UnifiedButton>
      )}
      filters={(
      <div className="-mx-1 overflow-x-auto pb-1 lg:hidden">
        <div className="flex w-max gap-2 px-1">
          {ACTIVITY_FORM_STEPS.map((s, i) => (
            <UnifiedButton
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={`touch-manipulation shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${
                i === step ? "bg-[color-mix(in_srgb,var(--theme-price)_15%,var(--theme-surface))] text-theme-price" : "bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}. {tText(getStepLabel(i, form.type))}
            </UnifiedButton>
          ))}
        </div>
      </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
        <div className="hidden rounded-xl border border-border bg-card p-3 lg:block">
          {ACTIVITY_FORM_STEPS.map((s, i) => (
            <UnifiedButton key={s} onClick={() => setStep(i)} className={`mb-2 block w-full rounded-lg px-3 py-2 text-left text-sm ${i === step ? "bg-[color-mix(in_srgb,var(--theme-price)_15%,var(--theme-surface))] text-theme-price" : "text-muted-foreground hover:bg-secondary"}`}>
              {i + 1}. {tText(getStepLabel(i, form.type))}
            </UnifiedButton>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {step === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { k: "flash_sale" as const, t: "限时秒杀", d: "短时低价促销" },
                { k: "full_reduction" as const, t: "满减活动", d: "按门槛减免" },
                { k: "points_bonus" as const, t: "积分多倍活动", d: "下单可获得额外积分倍率" },
              ].map((x) => (
                <UnifiedButton
                  key={x.k}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      type: x.k,
                      display_positions: getDefaultDisplayPositionsForActivity(x.k),
                      scope_type: x.k === "flash_sale" ? "product" : p.scope_type,
                      scope_ids: x.k === "flash_sale" ? p.items.map((item) => item.product_id).filter(Boolean) : p.scope_ids,
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
                  className={`rounded-xl border p-3 text-left ${form.type === x.k ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_5%,var(--theme-surface))]" : "border-border"}`}
                >
                  <p className="font-semibold">{tText(x.t)}</p>
                  <p className="text-xs text-muted-foreground">{tText(x.d)}</p>
                </UnifiedButton>
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
                    <UnifiedButton type="button" onClick={() => setPickerOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm"><Tx>选择商品</Tx></UnifiedButton>
                  </div>
                  <AdminNativeTable tableClassName="min-w-[720px] text-sm">
                      <thead className="bg-secondary/60">
                        <tr>
                          <th className={adminThClassName(undefined, "left")}><Tx>商品</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>原价</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>活动价</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>真实库存</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>活动库存</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>限购</Tx></th>
                          <th className={adminThClassName(undefined, "right")}><Tx>操作</Tx></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it, idx) => (
                          <tr key={`${it.product_id}-${idx}`} className="border-t border-border">
                            <td className={adminTdClassName(undefined, "left")}>{it.product_name || it.product_id}</td>
                            <td className={adminTdClassName(undefined, "right")}>{it.product_price ?? "-"}</td>
                            <td className={adminTdClassName(undefined, "right")}><input type="number" value={it.activity_price} onChange={(e) => updateItem(idx, { activity_price: Number(e.target.value) })} className="ml-auto block w-24 rounded bg-secondary px-2 py-1 text-right" /></td>
                            <td className={adminTdClassName(undefined, "right")}>{it.product_stock ?? "-"}</td>
                            <td className={adminTdClassName(undefined, "right")}><input type="number" value={it.activity_stock} onChange={(e) => updateItem(idx, { activity_stock: Number(e.target.value) })} className="ml-auto block w-24 rounded bg-secondary px-2 py-1 text-right" /></td>
                            <td className={adminTdClassName(undefined, "right")}><input type="number" value={it.limit_per_user} onChange={(e) => updateItem(idx, { limit_per_user: Number(e.target.value) })} className="ml-auto block w-20 rounded bg-secondary px-2 py-1 text-right" /></td>
                            <td className={adminTdClassName(undefined, "right")}><UnifiedButton type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-xs text-muted-foreground"><Tx>删除</Tx></UnifiedButton></td>
                          </tr>
                        ))}
                      </tbody>
                  </AdminNativeTable>
                </>
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
                      <UnifiedButton type="button" onClick={() => setFullReductionRules(fullReductionRules.filter((_, i) => i !== idx))} className="mt-7 rounded border border-border px-2 py-1 text-xs"><Tx>删除</Tx></UnifiedButton>
                    </div>
                  ))}
                  <UnifiedButton type="button" onClick={() => setFullReductionRules([...fullReductionRules, { threshold_amount: 0, discount_amount: 0 }])} className="rounded border border-border px-3 py-1 text-sm"><Tx>新增一档</Tx></UnifiedButton>
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
            <div className="space-y-4">
              {form.type === "flash_sale" ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">
                  <p className="text-sm font-medium"><Tx>秒杀活动范围由已选择的秒杀商品自动决定。</Tx></p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    <Tx>发布或保存时系统会自动将适用范围设置为“指定商品”，并使用秒杀商品列表生成商品范围，无需在这里额外选择分类或商品。</Tx>
                  </p>
                  <div className="mt-3 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                    <Tx>已选择秒杀商品</Tx>：{form.items.length} <Tx>个</Tx>
                  </div>
                </div>
              ) : (
              <>
              <div>
                <p className="text-sm font-medium"><Tx>活动对谁生效</Tx></p>
                <p className="mt-1 text-xs text-muted-foreground"><Tx>员工只需要选择对象，不需要填写商品或分类编号。</Tx></p>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {[
                    { value: "all" as const, title: "全场商品", desc: "所有商品都参加" },
                    { value: "category" as const, title: "指定分类", desc: "选择一个或多个分类" },
                    { value: "product" as const, title: "指定商品", desc: "搜索并选择商品" },
                    { value: "new_user" as const, title: "新用户", desc: "仅新注册用户" },
                    { value: "old_user" as const, title: "老用户", desc: "非新用户参与" },
                  ].map((option) => {
                    const active = (form.scope_type || "product") === option.value;
                    return (
                      <UnifiedButton
                        key={option.value}
                        type="button"
                        onClick={() => handleScopeTypeChange(option.value)}
                        className={`rounded-xl border p-3 text-left transition-colors ${active ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]" : "border-border hover:bg-secondary/60"}`}
                      >
                        <span className="block text-sm font-semibold">{tText(option.title)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{tText(option.desc)}</span>
                      </UnifiedButton>
                    );
                  })}
                </div>
              </div>

              {categoryScopeEnabled ? (
                <div className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium"><Tx>选择分类</Tx></p>
                      <p className="mt-1 text-xs text-muted-foreground"><Tx>可按分类名称搜索，勾选后自动加入活动范围。</Tx></p>
                    </div>
                    <UnifiedButton type="button" onClick={clearScopeIds} disabled={!selectedScopeIds.length} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-50"><Tx>清空已选</Tx></UnifiedButton>
                  </div>
                  <AdminSearchInput
                    value={scopeKeyword}
                    onChange={setScopeKeyword}
                    placeholder={tText("搜索分类名称")}
                    className="mt-3 min-h-[40px] border-0 bg-secondary"
                  />
                  <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border p-2">
                    {categoriesQuery.isLoading ? <p className="p-2 text-sm text-muted-foreground"><Tx>分类加载中...</Tx></p> : null}
                    {!categoriesQuery.isLoading && categoryOptions.length === 0 ? <p className="p-2 text-sm text-muted-foreground"><Tx>未找到匹配分类</Tx></p> : null}
                    <div className="space-y-1">
                      {categoryOptions.map((category) => {
                        const checked = selectedScopeIds.includes(category.id);
                        return (
                          <label key={category.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${checked ? "bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-foreground" : "hover:bg-secondary/60"}`}>
                            <input type="checkbox" checked={checked} onChange={(e) => toggleScopeId(category.id, e.target.checked)} />
                            <span className="truncate" style={{ paddingLeft: category.level * 12 }}>{category.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {productScopeEnabled ? (
                <div className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium"><Tx>选择商品</Tx></p>
                      <p className="mt-1 text-xs text-muted-foreground"><Tx>可按商品名称搜索，勾选后自动加入活动范围。</Tx></p>
                    </div>
                    <UnifiedButton type="button" onClick={clearScopeIds} disabled={!selectedScopeIds.length} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-50"><Tx>清空已选</Tx></UnifiedButton>
                  </div>
                  <AdminSearchInput
                    value={scopeKeyword}
                    onChange={setScopeKeyword}
                    placeholder={tText("搜索商品名称")}
                    className="mt-3 min-h-[40px] border-0 bg-secondary"
                  />
                  <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border p-2">
                    {productSearchQuery.isLoading ? <p className="p-2 text-sm text-muted-foreground"><Tx>商品加载中...</Tx></p> : null}
                    {!productSearchQuery.isLoading && productOptions.length === 0 ? <p className="p-2 text-sm text-muted-foreground"><Tx>未找到匹配商品</Tx></p> : null}
                    <div className="space-y-2">
                      {productOptions.map((product) => {
                        const checked = selectedScopeIds.includes(product.id);
                        return (
                          <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm ${checked ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]" : "border-border hover:bg-secondary/60"}`}>
                            <input type="checkbox" checked={checked} onChange={(e) => toggleScopeId(product.id, e.target.checked)} />
                            <img src={product.cover_image || ""} alt={product.name} className="h-10 w-10 rounded bg-secondary object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{product.name}</span>
                              <span className="block text-xs text-muted-foreground">RM {product.price} · 库存 {product.stock}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium"><Tx>已选内容</Tx></p>
                    <p className="mt-1 text-xs text-muted-foreground">{scopeSummary}</p>
                  </div>
                  {OBJECT_SCOPE_TYPES.has(form.scope_type) && selectedScopeIds.length > 0 ? (
                    <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">共 {selectedScopeIds.length} 项</span>
                  ) : null}
                </div>
                {OBJECT_SCOPE_TYPES.has(form.scope_type) && selectedScopeIds.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedScopeIds.slice(0, 12).map((id) => {
                      const label = form.scope_type === "category"
                        ? categoryLabel(categoryById.get(id), id)
                        : productLabel(productById.get(id), id);
                      return (
                        <UnifiedButton
                          key={id}
                          type="button"
                          onClick={() => toggleScopeId(id, false)}
                          className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary"
                          title={tText("点击移除")}
                        >
                          {label} ×
                        </UnifiedButton>
                      );
                    })}
                    {selectedScopeIds.length > 12 ? <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">还有 {selectedScopeIds.length - 12} 项</span> : null}
                  </div>
                ) : null}
              </div>
              </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-medium"><Tx>展示位置</Tx></p>
                {invalidDisplayPositions.length ? (
                  <p className="mt-1 text-xs text-destructive">
                    <Tx>当前活动类型存在不支持的历史展示位置，请取消后重新选择。</Tx>
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {allowedDisplayPositions.map((key) => {
                    const checked = (form.display_positions || []).includes(key);
                    return (
                      <label key={key} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${checked ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))]" : "border-border"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setForm((p) => ({ ...p, display_positions: toggleDisplayPosition(p.display_positions, key) }))} />
                        {tText(DISPLAY_POSITION_LABELS[key])}
                      </label>
                    );
                  })}
                </div>
                {invalidDisplayPositions.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {invalidDisplayPositions.map((position) => (
                      <UnifiedButton
                        key={position}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, display_positions: (p.display_positions || []).filter((item) => item !== position) }))}
                        className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive"
                      >
                        {tText(DISPLAY_POSITION_LABELS[position as DisplayPosition] || position)} ×
                      </UnifiedButton>
                    ))}
                  </div>
                ) : null}
              </div>
              {isSuperAdmin ? (
                <label className="text-sm"><Tx>内部备注</Tx><input value={form.internal_note || ""} onChange={(e) => setForm((p) => ({ ...p, internal_note: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
                  <p><Tx>内部备注仅超级管理员可见。</Tx></p>
                  <p className="mt-1"><Tx>员工侧只保留展示位置配置，避免录入仅供内部流转的说明。</Tx></p>
                </div>
              )}
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

      <div className={`${pickerOpen ? "hidden" : "flex"} sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 flex-wrap justify-end gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur-md lg:bottom-0`}>
        <UnifiedButton onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>上一步</Tx></UnifiedButton>
        <LoadingButton type="button" variant="outline" state={saving ? "loading" : "normal"} loadingText="保存中..." onClick={() => void validateAndSave("draft")} className="rounded-lg px-3 py-2 text-sm"><Tx>保存草稿</Tx></LoadingButton>
        <UnifiedButton onClick={() => setStep((s) => Math.min(ACTIVITY_FORM_STEPS.length - 1, s + 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>下一步</Tx></UnifiedButton>
        <LoadingButton type="button" variant="price" state={saving ? "loading" : "normal"} loadingText="发布中..." onClick={() => void validateAndSave("active")} className="rounded-lg px-3 py-2 text-sm font-semibold"><Tx>发布活动</Tx></LoadingButton>
        <UnifiedButton onClick={goBack} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>取消</Tx></UnifiedButton>
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
        onConfirm={(rows) => setForm((p) => {
          const existing = new Set(p.items.map((item) => item.product_id));
          return { ...p, items: [...p.items, ...rows.filter((row) => !existing.has(row.product_id))] };
        })}
      />
    </AdminPageShell>
  );
}
