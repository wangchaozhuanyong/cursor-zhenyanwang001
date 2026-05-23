import { ArrowLeft } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import { AdminFormSectionsSkeleton } from "@/components/admin/AdminLoadingSkeletons";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { createCoupon, updateCoupon, fetchCoupons } from "@/services/admin/couponService";
import * as categoryService from "@/services/admin/categoryService";
import { fetchProducts } from "@/services/admin/productService";
import PermissionGate from "@/components/admin/PermissionGate";
import { useGoBack } from "@/hooks/useGoBack";
import { toastErrorMessage } from "@/utils/errorMessage";
import type { Category } from "@/types/category";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { Tx } from "@/components/admin/AdminText";
import { adminConfirmSave, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { flattenCategories } from "@/utils/categoryTree";
import type { Product } from "@/types/product";
import type { CouponUpsertPayload } from "@/types/coupon";
import { useAdminT } from "@/hooks/useAdminT";

const couponTypes = [
  { value: "fixed", label: "满减券" },
  { value: "percentage", label: "折扣券" },
  { value: "shipping", label: "运费券" },
];

export default function AdminCouponForm() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const navigate = useNavigate();
  const goBack = useGoBack("/admin/marketing/coupons");
  const { id } = useParams();
  const couponId = String(id || "").trim();
  // 静态路由 /coupons/new 无 :id；动态路由 /coupons/:id 可能为字面量 "new"
  const isNew = !couponId || couponId === "new";
  const isEdit = !isNew;

  const [saving, setSaving] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productKeyword, setProductKeyword] = useState("");
  const [form, setForm] = useState({
    title: "",
    code: "",
    type: "fixed" as string,
    value: "",
    min_amount: "",
    start_date: "",
    end_date: "",
    description: "",
    scope_type: "all" as "all" | "category",
    category_ids: [] as string[],
    display_badge: "",
    total_quantity: "",
    per_user_limit: "1",
    new_user_only: false,
    member_only: false,
    auto_issue: false,
    usable_scope_type: "all" as "all" | "category" | "product",
    usable_product_ids: [] as string[],
    usable_category_ids: [] as string[],
    stackable_with_activity: true,
  });

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories(),
    queryFn: categoryService.fetchCategories,
    staleTime: 60_000,
  });

  const categories = categoriesQuery.data ?? [];

  const couponQuery = useQuery({
    queryKey: adminQueryKeys.couponDetail(couponId),
    queryFn: async () => {
      const data = await fetchCoupons({ page: 1, pageSize: 500 });
      const coupon = data.list.find((c) => String(c.id) === couponId);
      if (!coupon) throw new Error("NOT_FOUND");
      return coupon;
    },
    enabled: isEdit && !!couponId,
    staleTime: 60_000,
    retry: false,
  });

  const productQueryParams = useMemo(
    () => ({ page: productPage, pageSize: 50, keyword: productKeyword.trim() || undefined }),
    [productKeyword, productPage],
  );

  const productsQuery = useQuery({
    queryKey: adminQueryKeys.couponFormProducts(productQueryParams),
    queryFn: () => fetchProducts(productQueryParams),
    enabled: form.usable_scope_type === "product",
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const products = productsQuery.data?.list ?? [];
  const productTotal = productsQuery.data?.total ?? 0;
  const productLoading = productsQuery.isLoading && !productsQuery.data;

  const loading = isNew ? false : couponQuery.isLoading && !couponQuery.data;

  useEffect(() => {
    if (!isEdit) return;
    if (!couponId) {
      toast.error(tText("优惠券参数异常，已返回列表"));
      navigate("/admin/marketing/coupons", { replace: true });
      return;
    }
    if (!couponQuery.isError) return;
    if (couponQuery.error instanceof Error && couponQuery.error.message === "NOT_FOUND") {
      toast.error(tText("未找到该优惠券，可能已删除"));
    } else {
      toast.error(toastErrorMessage(couponQuery.error, "加载优惠券失败"));
    }
    navigate("/admin/marketing/coupons", { replace: true });
  }, [couponId, couponQuery.error, couponQuery.isError, isEdit, navigate]);

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
      description: coupon.description || "",
      scope_type: coupon.scope_type || "all",
      category_ids: Array.isArray(coupon.category_ids) ? coupon.category_ids : [],
      display_badge: coupon.display_badge || "",
      total_quantity: coupon.total_quantity?.toString() || "0",
      per_user_limit: coupon.per_user_limit?.toString() || "1",
      new_user_only: !!coupon.new_user_only,
      member_only: !!coupon.member_only,
      auto_issue: !!coupon.auto_issue,
      usable_scope_type: coupon.usable_scope_type || "all",
      usable_product_ids: Array.isArray(coupon.usable_product_ids) ? coupon.usable_product_ids : [],
      usable_category_ids: Array.isArray(coupon.usable_category_ids) ? coupon.usable_category_ids : [],
      stackable_with_activity: coupon.stackable_with_activity !== false,
    });
  }, [couponQuery.data]);

  const handleSave = async () => {
    if (!form.title) { toast.error(tText("请输入优惠券名称")); return; }
    if (!form.code) { toast.error(tText("请输入优惠券编码")); return; }
    if (form.scope_type === "category" && form.category_ids.length === 0) {
      toast.error(tText("请选择至少一个适用分类"));
      return;
    }
    if (form.type === "percentage") {
      const percent = parseFloat(form.value);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        toast.error(tText("折扣比例需在 0-100 之间"));
        return;
      }
    }

    const normalizedUsableCategoryIds = [...new Set(form.usable_category_ids)];
    const normalizedUsableProductIds = [...new Set(form.usable_product_ids)];

    if (form.usable_scope_type === "category" && normalizedUsableCategoryIds.length === 0) {
      toast.error(tText("使用范围为指定分类时，请至少选择一个分类"));
      return;
    }
    if (form.usable_scope_type === "product" && normalizedUsableProductIds.length === 0) {
      toast.error(tText("使用范围为指定商品时，请至少选择一个商品"));
      return;
    }

    setSaving(true);
    try {
      const payload: CouponUpsertPayload = {
        title: form.title,
        code: form.code,
        type: form.type,
        value: parseFloat(form.value) || 0,
        min_amount: parseFloat(form.min_amount) || 0,
        start_date: form.start_date || new Date().toISOString().slice(0, 10),
        end_date: form.end_date || "2026-12-31",
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
        toast.success(tText("优惠券创建成功"));
      } else {
        await updateCoupon(couponId, payload);
        toast.success(tText("优惠券更新成功"));
      }
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponsRoot() });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() });
      navigate("/admin/marketing/coupons");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = flattenCategories(categories);
  const filteredProducts = products.filter((p) => {
    const keyword = productKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return p.name.toLowerCase().includes(keyword);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack}><ArrowLeft size={20} className="text-foreground" /></button>
        <h2 className="text-lg font-semibold text-foreground">{isNew ? "新建优惠券" : "编辑优惠券"}</h2>
      </div>

      {loading ? <AdminFormSectionsSkeleton sections={3} className="max-w-2xl" /> : (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground"><Tx>基础信息</Tx></h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>优惠券名称</Tx></label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>优惠券编码</Tx></label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>类型</Tx></label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                  {couponTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{form.type === "percentage" ? "折扣比例 (%)" : "优惠金额 (RM)"}</label>
                <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>最低消费门槛 (RM)</Tx></label>
                <input value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>展示角标</Tx></label>
                <input value={form.display_badge} onChange={(e) => setForm({ ...form, display_badge: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" placeholder={tText("如：限时 / 新人专享")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>总发放量</Tx></label>
                <input value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>每人限领</Tx></label>
                <input value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>开始日期</Tx></label>
                <SegmentedDateInput id="coupon-start-date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>结束日期</Tx></label>
                <SegmentedDateInput id="coupon-end-date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>适用范围（发券归属）</Tx></label>
              <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value as "all" | "category" })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                <option value="all"><Tx>全场通用</Tx></option>
                <option value="category"><Tx>指定分类</Tx></option>
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
                      <span>{"　".repeat(cat.level)}{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>使用范围（结算校验）</Tx></label>
              <select value={form.usable_scope_type} onChange={(e) => setForm({ ...form, usable_scope_type: e.target.value as "all" | "category" | "product" })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none">
                <option value="all"><Tx>全场可用</Tx></option>
                <option value="category"><Tx>指定分类可用</Tx></option>
                <option value="product"><Tx>指定商品可用</Tx></option>
              </select>
            </div>
            {form.usable_scope_type === "category" ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">已选 {form.usable_category_ids.length} 项</span>
                  <div className="flex gap-2">
                    <button type="button" className="rounded border border-border px-2 py-1" onClick={() => setForm((prev) => ({ ...prev, usable_category_ids: categoryOptions.map((x) => x.id) }))}><Tx>全选</Tx></button>
                    <button type="button" className="rounded border border-border px-2 py-1" onClick={() => setForm((prev) => ({ ...prev, usable_category_ids: [] }))}><Tx>清空</Tx></button>
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
                          usable_category_ids: e.target.checked
                            ? [...prev.usable_category_ids, cat.id]
                            : prev.usable_category_ids.filter((x) => x !== cat.id),
                        }))}
                      />
                      <span>{"　".repeat(cat.level)}{cat.name}</span>
                    </label>
                  );
                })}
                </div>
              </div>
            ) : null}
            {form.usable_scope_type === "product" ? (
              <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={productKeyword}
                    onChange={(e) => {
                      setProductKeyword(e.target.value);
                      setProductPage(1);
                    }}
                    className="w-full rounded-lg bg-card px-3 py-2 text-sm text-foreground outline-none"
                    placeholder={tText("搜索商品名")}
                  />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">已选 {form.usable_product_ids.length}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: [...new Set([...prev.usable_product_ids, ...products.map((p) => p.id)])] }))}
                  >
                    本页全选
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: prev.usable_product_ids.filter((id) => !products.some((p) => p.id === id)) }))}
                  >
                    清空本页
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1"
                    onClick={() => setForm((prev) => ({ ...prev, usable_product_ids: [] }))}
                  >
                    全部清空
                  </button>
                </div>
                <div className="max-h-56 space-y-2 overflow-auto">
                  {productLoading ? <p className="text-xs text-muted-foreground"><Tx>商品加载中...</Tx></p> : null}
                  {filteredProducts.map((p) => {
                    const checked = form.usable_product_ids.includes(p.id);
                    return (
                      <label key={`usable-product-${p.id}`} className="flex items-start gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            usable_product_ids: e.target.checked
                              ? [...prev.usable_product_ids, p.id]
                              : prev.usable_product_ids.filter((x) => x !== p.id),
                          }))}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">库存 {p.stock} · 价格 RM {p.price}</span>
                        </span>
                      </label>
                    );
                  })}
                  {!productLoading && !filteredProducts.length ? <p className="text-xs text-muted-foreground"><Tx>未找到匹配商品</Tx></p> : null}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>第 {productPage} 页 · 共 {Math.max(1, Math.ceil(productTotal / 50))} 页</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={productPage <= 1 || productLoading} className="rounded border border-border px-2 py-1 disabled:opacity-50" onClick={() => setProductPage((p) => Math.max(1, p - 1))}><Tx>上一页</Tx></button>
                    <button type="button" disabled={productPage >= Math.max(1, Math.ceil(productTotal / 50)) || productLoading} className="rounded border border-border px-2 py-1 disabled:opacity-50" onClick={() => setProductPage((p) => p + 1)}><Tx>下一页</Tx></button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.new_user_only} onChange={(e) => setForm({ ...form, new_user_only: e.target.checked })} />
                <span><Tx>仅新用户可领</Tx></span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.member_only} onChange={(e) => setForm({ ...form, member_only: e.target.checked })} />
                <span><Tx>仅会员可用</Tx></span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.auto_issue} onChange={(e) => setForm({ ...form, auto_issue: e.target.checked })} />
                <span><Tx>自动发放</Tx></span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.stackable_with_activity} onChange={(e) => setForm({ ...form, stackable_with_activity: e.target.checked })} />
                <span><Tx>可与活动叠加</Tx></span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>描述</Tx></label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <PermissionGate permission="coupon.manage">
              <LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} onClick={() => adminConfirmSave(confirm, isEdit ? "优惠券修改" : "新优惠券", () => handleSave())} className="rounded-lg px-6 py-2.5 text-sm font-semibold">
                <Tx>保存</Tx>
              </LoadingButton>
            </PermissionGate>
            <button type="button" onClick={goBack} className="rounded-lg border border-border px-6 py-2.5 text-sm text-muted-foreground"><Tx>取消</Tx></button>
          </div>
        </div>
      )}
    </div>
  );
}
