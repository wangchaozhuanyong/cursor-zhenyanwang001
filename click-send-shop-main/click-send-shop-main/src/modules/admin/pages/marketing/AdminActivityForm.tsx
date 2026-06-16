import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";
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
import { fetchAuditLogs, type AuditLogRow } from "@/services/admin/logService";
import * as couponService from "@/services/admin/couponService";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { Coupon } from "@/types/coupon";
import { flattenCategories } from "@/utils/categoryTree";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { toastErrorMessage } from "@/utils/errorMessage";
import {
  ACTIVITY_FORM_STEPS,
  ACTIVITY_PRICE_TYPES,
  GENERAL_SCOPE_ACTIVITY_TYPES,
  LEGACY_COUPON_ACTIVITY_TYPES,
  OBJECT_SCOPE_TYPES,
  POINTS_REWARD_TYPES,
  createActivityCopyDraft,
  createInitialActivityForm,
  type FullDiscountRule,
  type FullReductionRule,
  type MemberPriceRule,
  getCouponIdsFromActivityConfig,
  getDefaultRuleConfigForActivity,
  getStepLabel,
  normalizeActivityTypeForForm,
  normalizePayloadForSubmit,
  setScopeIds,
  toggleDisplayPosition,
  uniqueIds,
  useActivitySave,
  validateActivityForm,
} from "./activityFormLogic";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { ActivityPrecheckResult } from "@/services/admin/activityService";
import { ApiError } from "@/types/common";
import { formatDateTime } from "@/utils/formatDateTime";
import { localizedAuditSummary, zhActionType, zhAuditResult } from "@/utils/auditLogI18n";

function productLabel(product: Product | undefined, id: string) {
  return product?.name || `商品 ${id}`;
}

function categoryLabel(category: Category | undefined, id: string) {
  return category?.name || `分类 ${id}`;
}

const EXCLUSIVE_ACTIVITY_TYPES: Array<{ value: ActivityType; label: string }> = [
  { value: "coupon", label: "优惠券" },
  { value: "full_reduction", label: "满减" },
  { value: "full_discount", label: "满折" },
  { value: "limited_time_discount", label: "限时折扣" },
  { value: "flash_sale", label: "秒杀" },
  { value: "member_price", label: "会员价" },
  { value: "points_reward", label: "积分奖励" },
];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_COUPONS: Coupon[] = [];

type ActivitySaveIssue = {
  kind: "conflict" | "error";
  message: string;
  traceId?: string;
};

function readErrorString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildActivitySaveIssue(error: unknown, fallback: string): ActivitySaveIssue {
  if (error instanceof ApiError) {
    const data = error.data && typeof error.data === "object" ? error.data as Record<string, unknown> : {};
    return {
      kind: error.code === 409 ? "conflict" : "error",
      message: toastErrorMessage(error, fallback),
      traceId: readErrorString(data.traceId),
    };
  }
  return {
    kind: "error",
    message: toastErrorMessage(error, fallback),
  };
}

function ActivityPrecheckSnapshotCard({ result, tText }: { result: ActivityPrecheckResult; tText: (text: string) => string }) {
  const snapshot = result.snapshot;
  if (!snapshot) return null;
  const displayPositions = snapshot.display_positions?.length ? snapshot.display_positions.join("、") : "--";
  const exclusive = snapshot.exclusive_with?.length ? snapshot.exclusive_with.join("、") : tText("无");
  return (
    <dl className="mt-3 grid gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">{tText("规则版本")}</dt>
        <dd className="mt-0.5 font-medium">v{snapshot.rule_version}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("目标状态")}</dt>
        <dd className="mt-0.5 font-medium">{tText(snapshot.target_status)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("规则摘要")}</dt>
        <dd className="mt-0.5 font-medium">{tText(snapshot.rule_summary)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("活动时间")}</dt>
        <dd className="mt-0.5 font-medium">{snapshot.start_at || "-"} - {snapshot.end_at || "-"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("范围 / 商品")}</dt>
        <dd className="mt-0.5 font-medium">{snapshot.scope_type} · {tText("范围")} {snapshot.scope_count} · {tText("商品")} {snapshot.item_count}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("展示位置")}</dt>
        <dd className="mt-0.5 break-words font-medium">{displayPositions}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("叠加")}</dt>
        <dd className="mt-0.5 font-medium">{snapshot.stackable ? tText("允许") : tText("不允许")}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{tText("互斥类型")}</dt>
        <dd className="mt-0.5 break-words font-medium">{exclusive}</dd>
      </div>
    </dl>
  );
}

