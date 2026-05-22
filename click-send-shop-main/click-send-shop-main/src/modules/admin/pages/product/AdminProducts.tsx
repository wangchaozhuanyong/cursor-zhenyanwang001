import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Pencil, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { exportProductsCsv, fetchProducts, patchProductLifecycle } from "@/services/admin/productService";
import type { Product, ProductListParams, ProductStatus } from "@/types/product";
import { toastErrorMessage } from "@/utils/errorMessage";
import { THEME_BADGE_DANGER, THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";

const PAGE_SIZE = 20;

type StockFilter = "" | "normal" | "low" | "out";
type CostFilter = "" | "normal" | "missing";
type SortValue = NonNullable<ProductListParams["sort"]>;

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: "上架",
  draft: "草稿",
  inactive: "下架",
};

const STOCK_LABELS: Record<Exclude<StockFilter, "">, string> = {
  normal: "库存正常",
  low: "库存预警",
  out: "缺货",
};

const COST_LABELS: Record<Exclude<CostFilter, "">, string> = {
  normal: "成本正常",
  missing: "缺成本",
};

const SORT_LABELS: Record<SortValue, string> = {
  default: "默认排序",
  sales: "销量优先",
  newest: "最新商品",
  "price-asc": "价格从低到高",
  "price-desc": "价格从高到低",
  created_desc: "最新创建",
  sales_30d_desc: "近30天销量",
  sales_amount_30d_desc: "近30天销售额",
  gross_profit_30d_desc: "近30天毛利",
  stock_asc: "库存从低到高",
  stock_desc: "库存从高到低",
  margin_asc: "毛利率从低到高",
  margin_desc: "毛利率从高到低",
};

