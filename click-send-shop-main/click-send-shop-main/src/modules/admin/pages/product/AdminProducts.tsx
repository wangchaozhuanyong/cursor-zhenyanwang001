import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Pencil } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useAdminProductsStore } from "@/stores/useAdminProductsStore";
import { THEME_BADGE_DANGER, THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { exportProductsCsv, patchProductLifecycle } from "@/services/admin/productService";
import type { ProductStatus } from "@/types/product";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { AnimatedEmptyState } from "@/modules/micro-interactions";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";

function statusMeta(status: string) {
  if (status === "active") return { label: "上架", className: THEME_BADGE_SUCCESS };
  if (status === "draft") return { label: "草稿", className: THEME_BADGE_MUTED };
  return { label: "下架", className: THEME_BADGE_WARNING };
}

function toLifecycle(status: ProductStatus) {
  return status === "active" ? 1 : status === "draft" ? 0 : 2;
}

function money(value: unknown) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function percent(value: unknown) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useAdminProductsStore((s) => s.products);
  const total = useAdminProductsStore((s) => s.total);
  const loading = useAdminProductsStore((s) => s.loading);
  const search = useAdminProductsStore((s) => s.search);
  const selected = useAdminProductsStore((s) => s.selected);
  const setSearch = useAdminProductsStore((s) => s.setSearch);
  const loadProducts = useAdminProductsStore((s) => s.loadProducts);
  const toggleSelect = useAdminProductsStore((s) => s.toggleSelect);
  const togglePageSelection = useAdminProductsStore((s) => s.togglePageSelection);
  const clearSelected = useAdminProductsStore((s) => s.clearSelected);
  const applyStatusToIds = useAdminProductsStore((s) => s.applyStatusToIds);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | ProductStatus>("");
  const [stockFilter, setStockFilter] = useState<"" | "normal" | "low" | "out">("");
  const [costFilter, setCostFilter] = useState<"" | "normal" | "missing">("");
  const [sort, setSort] = useState<"created_desc" | "sales_30d_desc" | "sales_amount_30d_desc" | "gross_profit_30d_desc" | "stock_asc" | "stock_desc" | "margin_asc" | "margin_desc">("created_desc");
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    void loadProducts({
      page,
      pageSize,
      keyword: search.trim() || undefined,
      status: statusFilter || undefined,
      stock_status: stockFilter || undefined,
      cost_status: costFilter || undefined,
      sort,
    });
  }, [costFilter, loadProducts, page, search, sort, statusFilter, stockFilter]);

  const pageIds = useMemo(() => products.map((p) => p.id), [products]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const hasProductFilters = Boolean(search.trim() || statusFilter || stockFilter || costFilter || sort !== "created_desc");

  const productFilterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (search.trim()) chips.push({ key: "search", label: `关键词：${search.trim()}` });
    if (statusFilter) chips.push({ key: "status", label: `状态：${statusFilter === "active" ? "上架" : statusFilter === "draft" ? "草稿" : "下架"}` });
    if (stockFilter) chips.push({ key: "stock", label: `库存：${stockFilter === "out" ? "缺货" : stockFilter === "low" ? "库存预警" : "正常"}` });
    if (costFilter) chips.push({ key: "cost", label: `成本：${costFilter === "missing" ? "缺成本" : "正常"}` });
    if (sort !== "created_desc") chips.push({ key: "sort", label: "已排序" });
    return chips;
  }, [costFilter, search, sort, statusFilter, stockFilter]);

  const productsEmptyGuide = hasProductFilters ? ADMIN_EMPTY_GUIDES.productsFiltered : ADMIN_EMPTY_GUIDES.products;

  const clearProductFilters = () => {
    setSearch("");
    setStatusFilter("");
    setStockFilter("");
    setCostFilter("");
    setSort("created_desc");
    setPage(1);
  };

  const removeProductFilterChip = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "stock") setStockFilter("");
    if (key === "cost") setCostFilter("");
    if (key === "sort") setSort("created_desc");
    setPage(1);
  };

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [page, total]);

  const handleBatchStatus = async (status: ProductStatus) => {
    if (!selected.length) {
      toast.error("请先勾选商品");
      return;
    }
    setBatchUpdating(true);
    try {
      await Promise.all(selected.map((id) => patchProductLifecycle(id, toLifecycle(status))));
      applyStatusToIds(selected, status);
      clearSelected();
      toast.success(status === "active" ? "已批量上架" : "已批量下架");
      await loadProducts({ page, pageSize, keyword: search.trim() || undefined, status: statusFilter || undefined, stock_status: stockFilter || undefined, cost_status: costFilter || undefined, sort });
    } catch (error) {
      toast.error(toastErrorMessage(error, "批量更新状态失败"));
    } finally {
      setBatchUpdating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProductsCsv({ keyword: search || undefined, status: statusFilter || undefined });
      toast.success("导出任务已开始");
    } catch (error) {
      toast.error(toastErrorMessage(error, "导出失败"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          placeholder="搜索商品名称 / 分类"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | ProductStatus); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="">全部状态</option>
            <option value="active">上架</option>
            <option value="draft">草稿</option>
            <option value="inactive">下架</option>
          </select>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as "" | "normal" | "low" | "out"); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="">全部库存</option>
            <option value="normal">库存正常</option>
            <option value="low">库存预警</option>
            <option value="out">缺货</option>
          </select>
          <select value={costFilter} onChange={(e) => { setCostFilter(e.target.value as "" | "normal" | "missing"); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="">全部成本</option>
            <option value="normal">成本正常</option>
            <option value="missing">缺成本</option>
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="created_desc">最新创建</option>
            <option value="sales_30d_desc">近30天销量</option>
            <option value="sales_amount_30d_desc">近30天销售额</option>
            <option value="gross_profit_30d_desc">近30天毛利</option>
            <option value="stock_asc">库存从低到高</option>
            <option value="stock_desc">库存从高到低</option>
            <option value="margin_asc">毛利率从低到高</option>
            <option value="margin_desc">毛利率从高到低</option>
          </select>
          <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-60">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            导出
          </button>
          <button className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary" onClick={() => navigate("/admin/products/new")}>新增商品</button>
        </div>
      </div>

      <AdminFilterSummaryBar chips={productFilterChips} onClearAll={clearProductFilters} onRemove={removeProductFilterChip} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={batchUpdating || selected.length === 0} onClick={() => void handleBatchStatus("active")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">批量上架 ({selected.length})</button>
        <button type="button" disabled={batchUpdating || selected.length === 0} onClick={() => void handleBatchStatus("inactive")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">批量下架 ({selected.length})</button>
      </div>

      {!loading && products.length === 0 ? (
        <AnimatedEmptyState icon={productsEmptyGuide.icon} title={productsEmptyGuide.title} description={productsEmptyGuide.description} action={<AdminEmptyGuideActions guide={productsEmptyGuide} showClearFilters={hasProductFilters} onClearFilters={clearProductFilters} />} />
      ) : null}

      {(loading || products.length > 0) ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /><span>加载中...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={allSelectedOnPage} onChange={() => togglePageSelection(pageIds)} aria-label="全选当前页" /></th>
                    <th className="px-4 py-3">商品</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">售价</th>
                    <th className="px-4 py-3">成本</th>
                    <th className="px-4 py-3">毛利率</th>
                    <th className="px-4 py-3">库存</th>
                    <th className="px-4 py-3">近7天销量</th>
                    <th className="px-4 py-3">近30天销量</th>
                    <th className="px-4 py-3">近30天销售额</th>
                    <th className="px-4 py-3">近30天毛利</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const meta = statusMeta(p.status);
                    const checked = selected.includes(p.id);
                    const missingCost = Number(p.missing_cost_sku_count || 0) > 0;
                    const stockWarning = Number(p.stock_warning_sku_count || 0) > 0;
                    const outOfStock = Number(p.out_of_stock_sku_count || 0) > 0 || Number(p.stock || 0) <= 0;
                    const margin = Number(p.gross_margin_30d || 0);
                    const marginClass = margin < 0 ? THEME_BADGE_DANGER : margin < 15 ? THEME_BADGE_WARNING : THEME_BADGE_SUCCESS;
                    return (
                      <tr key={p.id} className="border-b border-border/70 last:border-b-0">
                        <td className="px-4 py-3"><input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} aria-label={`选择${p.name}`} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.cover_image ? <img src={p.cover_image} alt={p.name} className="h-11 w-11 rounded-lg border border-border object-cover" /> : <div className="h-11 w-11 rounded-lg border border-border bg-secondary" />}
                            <div className="min-w-0"><p className="max-w-[220px] truncate font-medium text-foreground">{p.name}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{p.category_name || "-"}</td>
                        <td className="px-4 py-3 text-foreground">{Number(p.enabled_sku_count || p.sku_count || 0)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{p.min_sku_price !== p.max_sku_price && p.max_sku_price ? `${money(p.min_sku_price)}-${money(p.max_sku_price)}` : money(p.price)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className="font-medium text-foreground">{p.min_cost_price ? money(p.min_cost_price) : "-"}</span>
                            {missingCost ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}>缺成本</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${marginClass}`}>{percent(margin)}</span></td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className="font-medium text-foreground">{Number(p.stock || 0)}</span>
                            {outOfStock ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}>缺货</span> : stockWarning ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}>库存预警</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{Number(p.sales_qty_7d || 0)}</td>
                        <td className="px-4 py-3 text-foreground">{Number(p.sales_qty_30d || 0)}</td>
                        <td className="px-4 py-3 text-foreground">{money(p.sales_amount_30d)}</td>
                        <td className="px-4 py-3 text-foreground">{money(p.gross_profit_30d)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => navigate(`/admin/products/${p.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"><Pencil size={13} />编辑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={() => undefined} />
    </div>
  );
}