function ActivitySaveIssuePanel({
  issue,
  onReload,
  tText,
}: {
  issue: ActivitySaveIssue;
  onReload?: () => void;
  tText: (text: string) => string;
}) {
  const isConflict = issue.kind === "conflict";
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm ${isConflict ? "border-amber-300 bg-amber-50 text-amber-900" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
      <div className="flex min-w-0 flex-1 gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{isConflict ? tText("保存冲突") : tText("保存失败")}</p>
          <p className="mt-1 break-words">{issue.message}</p>
          {isConflict ? <p className="mt-1 text-xs opacity-80">{tText("当前活动可能已被其他管理员修改。请重新载入最新版本后再编辑，避免覆盖他人修改。")}</p> : null}
          {issue.traceId ? <p className="mt-1 text-xs opacity-75">{tText("追踪ID")}：{issue.traceId}</p> : null}
        </div>
      </div>
      {isConflict && onReload ? (
        <UnifiedButton
          type="button"
          onClick={onReload}
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-300 bg-background px-3 text-xs text-amber-900"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          <span>{tText("重新载入")}</span>
        </UnifiedButton>
      ) : null}
    </div>
  );
}

function ActivityAuditTimeline({
  logs,
  loading,
  canView,
  onViewAll,
  tText,
}: {
  logs: AuditLogRow[];
  loading: boolean;
  canView: boolean;
  onViewAll: () => void;
  tText: (text: string) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold"><Tx>最近操作记录</Tx></h3>
          <p className="mt-1 text-xs text-muted-foreground"><Tx>用于核对规则版本和多人编辑痕迹。</Tx></p>
        </div>
        {canView ? (
          <UnifiedButton type="button" onClick={onViewAll} className="rounded-md border border-border px-2.5 py-1.5 text-xs">
            <Tx>查看全部</Tx>
          </UnifiedButton>
        ) : null}
      </div>
      {!canView ? (
        <p className="rounded-lg bg-secondary px-3 py-3 text-xs text-muted-foreground"><Tx>当前账号没有审计日志查看权限。</Tx></p>
      ) : loading ? (
        <p className="rounded-lg bg-secondary px-3 py-3 text-xs text-muted-foreground"><Tx>操作记录加载中...</Tx></p>
      ) : logs.length === 0 ? (
        <p className="rounded-lg bg-secondary px-3 py-3 text-xs text-muted-foreground"><Tx>暂无操作记录。</Tx></p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{tText(zhActionType(log.action_type))}</span>
                <span className={log.result === "success" ? "text-emerald-600" : "text-destructive"}>{tText(zhAuditResult(log.result))}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {formatDateTime(log.created_at)} · {log.operator_name || tText("未知管理员")}
              </p>
              {log.summary ? (
                <p className="mt-1 line-clamp-2 text-foreground">{localizedAuditSummary(log.summary, tText)}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminActivityForm() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const can = useAdminPermissionStore((s) => s.can);
  const { activityType: labelType } = useAdminDisplayLabel();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const goBack = useAdminGoBack("/admin/marketing/activities");
  const { id } = useParams();
  const isEdit = !!id;
  const canViewAudit = isSuperAdmin || can("audit.view");
  const [search] = useSearchParams();
  const copyFromId = !isEdit ? search.get("copy_from") : null;
  const requestedCreateType = (search.get("type") as ActivityType) || "flash_sale";
  const createType = LEGACY_COUPON_ACTIVITY_TYPES.has(requestedCreateType)
    ? "flash_sale"
    : normalizeActivityTypeForForm(requestedCreateType);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [pendingPublishStatus, setPendingPublishStatus] = useState<ActivityStatus | null>(null);
  const [statusLabel, setStatusLabel] = useState("草稿");
  const [scopeKeyword, setScopeKeyword] = useState("");
  const [prechecking, setPrechecking] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<ActivityPrecheckResult | null>(null);
  const [saveIssue, setSaveIssue] = useState<ActivitySaveIssue | null>(null);
  const saveInFlightRef = useRef(false);

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

  const couponsQuery = useQuery({
    queryKey: [...adminQueryKeys.coupons(), "activity-coupon-select"],
    queryFn: () => couponService.fetchCoupons({ page: 1, pageSize: 100, publish_status: "active" }),
    enabled: form.type === "coupon",
    staleTime: 60_000,
  });

  const selectedProductsQuery = useQuery({
    queryKey: ["admin", "activityScopeSelectedProducts", selectedScopeIds],
    queryFn: () => fetchProducts({ page: 1, pageSize: Math.max(selectedScopeIds.length, 1), ids: selectedScopeIds }),
    enabled: productScopeEnabled && selectedScopeIds.length > 0,
    staleTime: 60_000,
  });

  const activityAuditQuery = useQuery({
    queryKey: adminQueryKeys.auditLogs({
      page: 1,
      pageSize: 5,
      objectType: "marketing_activity",
      objectId: id || "",
      sortOrder: "desc",
    }),
    queryFn: () => fetchAuditLogs({
      page: 1,
      pageSize: 5,
      objectType: "marketing_activity",
      objectId: id || "",
      sortOrder: "desc",
    }),
    enabled: isEdit && !!id && canViewAudit,
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
  const couponOptions = couponsQuery.data?.list || EMPTY_COUPONS;
  const selectedCouponIds = useMemo(
    () => getCouponIdsFromActivityConfig(form.activity_config),
    [form.activity_config],
  );
  const selectedCouponSet = useMemo(() => new Set(selectedCouponIds), [selectedCouponIds]);
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
  const {
    dirty: formDirty,
    hasDraft,
    markClean,
    discardDraft,
  } = useAdminFormDirty(form, formHydrated && !activityLoading, { restoreDraft: setForm });

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
    setPrecheckResult(null);
    setSaveIssue(null);
  }, [form]);

  useEffect(() => {
    if (!formDirty && !saving) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [formDirty, saving]);

  useEffect(() => {
    if (isEdit || copyFromId) return;
    if (hasDraft || formDirty) {
      setFormHydrated(true);
      return;
    }
    const nextForm = createInitialActivityForm(createType);
    setForm(nextForm);
    setStep(0);
    setStatusLabel("草稿");
    setScopeKeyword("");
    setFormHydrated(true);
    markClean(nextForm);
  }, [copyFromId, createType, formDirty, hasDraft, isEdit, markClean]);

  useEffect(() => {
    if (!activityQuery.data) return;
    if (hasDraft || formDirty) {
      setFormHydrated(true);
      return;
    }
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
      scope_type: ACTIVITY_PRICE_TYPES.has(d.type) ? "product" : d.scope_type || "product",
      scope_ids: ACTIVITY_PRICE_TYPES.has(d.type) ? (d.items || []).map((item) => item.product_id).filter(Boolean) : d.scope_ids || [],
      allow_coupon_stack: d.allow_coupon_stack ?? true,
      allow_points_stack: d.allow_points_stack ?? true,
      allow_reward: d.allow_reward ?? false,
      publish_at: d.publish_at || null,
      internal_note: d.internal_note || "",
      display_positions: d.display_positions || [],
      activity_config: d.activity_config || {},
      rule_config: d.rule_config || d.activity_config || {},
      slug: d.slug || null,
      priority: d.priority || 0,
      stackable: d.stackable ?? true,
      exclusive_with: d.exclusive_with || [],
      usage_limit_total: d.usage_limit_total ?? null,
      usage_limit_per_user: d.usage_limit_per_user ?? null,
      version: d.version || 1,
      sort_order: d.sort_order || 0,
      items: (d.items || []).map(({ id: _id, sold_count: _soldCount, ...item }) => ({
        ...item,
        sold_count: 0,
      })),
    });
    setStatusLabel(d.status_label || "草稿");
    setFormHydrated(true);
  }, [activityQuery.data, formDirty, hasDraft]);

  useEffect(() => {
    if (!copySourceQuery.data) return;
    if (hasDraft || formDirty) {
      setFormHydrated(true);
      return;
    }
    setForm(createActivityCopyDraft(copySourceQuery.data));
    setStatusLabel("草稿");
    toast.success(tText("已载入复制活动内容，请重新设置活动时间后发布"));
    setFormHydrated(true);
  }, [copySourceQuery.data, formDirty, hasDraft, tText]);

  const fullReductionRules = useMemo(
    () => (Array.isArray((form.activity_config as unknown as Record<string, unknown>)?.full_reduction_rules)
      ? (form.activity_config as unknown as Record<string, unknown>).full_reduction_rules as FullReductionRule[]
      : [{ threshold_amount: Number(form.threshold_amount || 0), discount_amount: Number(form.discount_amount || 0) }]),
    [form.activity_config, form.threshold_amount, form.discount_amount],
  );

  const fullDiscountRules = useMemo(
    () => (Array.isArray((form.activity_config as unknown as Record<string, unknown>)?.full_discount_rules)
      ? (form.activity_config as unknown as Record<string, unknown>).full_discount_rules as FullDiscountRule[]
      : [{ threshold_amount: Number(form.threshold_amount || 0), discount_percent: 90 }]),
    [form.activity_config, form.threshold_amount],
  );

  const memberPriceRules = useMemo(
    () => (Array.isArray((form.activity_config as unknown as Record<string, unknown>)?.member_price_rules)
      ? (form.activity_config as unknown as Record<string, unknown>).member_price_rules as MemberPriceRule[]
      : [{ discount_percent: 95, min_order_amount: 0, member_level_ids: [] }]),
    [form.activity_config],
  );

  const setFullReductionRules = (rules: FullReductionRule[]) => {
    setForm((prev) => ({
      ...prev,
      threshold_amount: rules[0]?.threshold_amount ?? null,
      discount_amount: rules[0]?.discount_amount ?? null,
      activity_config: { ...(prev.activity_config || {}), full_reduction_rules: rules },
      rule_config: { ...(prev.rule_config || {}), full_reduction_rules: rules },
    }));
  };

  const setFullDiscountRules = (rules: FullDiscountRule[]) => {
    setForm((prev) => ({
      ...prev,
      threshold_amount: rules[0]?.threshold_amount ?? null,
      discount_amount: null,
      activity_config: { ...(prev.activity_config || {}), full_discount_rules: rules },
      rule_config: { ...(prev.rule_config || {}), full_discount_rules: rules },
    }));
  };

  const setMemberPriceRules = (rules: MemberPriceRule[]) => {
    setForm((prev) => ({
      ...prev,
      activity_config: { ...(prev.activity_config || {}), member_price_rules: rules },
      rule_config: { ...(prev.rule_config || {}), member_price_rules: rules },
    }));
  };

  const localValidate = useCallback(
    () => validateActivityForm({
      form,
      selectedScopeIds,
      invalidDisplayPositions,
      fullReductionRules,
      fullDiscountRules,
      memberPriceRules,
    }),
    [form, fullDiscountRules, fullReductionRules, invalidDisplayPositions, memberPriceRules, selectedScopeIds],
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
    onError: (error) => setSaveIssue(buildActivitySaveIssue(error, tText("保存失败"))),
  });

  const saveWithLock = async (targetStatus: ActivityStatus) => {
    if (saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    try {
      return await performSave(targetStatus);
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const reloadActivityPage = useCallback(() => {
    markClean();
    if (typeof window !== "undefined") window.location.reload();
  }, [markClean]);

  const runPublishPrecheck = useCallback(async (targetStatus: ActivityStatus, options: { toastOnSuccess?: boolean } = {}) => {
    const err = localValidate();
    if (err) {
      toast.error(tText(err));
      setPrecheckResult(null);
      return false;
    }
    setPrechecking(true);
    try {
      const payload = normalizePayloadForSubmit(form, targetStatus);
      const result = await activityService.precheckActivity(payload, id);
      setPrecheckResult(result);
      if (result.blocking.length) {
        toast.error(tText(result.blocking[0].message || "发布预检未通过"));
        setStep(5);
        return false;
      }
      if (options.toastOnSuccess) toast.success(tText("发布预检通过"));
      return true;
    } catch (e) {
      setPrecheckResult(null);
      toast.error(toastErrorMessage(e, tText("发布预检失败")));
      setStep(5);
      return false;
    } finally {
      setPrechecking(false);
    }
  }, [form, id, localValidate, tText]);

  const validateAndSave = async (targetStatus: ActivityStatus) => {
    if (saveInFlightRef.current || saving) return;
    if (targetStatus !== "draft" && ACTIVITY_PRICE_TYPES.has(form.type) && form.items.length === 0) {
      setStep(2);
      toast.error(tText("请先选择活动商品"));
      return;
    }
    const err = localValidate();
    if (targetStatus !== "draft" && err) {
      toast.error(tText(err));
      if (ACTIVITY_PRICE_TYPES.has(form.type) && err.includes("活动商品")) setStep(2);
      return;
    }
    if (targetStatus !== "draft") {
      const precheckOk = await runPublishPrecheck(targetStatus);
      if (!precheckOk) return;
      setPendingPublishStatus(targetStatus);
      setPublishConfirmOpen(true);
      return;
    }
    await saveWithLock(targetStatus);
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

  const toggleExclusiveType = (value: ActivityType, checked: boolean) => {
    setForm((prev) => {
      const set = new Set(prev.exclusive_with || []);
      if (checked) set.add(value);
      else set.delete(value);
      return { ...prev, exclusive_with: Array.from(set) };
    });
  };

  const toggleCouponId = (couponId: string) => {
    setForm((prev) => {
      const current = new Set(getCouponIdsFromActivityConfig(prev.activity_config));
      if (current.has(couponId)) current.delete(couponId);
      else current.add(couponId);
      const coupon_ids = Array.from(current);
      const nextConfig = { ...(prev.activity_config || {}), coupon_ids };
      return {
        ...prev,
        activity_config: nextConfig,
        rule_config: { ...(prev.rule_config || {}), coupon_ids },
      };
    });
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
          {saving ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <Tx>保存中，请勿关闭或刷新页面。系统会在保存完成后自动返回活动列表。</Tx>
            </div>
          ) : null}
          {saveIssue ? (
            <ActivitySaveIssuePanel
              issue={saveIssue}
              onReload={isEdit ? reloadActivityPage : undefined}
              tText={tText}
            />
          ) : null}
          {hasDraft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
              <span><Tx>已恢复未保存草稿，保存后会覆盖当前活动。</Tx></span>
              <UnifiedButton type="button" onClick={discardDraft} disabled={saving} className="min-h-8 rounded-md border border-border px-3 text-xs">
                <Tx>丢弃草稿</Tx>
              </UnifiedButton>
            </div>
          ) : formDirty ? (
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground"><Tx>有未保存修改，离开页面前请保存。</Tx></p>
          ) : null}

          <fieldset disabled={saving} aria-busy={saving} className="space-y-4 disabled:opacity-70">
          {step === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { k: "flash_sale" as const, t: "限时秒杀", d: "短时低价促销" },
                { k: "limited_time_discount" as const, t: "限时折扣", d: "按活动价限时促销" },
                { k: "full_reduction" as const, t: "满减活动", d: "按门槛减免" },
                { k: "coupon" as const, t: "优惠券活动", d: "统一活动模型草稿，发券链路待接入" },
                { k: "points_reward" as const, t: "积分奖励", d: "下单可获得额外积分倍率" },
                { k: "campaign" as const, t: "普通活动", d: "活动中心和横幅展示" },
                { k: "full_discount" as const, t: "满折活动", d: "按门槛打折，例如满100打9折" },
                { k: "member_price" as const, t: "会员专享", d: "按会员身份和商品范围自动打折" },
                { k: "checkin_reward" as const, t: "签到奖励", d: "设置每日签到可获得的积分" },
              ].map((x) => (
                <UnifiedButton
                  key={x.k}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      type: x.k,
                      display_positions: getDefaultDisplayPositionsForActivity(x.k),
                      scope_type: ACTIVITY_PRICE_TYPES.has(x.k) ? "product" : GENERAL_SCOPE_ACTIVITY_TYPES.has(x.k) ? "all" : p.scope_type,
                      scope_ids: ACTIVITY_PRICE_TYPES.has(x.k) ? p.items.map((item) => item.product_id).filter(Boolean) : GENERAL_SCOPE_ACTIVITY_TYPES.has(x.k) ? [] : p.scope_ids,
                      activity_config: getDefaultRuleConfigForActivity(x.k),
                      rule_config: getDefaultRuleConfigForActivity(x.k),
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
                <label className="text-sm"><Tx>活动链接 slug</Tx><input value={form.slug || ""} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                <label className="text-sm"><Tx>规则优先级</Tx><input type="number" value={String(form.priority ?? 0)} onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm"><Tx>开始时间</Tx><SegmentedDateTimeInput value={form.start_at ? form.start_at.slice(0, 16) : ""} onChange={(start_at) => setForm((p) => ({ ...p, start_at }))} className="mt-1 w-full" /></label>
                <label className="text-sm"><Tx>结束时间</Tx><SegmentedDateTimeInput value={form.end_at ? form.end_at.slice(0, 16) : ""} onChange={(end_at) => setForm((p) => ({ ...p, end_at }))} className="mt-1 w-full" /></label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {ACTIVITY_PRICE_TYPES.has(form.type) && (
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

              {form.type === "checkin_reward" && (
                <div className="grid gap-3 rounded-xl border border-border p-3 md:grid-cols-2">
                  <label className="text-sm"><Tx>每日签到积分</Tx>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg bg-secondary px-3 py-2"
                      value={String((form.activity_config as Record<string, unknown>)?.reward_points ?? 5)}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        activity_config: { ...(p.activity_config || {}), bonus_kind: "checkin", reward_points: Number(e.target.value), once_per_day: true },
                        rule_config: { ...(p.rule_config || {}), bonus_kind: "checkin", reward_points: Number(e.target.value), once_per_day: true },
                      }))}
                    />
                  </label>
                  <label className="text-sm"><Tx>连续签到奖励积分</Tx>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg bg-secondary px-3 py-2"
                      value={String((form.activity_config as Record<string, unknown>)?.streak_bonus_points ?? 0)}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        activity_config: { ...(p.activity_config || {}), bonus_kind: "checkin", streak_bonus_points: Number(e.target.value) },
                        rule_config: { ...(p.rule_config || {}), bonus_kind: "checkin", streak_bonus_points: Number(e.target.value) },
                      }))}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground"><Tx>0 表示不启用连续签到额外奖励</Tx></span>
                  </label>
                  <label className="text-sm"><Tx>连续签到天数</Tx>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg bg-secondary px-3 py-2"
                      value={String((form.activity_config as Record<string, unknown>)?.streak_bonus_every_days ?? 0)}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        activity_config: { ...(p.activity_config || {}), bonus_kind: "checkin", streak_bonus_every_days: Number(e.target.value) },
                        rule_config: { ...(p.rule_config || {}), bonus_kind: "checkin", streak_bonus_every_days: Number(e.target.value) },
                      }))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(form.activity_config as Record<string, unknown>)?.once_per_day !== false}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        activity_config: { ...(p.activity_config || {}), bonus_kind: "checkin", once_per_day: e.target.checked },
                        rule_config: { ...(p.rule_config || {}), bonus_kind: "checkin", once_per_day: e.target.checked },
                      }))}
                    />
                    <Tx>每个用户每天只能签到一次</Tx>
                  </label>
                </div>
              )}

              {POINTS_REWARD_TYPES.has(form.type) && form.type !== "checkin_reward" && (
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

              {form.type === "coupon" && (
                <div className="rounded-xl border border-border p-3">
                  <div className="mb-3">
                    <p className="text-sm font-medium"><Tx>关联优惠券模板</Tx></p>
                    <p className="mt-1 text-xs text-muted-foreground"><Tx>发布优惠券活动前至少选择一张已发布且可领取的优惠券模板。</Tx></p>
                  </div>
                  {couponsQuery.isLoading ? (
                    <p className="rounded-lg bg-secondary px-3 py-4 text-sm text-muted-foreground"><Tx>优惠券加载中...</Tx></p>
                  ) : couponOptions.length === 0 ? (
                    <p className="rounded-lg bg-secondary px-3 py-4 text-sm text-muted-foreground"><Tx>暂无可用优惠券模板，请先到优惠券模板创建并发布。</Tx></p>
                  ) : (
                    <div className="grid max-h-[320px] gap-2 overflow-auto pr-1 md:grid-cols-2">
                      {couponOptions.map((coupon) => (
                        <label key={coupon.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-secondary/60">
                          <input
                            type="checkbox"
                            checked={selectedCouponSet.has(coupon.id)}
                            onChange={() => toggleCouponId(coupon.id)}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{coupon.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {coupon.code} · {coupon.type === "fixed" ? `减 RM ${coupon.value}` : coupon.type === "percentage" ? `${coupon.value}% 折扣` : "运费券"}
                              {Number(coupon.min_amount || 0) > 0 ? ` · 满 RM ${coupon.min_amount}` : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
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

              {form.type === "full_discount" && (
                <div className="space-y-2">
                  {fullDiscountRules.map((r, idx) => (
                    <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <label className="text-sm"><Tx>满折门槛</Tx><input type="number" value={r.threshold_amount ?? ""} onChange={(e) => setFullDiscountRules(fullDiscountRules.map((x, i) => i === idx ? { ...x, threshold_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                      <label className="text-sm"><Tx>折扣比例 %</Tx><input type="number" min={1} max={99} value={r.discount_percent ?? ""} onChange={(e) => setFullDiscountRules(fullDiscountRules.map((x, i) => i === idx ? { ...x, discount_percent: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /><span className="mt-1 block text-xs text-muted-foreground"><Tx>90=9折，85=8.5折</Tx></span></label>
                      <UnifiedButton type="button" onClick={() => setFullDiscountRules(fullDiscountRules.filter((_, i) => i !== idx))} className="mt-7 rounded border border-border px-2 py-1 text-xs"><Tx>删除</Tx></UnifiedButton>
                    </div>
                  ))}
                  <UnifiedButton type="button" onClick={() => setFullDiscountRules([...fullDiscountRules, { threshold_amount: 0, discount_percent: 90 }])} className="rounded border border-border px-3 py-1 text-sm"><Tx>新增一档</Tx></UnifiedButton>
                </div>
              )}

              {form.type === "member_price" && (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium"><Tx>会员价规则</Tx></p>
                    <p className="mt-1 text-xs text-muted-foreground"><Tx>会员等级为空时，对所有已登录且有会员等级的用户生效。</Tx></p>
                  </div>
                  {memberPriceRules.map((r, idx) => {
                    const levelIds = Array.isArray(r.member_level_ids) ? r.member_level_ids.join(",") : "";
                    return (
                      <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto]">
                        <label className="text-sm"><Tx>折扣比例 %</Tx><input type="number" min={1} max={99} value={r.discount_percent ?? ""} onChange={(e) => setMemberPriceRules(memberPriceRules.map((x, i) => i === idx ? { ...x, discount_percent: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /><span className="mt-1 block text-xs text-muted-foreground"><Tx>95=9.5折，90=9折</Tx></span></label>
                        <label className="text-sm"><Tx>最低订单金额</Tx><input type="number" min={0} value={r.min_order_amount ?? 0} onChange={(e) => setMemberPriceRules(memberPriceRules.map((x, i) => i === idx ? { ...x, min_order_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                        <label className="text-sm"><Tx>会员等级 ID</Tx><input value={levelIds} onChange={(e) => setMemberPriceRules(memberPriceRules.map((x, i) => i === idx ? { ...x, member_level_ids: e.target.value.split(",").map((id) => id.trim()).filter(Boolean) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /><span className="mt-1 block text-xs text-muted-foreground"><Tx>多个 ID 用英文逗号分隔；留空表示所有会员。</Tx></span></label>
                        <UnifiedButton type="button" onClick={() => setMemberPriceRules(memberPriceRules.filter((_, i) => i !== idx))} className="mt-7 rounded border border-border px-2 py-1 text-xs"><Tx>删除</Tx></UnifiedButton>
                      </div>
                    );
                  })}
                  <UnifiedButton type="button" onClick={() => setMemberPriceRules([...memberPriceRules, { discount_percent: 95, min_order_amount: 0, member_level_ids: [] }])} className="rounded border border-border px-3 py-1 text-sm"><Tx>新增一档</Tx></UnifiedButton>
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_coupon_stack} onChange={(e) => setForm((p) => ({ ...p, allow_coupon_stack: e.target.checked }))} /><Tx>允许叠加优惠券</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_points_stack} onChange={(e) => setForm((p) => ({ ...p, allow_points_stack: e.target.checked }))} /><Tx>允许使用积分</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_reward} onChange={(e) => setForm((p) => ({ ...p, allow_reward: e.target.checked }))} /><Tx>参与返现</Tx></label>
              </div>
              <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.stackable !== false} onChange={(e) => setForm((p) => ({ ...p, stackable: e.target.checked }))} />
                    <Tx>允许与其他活动叠加</Tx>
                  </label>
                  <label className="text-sm"><Tx>总使用次数上限</Tx>
                    <input type="number" min={0} value={form.usage_limit_total ?? ""} onChange={(e) => setForm((p) => ({ ...p, usage_limit_total: e.target.value === "" ? null : Number(e.target.value) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
                  </label>
                  <label className="text-sm"><Tx>每用户使用上限</Tx>
                    <input type="number" min={0} value={form.usage_limit_per_user ?? ""} onChange={(e) => setForm((p) => ({ ...p, usage_limit_per_user: e.target.value === "" ? null : Number(e.target.value) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium"><Tx>互斥活动类型</Tx></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EXCLUSIVE_ACTIVITY_TYPES.map((item) => (
                      <label key={item.value} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={(form.exclusive_with || []).includes(item.value)}
                          onChange={(e) => toggleExclusiveType(item.value, e.target.checked)}
                        />
                        {tText(item.label)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {ACTIVITY_PRICE_TYPES.has(form.type) ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">
                  <p className="text-sm font-medium"><Tx>活动范围由已选择的活动商品自动决定。</Tx></p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    <Tx>发布或保存时系统会自动将适用范围设置为“指定商品”，并使用活动商品列表生成商品范围，无需在这里额外选择分类或商品。</Tx>
                  </p>
                  <div className="mt-3 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                    <Tx>已选择活动商品</Tx>：{form.items.length} <Tx>个</Tx>
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

          {step === 5 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">发布前校验：{previewHint}</p>
                <LoadingButton
                  type="button"
                  variant="outline"
                  state={prechecking ? "loading" : "normal"}
                  loadingText="预检中..."
                  onClick={() => void runPublishPrecheck("active", { toastOnSuccess: true })}
                  className="rounded-lg px-3 py-2 text-xs"
                >
                  <Tx>运行发布预检</Tx>
                </LoadingButton>
              </div>
              {precheckResult ? (
                <div className={`rounded-lg border px-3 py-3 text-sm ${precheckResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                  <p className="font-semibold">{precheckResult.ok ? tText("预检通过") : tText("预检发现阻断项")}</p>
                  <ActivityPrecheckSnapshotCard result={precheckResult} tText={tText} />
                  <div className="mt-2 space-y-1">
                    {precheckResult.blocking.map((item) => (
                      <p key={`${item.code}-${item.conflict_activity_id || item.message}`}>{tText(item.message)}</p>
                    ))}
                    {!precheckResult.blocking.length && precheckResult.warnings.map((item) => (
                      <p key={`${item.code}-${item.message}`}>{tText(item.message)}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          </fieldset>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold"><Tx>活动摘要</Tx></h3>
            <p className="text-sm">{tText("类型")}：{labelType(form.type)}</p>
            <p className="text-sm">{tText("名称")}：{form.title || "-"}</p>
            <p className="text-sm">{tText("时间")}：{form.start_at || "-"} ~ {form.end_at || "-"}</p>
            <p className="text-sm">{tText("商品数")}：{form.items.length}</p>
            {isEdit ? <p className="text-sm">{tText("版本")}：v{form.version || 1}</p> : null}
            <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">{tText("前台预览")}：{previewHint}</div>
          </div>
          {isEdit ? (
            <ActivityAuditTimeline
              logs={activityAuditQuery.data?.list || []}
              loading={activityAuditQuery.isLoading}
              canView={canViewAudit}
              onViewAll={() => navigate(`/admin/audit-logs?objectType=marketing_activity&objectId=${encodeURIComponent(id || "")}`)}
              tText={tText}
            />
          ) : null}
        </div>
      </div>

      <div className={`${pickerOpen ? "hidden" : "flex"} sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 flex-wrap justify-end gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur-md lg:bottom-0`}>
        <UnifiedButton disabled={saving} onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Tx>上一步</Tx></UnifiedButton>
        <LoadingButton type="button" variant="outline" state={saving ? "loading" : "normal"} loadingText="保存中..." disabled={saving} onClick={() => void validateAndSave("draft")} className="rounded-lg px-3 py-2 text-sm"><Tx>保存草稿</Tx></LoadingButton>
        <UnifiedButton disabled={saving} onClick={() => setStep((s) => Math.min(ACTIVITY_FORM_STEPS.length - 1, s + 1))} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Tx>下一步</Tx></UnifiedButton>
        <LoadingButton type="button" variant="price" state={saving ? "loading" : "normal"} loadingText="发布中..." disabled={saving} onClick={() => void validateAndSave("active")} className="rounded-lg px-3 py-2 text-sm font-semibold"><Tx>发布活动</Tx></LoadingButton>
        <UnifiedButton disabled={saving} onClick={goBack} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"><Tx>取消</Tx></UnifiedButton>
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
          if (pendingPublishStatus) await saveWithLock(pendingPublishStatus);
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