function statusMeta(status: ProductStatus | string) {
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

function skuPrice(product: Product) {
  if (product.min_sku_price !== product.max_sku_price && product.max_sku_price) {
    return `${money(product.min_sku_price)} - ${money(product.max_sku_price)}`;
  }
  return money(product.price);
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | ProductStatus>("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("");
  const [costFilter, setCostFilter] = useState<CostFilter>("");
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [exporting, setExporting] = useState(false);

  const queryParams = useMemo<ProductListParams>(() => ({
    page,
    pageSize: PAGE_SIZE,
    keyword: search.trim() || undefined,
    status: statusFilter || undefined,
    stock_status: stockFilter || undefined,
    cost_status: costFilter || undefined,
    sort,
  }), [costFilter, page, search, sort, statusFilter, stockFilter]);

  const productsQuery = useQuery({
    queryKey: adminQueryKeys.products(queryParams),
    queryFn: () => fetchProducts(queryParams),
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  const batchStatusMutation = useMutation({
    mutationFn: async (status: ProductStatus) => {
      if (!selected.length) throw new Error("请先勾选商品");
      await Promise.all(selected.map((id) => patchProductLifecycle(id, toLifecycle(status))));
      return status;
    },
    onSuccess: async (status) => {
      toast.success(status === "active" ? "已批量上架" : "已批量下架");
      setSelected([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, "批量更新状态失败")),
  });

  const products = useMemo(() => productsQuery.data?.list || [], [productsQuery.data?.list]);
  const total = productsQuery.data?.total || 0;
  const pageIds = useMemo(() => products.map((product) => product.id), [products]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const hasProductFilters = Boolean(search.trim() || statusFilter || stockFilter || costFilter || sort !== "created_desc");

  const filterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (search.trim()) chips.push({ key: "search", label: `关键词：${search.trim()}` });
    if (statusFilter) chips.push({ key: "status", label: `状态：${PRODUCT_STATUS_LABELS[statusFilter]}` });
    if (stockFilter) chips.push({ key: "stock", label: `库存：${STOCK_LABELS[stockFilter]}` });
    if (costFilter) chips.push({ key: "cost", label: `成本：${COST_LABELS[costFilter]}` });
    if (sort !== "created_desc") chips.push({ key: "sort", label: `排序：${SORT_LABELS[sort] || sort}` });
    return chips;
  }, [costFilter, search, sort, statusFilter, stockFilter]);

  const emptyGuide = hasProductFilters ? ADMIN_EMPTY_GUIDES.productsFiltered : ADMIN_EMPTY_GUIDES.products;

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const togglePageSelection = () => {
    setSelected((prev) => allSelectedOnPage ? prev.filter((id) => !pageIds.includes(id)) : pageIds);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setStockFilter("");
    setCostFilter("");
    setSort("created_desc");
    setPage(1);
  };

  const removeFilterChip = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "stock") setStockFilter("");
    if (key === "cost") setCostFilter("");
    if (key === "sort") setSort("created_desc");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProductsCsv({ keyword: search || undefined, status: statusFilter || undefined });
      toast.success("已开始导出商品 CSV");
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
          onChange={(value) => {
            setSearch(value);
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
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as StockFilter); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="">全部库存</option>
            <option value="normal">库存正常</option>
            <option value="low">库存预警</option>
            <option value="out">缺货</option>
          </select>
          <select value={costFilter} onChange={(e) => { setCostFilter(e.target.value as CostFilter); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <option value="">全部成本</option>
            <option value="normal">成本正常</option>
            <option value="missing">缺成本</option>
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value as SortValue); setPage(1); }} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
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

      <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={removeFilterChip} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={batchStatusMutation.isPending || selected.length === 0} onClick={() => batchStatusMutation.mutate("active")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">批量上架 ({selected.length})</button>
        <button type="button" disabled={batchStatusMutation.isPending || selected.length === 0} onClick={() => batchStatusMutation.mutate("inactive")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">批量下架 ({selected.length})</button>
        <button type="button" onClick={() => void productsQuery.refetch()} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary">刷新</button>
      </div>

      <AnimatedTable
        loading={productsQuery.isLoading}
        rows={products}
        rowKey={(product) => product.id}
        skeletonRows={8}
        skeletonCols={14}
        emptyIcon={PackageSearch}
        emptyTitle={emptyGuide.title}
        emptyDescription={emptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={emptyGuide} showClearFilters={hasProductFilters} onClearFilters={clearFilters} />}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName="w-full min-w-[1320px] text-left text-sm"
        theadClassName="border-b border-border text-xs text-muted-foreground"
        thead={(
          <tr>
            <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelectedOnPage} onChange={togglePageSelection} aria-label="全选当前页" /></th>
            {['商品', '分类', 'SKU', '售价', '成本', '毛利率', '库存', '近7天销量', '近30天销量', '近30天销售额', '近30天毛利', '状态', '操作'].map((head) => (
              <th key={head} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{head}</th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onPageSizeChange={() => undefined} />}
        renderRow={(product) => {
          const meta = statusMeta(product.status);
          const checked = selected.includes(product.id);
          const missingCost = Number(product.missing_cost_sku_count || 0) > 0;
          const stockWarning = Number(product.stock_warning_sku_count || 0) > 0;
          const outOfStock = Number(product.out_of_stock_sku_count || 0) > 0 || Number(product.stock || 0) <= 0;
          const margin = Number(product.gross_margin_30d || 0);
          const marginClass = margin < 0 ? THEME_BADGE_DANGER : margin < 15 ? THEME_BADGE_WARNING : THEME_BADGE_SUCCESS;

          return (
            <>
              <td className="px-4 py-3 w-10"><input type="checkbox" checked={checked} onChange={() => toggleSelect(product.id)} aria-label={`选择${product.name}`} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {product.cover_image ? <img src={product.cover_image} alt={product.name} className="h-11 w-11 rounded-lg border border-border object-cover" /> : <div className="h-11 w-11 rounded-lg border border-border bg-secondary" />}
                  <div className="min-w-0">
                    <AdminTableCell value={product.name} fullText={product.name} maxWidth="13.5rem" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{product.category_name || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{Number(product.enabled_sku_count || product.sku_count || 0)}</td>
              <td className="px-4 py-3 whitespace-nowrap font-semibold">{skuPrice(product)}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <span className="font-medium text-foreground">{product.min_cost_price ? money(product.min_cost_price) : '-'}</span>
                  {missingCost ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}>缺成本</span> : null}
                </div>
              </td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${marginClass}`}>{percent(margin)}</span></td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <span className="font-medium text-foreground">{Number(product.stock || 0)}</span>
                  {outOfStock ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}>缺货</span> : stockWarning ? <span className={`block w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}>库存预警</span> : null}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{Number(product.sales_qty_7d || 0)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{Number(product.sales_qty_30d || 0)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{money(product.sales_amount_30d)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{money(product.gross_profit_30d)}</td>
              <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => navigate(`/admin/products/${product.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"><Pencil size={13} />编辑</button>
              </td>
            </>
          );
        }}
      />
    </div>
  );
}
