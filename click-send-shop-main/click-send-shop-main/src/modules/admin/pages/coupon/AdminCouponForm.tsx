import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingButton } from "@/modules/micro-interactions";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { createCoupon, fetchCoupons, updateCoupon } from "@/services/admin/couponService";
import * as categoryService from "@/services/admin/categoryService";
import { fetchProducts } from "@/services/admin/productService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { Category } from "@/types/category";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { flattenCategories } from "@/utils/categoryTree";
import type { Product } from "@/types/product";
import type { CouponUpsertPayload } from "@/types/coupon";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type CouponType = "fixed" | "percentage" | "shipping";
type ScopeType = "all" | "category";
type UsableScopeType = "all" | "category" | "product";
type PublishStatus = "draft" | "scheduled" | "active";
type ValidityMode = "absolute" | "after_claim" | "follow_activity";

const COUPON_TYPE_OPTIONS: Array<{ value: CouponType; zh: string; en: string }> = [
  { value: "fixed", zh: "满减券", en: "Fixed amount coupon" },
  { value: "percentage", zh: "折扣券", en: "Percentage coupon" },
  { value: "shipping", zh: "运费券", en: "Shipping coupon" },
];

const PAGE_SIZE = 50;

export default function AdminCouponForm() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = useCallback((zh: string, en: string) => (isEn ? en : zh), [isEn]);

  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/marketing/coupons");
  const { id } = useParams();
  const couponId = String(id || "").trim();
  const isNew = !couponId || couponId === "new";
  const isEdit = !isNew;

  const [saving, setSaving] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productKeyword, setProductKeyword] = useState("");
  const [form, setForm] = useState({
    title: "",
    code: "",
    type: "fixed" as CouponType,
    value: "",
    min_amount: "",
    start_date: "",
    end_date: "",
    publish_status: "active" as PublishStatus,
    claim_start_at: "",
    claim_end_at: "",
    use_start_at: "",
    use_end_at: "",
    validity_mode: "absolute" as ValidityMode,
    valid_days_after_claim: "7",
    description: "",
    scope_type: "all" as ScopeType,
    category_ids: [] as string[],
    display_badge: "",
    total_quantity: "",
    per_user_limit: "1",
    new_user_only: false,
    member_only: false,
    auto_issue: false,
    usable_scope_type: "all" as UsableScopeType,
    usable_product_ids: [] as string[],
    usable_category_ids: [] as string[],
    stackable_with_activity: true,
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: categoryService.fetchCategories,
    staleTime: 60_000,
  });

  const categories = categoriesQuery.data ?? [];

  const couponQuery = useQuery({
    queryKey: ["admin", "coupon-detail", couponId],
    queryFn: async () => {
      const data = await fetchCoupons({ page: 1, pageSize: 500 });
      const coupon = data.list.find((item) => String(item.id) === couponId);
      if (!coupon) throw new Error("NOT_FOUND");
      return coupon;
    },
    enabled: isEdit && !!couponId,
    staleTime: 60_000,
    retry: false,
  });

  const productQueryParams = useMemo(
    () => ({ page: productPage, pageSize: PAGE_SIZE, keyword: productKeyword.trim() || undefined }),
    [productKeyword, productPage],
  );

  const productsQuery = useQuery({
    queryKey: ["admin", "coupon-form-products", productQueryParams],
    queryFn: () => fetchProducts(productQueryParams),
    enabled: form.usable_scope_type === "product",
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const products = productsQuery.data?.list ?? [];
  const productTotal = productsQuery.data?.total ?? 0;
  const productLoading = productsQuery.isLoading && !productsQuery.data;

  const loading = isNew ? false : couponQuery.isLoading && !couponQuery.data;
  const [formHydrated, setFormHydrated] = useState(isNew);
  const { markClean } = useAdminFormDirty(form, formHydrated && !loading);

  const tabTitle = useMemo(() => {
    if (isNew) return null;
    if (form.title.trim()) return L(`编辑优惠券模板：${form.title.trim()}`, `Edit coupon template: ${form.title.trim()}`);
    if (couponId) return L(`编辑优惠券模板 #${couponId}`, `Edit coupon template #${couponId}`);
    return null;
  }, [couponId, form.title, isNew, L]);
  useAdminTabTitle(tabTitle, formHydrated && !loading && Boolean(tabTitle));

  const claimedCount = Number(couponQuery.data?.claimed_count || 0);
  const coreRulesLocked = isEdit && claimedCount > 0;

  useEffect(() => {
    if (!isEdit) return;
    if (!couponId) {
      toast.error(L("优惠券参数异常，已返回列表", "Coupon parameters are invalid, returning to list"));
      navigate("/admin/marketing/coupons", { replace: true });
      return;
    }
    if (!couponQuery.isError) return;
    if (couponQuery.error instanceof Error && couponQuery.error.message === "NOT_FOUND") {
      toast.error(L("未找到该优惠券，可能已删除", "Coupon not found, it may have been deleted"));
    } else {
      toast.error(toastErrorMessage(couponQuery.error, L("加载优惠券失败", "Failed to load coupon")));
    }
    navigate("/admin/marketing/coupons", { replace: true });
  }, [couponId, couponQuery.error, couponQuery.isError, isEdit, navigate, L]);

  useEffect(() => {
    if (!couponQuery.data) return;
    const coupon = couponQuery.data;
    setForm({
      title: coupon.title || "",
      code: coupon.code || "",
      type: coupon.type || "fixed",
      value: coupon.value?.toString() || "",
      min_amount: coupon.min_amount?.toString() || "",
      start_date: coupon.start_date?.slice(0, 10) || "",
      end_date: coupon.end_date?.slice(0, 10) || "",
      publish_status: (coupon.publish_status === "draft" || coupon.publish_status === "scheduled" ? coupon.publish_status : "active"),
      claim_start_at: coupon.claim_start_at?.slice(0, 10) || coupon.start_date?.slice(0, 10) || "",
      claim_end_at: coupon.claim_end_at?.slice(0, 10) || coupon.end_date?.slice(0, 10) || "",
      use_start_at: coupon.use_start_at?.slice(0, 10) || coupon.start_date?.slice(0, 10) || "",
      use_end_at: coupon.use_end_at?.slice(0, 10) || coupon.end_date?.slice(0, 10) || "",
      validity_mode: coupon.validity_mode || "absolute",
      valid_days_after_claim: coupon.valid_days_after_claim?.toString() || "7",
      description: coupon.description || "",
      scope_type: (coupon.scope_type || "all") as ScopeType,
      category_ids: Array.isArray(coupon.category_ids) ? coupon.category_ids : [],
      display_badge: coupon.display_badge || "",
      total_quantity: coupon.total_quantity?.toString() || "0",
      per_user_limit: coupon.per_user_limit?.toString() || "1",
      new_user_only: !!coupon.new_user_only,
      member_only: !!coupon.member_only,
      auto_issue: !!coupon.auto_issue,
      usable_scope_type: (coupon.usable_scope_type || "all") as UsableScopeType,
      usable_product_ids: Array.isArray(coupon.usable_product_ids) ? coupon.usable_product_ids : [],
      usable_category_ids: Array.isArray(coupon.usable_category_ids) ? coupon.usable_category_ids : [],
      stackable_with_activity: coupon.stackable_with_activity !== false,
    });
    setFormHydrated(true);
  }, [couponQuery.data]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(L("请输入优惠券名称", "Please enter a coupon title"));
      return;
    }
    if (!form.code.trim()) {
      toast.error(L("请输入优惠券编码", "Please enter a coupon code"));
      return;
    }
    if (form.scope_type === "category" && form.category_ids.length === 0) {
      toast.error(L("请选择至少一个适用分类", "Please select at least one applicable category"));
      return;
    }
    if (form.type === "percentage") {
      const percent = parseFloat(form.value);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        toast.error(L("折扣比例需在 0-100 之间", "Discount percentage must be between 0 and 100"));
        return;
      }
    }

    const normalizedUsableCategoryIds = [...new Set(form.usable_category_ids)];
    const normalizedUsableProductIds = [...new Set(form.usable_product_ids)];

    if (form.usable_scope_type === "category" && normalizedUsableCategoryIds.length === 0) {
      toast.error(L("使用范围为指定分类时，请至少选择一个分类", "When usage scope is category, please choose at least one category"));
      return;
    }
    if (form.usable_scope_type === "product" && normalizedUsableProductIds.length === 0) {
      toast.error(L("使用范围为指定商品时，请至少选择一个商品", "When usage scope is product, please choose at least one product"));
      return;
    }

    setSaving(true);
    try {
      const payload: CouponUpsertPayload = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: parseFloat(form.value) || 0,
        min_amount: parseFloat(form.min_amount) || 0,
        start_date: form.start_date || new Date().toISOString().slice(0, 10),
        end_date: form.end_date || "2026-12-31",
        publish_status: form.publish_status,
        claim_start_at: form.claim_start_at ? `${form.claim_start_at} 00:00:00` : undefined,
        claim_end_at: form.claim_end_at ? `${form.claim_end_at} 23:59:59` : undefined,
        use_start_at: form.use_start_at ? `${form.use_start_at} 00:00:00` : undefined,
        use_end_at: form.use_end_at ? `${form.use_end_at} 23:59:59` : undefined,
        validity_mode: form.validity_mode,
        valid_days_after_claim: form.validity_mode === "after_claim" ? Math.max(1, parseInt(form.valid_days_after_claim, 10) || 1) : undefined,
        description: form.description,
        scope_type: form.scope_type,
        category_ids: form.scope_type === "category" ? form.category_ids : [],
        display_badge: form.display_badge,
        total_quantity: Math.max(0, parseInt(form.total_quantity, 10) || 0),
        per_user_limit: Math.max(1, parseInt(form.per_user_limit, 10) || 1),
        new_user_only: form.new_user_only,
        member_only: form.member_only,
        auto_issue: form.auto_issue,
        usable_scope_type: form.usable_scope_type,
        usable_product_ids: form.usable_scope_type === "product" ? normalizedUsableProductIds : [],
        usable_category_ids: form.usable_scope_type === "category" ? normalizedUsableCategoryIds : [],
        stackable_with_activity: form.stackable_with_activity,
      };

      if (isNew) {
        await createCoupon(payload);
        toast.success(L("优惠券模板创建成功", "Coupon template created successfully"));
      } else {
        await updateCoupon(couponId, payload);
        toast.success(L("优惠券模板更新成功", "Coupon template updated successfully"));
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "marketing-dashboard"] });
      markClean();
      navigate("/admin/marketing/coupons");
    } catch (e) {
      toast.error(toastErrorMessage(e, L("保存失败，请重试", "Save failed, please try again")));
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = flattenCategories(categories as Category[]);
  const filteredProducts = products.filter((p: Product) => {
    const keyword = productKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return (p.name || "").toLowerCase().includes(keyword);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UnifiedButton type="button" onClick={goBack} aria-label={L("返回", "Back")}>
          <ArrowLeft size={20} className="text-foreground" />
        </UnifiedButton>
        <h2 className="text-lg font-semibold text-foreground">{isNew ? L("新建优惠券模板", "Create coupon template") : L("编辑优惠券模板", "Edit coupon template")}</h2>
      </div>

      {loading ? (
        <AdminFormSectionsSkeleton sections={3} className="max-w-2xl" />
      ) : (
        <div className="max-w-2xl space-y-6">
          {coreRulesLocked ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">{L("该券已有用户领取，核心规则已锁定", "This coupon has already been claimed, so the core rules are locked")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {L(
                  `已领取 ${claimedCount} 张。适用范围、使用范围、面额、门槛、会员/新用户限制等不可再改；仅可修改名称、说明、角标，或将使用结束时间延长。若要调整规则，请新建一张优惠券。`,
                  `Claimed ${claimedCount}. Scope, usage scope, amount, threshold, member/new-user limits, and similar rules can no longer be changed. You can still edit the title, description, badge, or extend the end time. Create a new coupon if you need new rules.`,
                )}
              </p>
            </div>
          ) : null}

          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">{L("基础信息", "Basic info")}</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("优惠券名称", "Coupon title")}</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("优惠券编码", "Coupon code")}</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm font-mono text-foreground outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("类型", "Type")}</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                  {COUPON_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{L(item.zh, item.en)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {form.type === "percentage" ? L("折扣比例 (%)", "Discount percentage (%)") : L("优惠金额 (RM)", "Discount amount (RM)")}
                </label>
                <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("最低消费门槛 (RM)", "Minimum spend (RM)")}</label>
                <input value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("展示角标", "Badge")}</label>
                <input value={form.display_badge} onChange={(e) => setForm({ ...form, display_badge: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" placeholder={L("如：限时 / 新人专享", "Example: Limited time / New user only")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("总发放量", "Total quantity")}</label>
                <input value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("每人限领", "Limit per user")}</label>
                <input value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("兼容开始日期", "Compatible start date")}</label>
                <SegmentedDateInput id="coupon-start-date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("兼容结束日期", "Compatible end date")}</label>
                <SegmentedDateInput id="coupon-end-date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
              </div>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-3 text-sm font-semibold text-foreground">{L("领取与使用时间", "Claim and usage time")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("领取开始", "Claim start")}</label>
                  <SegmentedDateInput id="coupon-claim-start" value={form.claim_start_at} onChange={(v) => setForm({ ...form, claim_start_at: v })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("领取结束", "Claim end")}</label>
                  <SegmentedDateInput id="coupon-claim-end" value={form.claim_end_at} onChange={(v) => setForm({ ...form, claim_end_at: v })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("使用开始", "Use start")}</label>
                  <SegmentedDateInput id="coupon-use-start" value={form.use_start_at} onChange={(v) => setForm({ ...form, use_start_at: v })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("使用结束", "Use end")}</label>
                  <SegmentedDateInput id="coupon-use-end" value={form.use_end_at} onChange={(v) => setForm({ ...form, use_end_at: v })} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("有效期模式", "Validity mode")}</label>
                  <select value={form.validity_mode} onChange={(e) => setForm({ ...form, validity_mode: e.target.value as ValidityMode })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                    <option value="absolute">{L("固定使用时间", "Fixed usage period")}</option>
                    <option value="after_claim">{L("领取后 N 天", "N days after claim")}</option>
                    <option value="follow_activity">{L("跟随活动有效期", "Follow campaign duration")}</option>
                  </select>
                </div>
                {form.validity_mode === "after_claim" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("领取后有效天数", "Valid days after claim")}</label>
                    <input value={form.valid_days_after_claim} onChange={(e) => setForm({ ...form, valid_days_after_claim: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {L(
                  "领取结束只停止新领取；已领取券是否失效取决于有效期模式和用户券快照。",
                  "Claim end only stops new claims. Whether claimed coupons expire depends on the validity mode and the user's coupon snapshot.",
                )}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("适用范围（发券归属）", "Applicable scope (issuance scope)")}</label>
              <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value as ScopeType })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                <option value="all">{L("全场通用", "All products")}</option>
                <option value="category">{L("指定分类", "Specific categories")}</option>
              </select>
            </div>

            {form.scope_type === "category" ? (
              <div className="grid gap-2 rounded-lg border border-border bg-secondary/40 p-3 sm:grid-cols-2">
                {categoryOptions.map((cat) => {
                  const checked = form.category_ids.includes(cat.id);
                  return (
                    <label key={cat.id} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          category_ids: e.target.checked ? [...prev.category_ids, cat.id] : prev.category_ids.filter((x) => x !== cat.id),
                        }))}
                      />
                      <span>{`${"  ".repeat(cat.level)}${cat.name}`}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("使用范围（结算校验）", "Usage scope (checkout validation)")}</label>
              <select value={form.usable_scope_type} onChange={(e) => setForm({ ...form, usable_scope_type: e.target.value as UsableScopeType })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                <option value="all">{L("全场可用", "All products available")}</option>
                <option value="category">{L("指定分类可用", "Specific categories available")}</option>
                <option value="product">{L("指定商品可用", "Specific products available")}</option>
              </select>
            </div>

            {form.usable_scope_type === "category" ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{L(`已选 ${form.usable_category_ids.length} 项`, `${form.usable_category_ids.length} selected`)}</span>
                  <div className="flex gap-2">
                    <UnifiedButton type="button" className="rounded border border-border px-2 py-1" onClick={() => setForm((prev) => ({ ...prev, usable_category_ids: categoryOptions.map((x) => x.id) }))}>{L("全选", "Select all")}</UnifiedButton>
                    <UnifiedButton type="button" className="rounded border border-border px-2 py-1" onClick={() => setForm((prev) => ({ ...prev, usable_category_ids: [] }))}>{L("清空", "Clear")}</UnifiedButton>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categoryOptions.map((cat) => {
                    const checked = form.usable_category_ids.includes(cat.id);
                    return (
                      <label key={`usable-${cat.id}`} className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            usable_category_ids: e.target.checked ? [...prev.usable_category_ids, cat.id] : prev.usable_category_ids.filter((x) => x !== cat.id),
                          }))}
                        />
                        <span>{`${"  ".repeat(cat.level)}${cat.name}`}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {form.usable_scope_type === "product" ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <AdminSearchInput
                    value={productKeyword}
                    onChange={(value) => {
                      setProductKeyword(value);
                      setProductPage(1);
                    }}
                    className="border-0 bg-card"
                    placeholder={L("搜索商品名", "Search product name")}
                    showIcon={false}
                  />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{L(`已选 ${form.usable_product_ids.length}`, `${form.usable_product_ids.length} selected`)}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <UnifiedButton
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: [...new Set([...prev.usable_product_ids, ...products.map((p) => p.id)])] }))}
                  >
                    {L("本页全选", "Select current page")}
                  </UnifiedButton>
                  <UnifiedButton
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: prev.usable_product_ids.filter((item) => !products.some((p) => p.id === item)) }))}
                  >
                    {L("清空本页", "Clear current page")}
                  </UnifiedButton>
                  <UnifiedButton
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: [] }))}
                  >
                    {L("全部清空", "Clear all")}
                  </UnifiedButton>
                </div>
                <div className="max-h-56 space-y-2 overflow-auto">
                  {productLoading ? <p className="text-xs text-muted-foreground">{L("商品加载中...", "Loading products...")}</p> : null}
                  {filteredProducts.map((product) => {
                    const checked = form.usable_product_ids.includes(product.id);
                    return (
                      <label key={`usable-product-${product.id}`} className="flex items-start gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            usable_product_ids: e.target.checked ? [...prev.usable_product_ids, product.id] : prev.usable_product_ids.filter((item) => item !== product.id),
                          }))}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{product.name}</span>
                          <span className="block text-xs text-muted-foreground">{L(`库存 ${product.stock} · 价格 RM ${product.price}`, `Stock ${product.stock} · Price RM ${product.price}`)}</span>
                        </span>
                      </label>
                    );
                  })}
                  {!productLoading && !filteredProducts.length ? <p className="text-xs text-muted-foreground">{L("未找到匹配商品", "No matching products found")}</p> : null}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{L(`第 ${productPage} 页 · 共 ${Math.max(1, Math.ceil(productTotal / PAGE_SIZE))} 页`, `Page ${productPage} of ${Math.max(1, Math.ceil(productTotal / PAGE_SIZE))}`)}</span>
                  <div className="flex gap-2">
                    <UnifiedButton type="button" disabled={productPage <= 1 || productLoading} className="rounded border border-border px-2 py-1 disabled:opacity-50" onClick={() => setProductPage((p) => Math.max(1, p - 1))}>{L("上一页", "Previous")}</UnifiedButton>
                    <UnifiedButton type="button" disabled={productPage >= Math.max(1, Math.ceil(productTotal / PAGE_SIZE)) || productLoading} className="rounded border border-border px-2 py-1 disabled:opacity-50" onClick={() => setProductPage((p) => p + 1)}>{L("下一页", "Next")}</UnifiedButton>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.new_user_only} onChange={(e) => setForm({ ...form, new_user_only: e.target.checked })} />
                <span>{L("仅新用户可领", "New users only")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.member_only} onChange={(e) => setForm({ ...form, member_only: e.target.checked })} />
                <span>{L("仅会员可用", "Members only")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.auto_issue} onChange={(e) => setForm({ ...form, auto_issue: e.target.checked })} />
                <span>{L("自动发放", "Auto issue")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.stackable_with_activity} onChange={(e) => setForm({ ...form, stackable_with_activity: e.target.checked })} />
                <span>{L("可与活动叠加", "Stackable with campaign")}</span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{L("描述", "Description")}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <PermissionGate permission="coupon.manage">
              <LoadingButton
                type="button"
                variant="gold"
                state={saving ? "loading" : "normal"}
                onClick={() => adminConfirmSave(confirm, isEdit ? L("优惠券修改", "Update coupon") : L("新优惠券", "New coupon"), () => handleSave())}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold"
              >
                {L("保存", "Save")}
              </LoadingButton>
            </PermissionGate>
            <UnifiedButton type="button" onClick={goBack} className="rounded-lg border border-border px-6 py-2.5 text-sm text-muted-foreground">{L("取消", "Cancel")}</UnifiedButton>
          </div>
        </div>
      )}
    </div>
  );
}
