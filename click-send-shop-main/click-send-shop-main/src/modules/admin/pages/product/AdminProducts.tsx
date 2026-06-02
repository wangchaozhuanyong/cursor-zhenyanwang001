import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileDown, Loader2, Pencil, PackageSearch, Upload } from "lucide-react";
import { toast } from "sonner";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import type { AdminFilterChip } from "@/components/admin/AdminFilterSummaryBar";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminMfaStepUpPending } from "@/hooks/useAdminMfaStepUpPending";
import { AdminFilterButton, AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import AdminCsvImportDialog from "@/components/admin/AdminCsvImportDialog";
import PermissionGate from "@/components/admin/PermissionGate";
import SafeImage from "@/components/admin/SafeImage";
import { batchUpdateProductStatus, exportProductsCsv, fetchProducts, importProductsCsv } from "@/services/admin/productService";
import { downloadProductCsvTemplate } from "@/utils/productCsvTemplate";
import type { Product, ProductListParams, ProductStatus } from "@/types/product";
import { toastErrorMessage } from "@/utils/errorMessage";
import { THEME_BADGE_DANGER, THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminTableSortHeader from "@/components/admin/AdminTableSortHeader";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  DEFAULT_PRODUCT_LIST_SORT,
  PRODUCT_SORT_LABELS,
  cycleProductColumnSort,
  getProductSortDirection,
  type ProductSortColumn,
} from "@/utils/adminProductSort";
import {
  adminTableClassName,
  adminTdClassName,
  ADMIN_TABLE_NOWRAP_CLASS,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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

function statusMeta(status: ProductStatus | string, tText: (zh: string) => string) {
  if (status === "active") return { label: tText("上架"), className: THEME_BADGE_SUCCESS };
  if (status === "draft") return { label: tText("草稿"), className: THEME_BADGE_MUTED };
  return { label: tText("下架"), className: THEME_BADGE_WARNING };
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
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | ProductStatus>("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("");
  const [costFilter, setCostFilter] = useState<CostFilter>("");
  const [sort, setSort] = useState<SortValue>(DEFAULT_PRODUCT_LIST_SORT);
  const [exportingScope, setExportingScope] = useState<"filtered" | "selected" | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const queryParams = useMemo<ProductListParams>(() => ({
    page,
    pageSize: PAGE_SIZE,
    keyword: search.trim() || undefined,
    status: statusFilter || undefined,
    stock_status: stockFilter || undefined,
    cost_status: costFilter || undefined,
    sort,
  }), [costFilter, page, search, sort, statusFilter, stockFilter]);

  const mfaStepUpPending = useAdminMfaStepUpPending();

  const productsQuery = useQuery({
    queryKey: adminQueryKeys.products(queryParams),
    queryFn: () => fetchProducts(queryParams),
    staleTime: 60_000,
    refetchOnMount: true,
    refetchInterval: mfaStepUpPending ? false : 120_000,
    refetchIntervalInBackground: false,
  });

  const batchStatusMutation = useMutation({
    mutationFn: async (status: ProductStatus) => {
      if (!selected.length) throw new Error(tText("请先勾选商品"));
      return batchUpdateProductStatus(selected, status);
    },
    onSuccess: async (result, status) => {
      const verb =
        status === "active" ? tText("上架") : status === "inactive" ? tText("下架") : tText("设为草稿");
      const parts = [`${tText("已")}${verb} ${result.updated} ${tText("个商品")}`];
      if (result.skipped > 0) {
        parts.push(`${tText("跳过")} ${result.skipped} ${tText("个（不存在或已删除）")}`);
      }
      toast.success(parts.join(tText("，")));
      setSelected([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("批量更新状态失败"))),
  });

  const products = useMemo(() => productsQuery.data?.list || [], [productsQuery.data?.list]);
  const total = productsQuery.data?.total || 0;
  const pageIds = useMemo(() => products.map((product) => product.id), [products]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const hasProductFilters = Boolean(
    search.trim() || statusFilter || stockFilter || costFilter || sort !== DEFAULT_PRODUCT_LIST_SORT,
  );

  const filterChips = useMemo(() => {
    const chips: AdminFilterChip[] = [];
    if (search.trim()) chips.push({ key: "search", label: `${tText("关键词")}：${search.trim()}` });
    if (statusFilter) chips.push({ key: "status", label: `${tText("状态")}：${tText(PRODUCT_STATUS_LABELS[statusFilter])}` });
    if (stockFilter) chips.push({ key: "stock", label: `${tText("库存")}：${tText(STOCK_LABELS[stockFilter])}` });
    if (costFilter) chips.push({ key: "cost", label: `${tText("成本")}：${tText(COST_LABELS[costFilter])}` });
    if (sort !== DEFAULT_PRODUCT_LIST_SORT) {
      chips.push({ key: "sort", label: `${tText("排序")}：${tText(PRODUCT_SORT_LABELS[sort] || sort)}` });
    }
    return chips;
  }, [costFilter, search, sort, statusFilter, stockFilter, tText]);

  const emptyGuide = useLocalizedAdminEmptyGuide(
    hasProductFilters ? ADMIN_EMPTY_GUIDES.productsFiltered : ADMIN_EMPTY_GUIDES.products,
  );

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
    setSort(DEFAULT_PRODUCT_LIST_SORT);
    setPage(1);
  };

  const handleColumnSort = (column: ProductSortColumn) => {
    setSort((current) => cycleProductColumnSort(current, column));
    setPage(1);
  };

  const removeFilterChip = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "stock") setStockFilter("");
    if (key === "cost") setCostFilter("");
    if (key === "sort") setSort(DEFAULT_PRODUCT_LIST_SORT);
    setPage(1);
  };

  const exportFilterParams = useMemo<ProductListParams>(() => ({
    keyword: search.trim() || undefined,
    status: statusFilter || undefined,
    stock_status: stockFilter || undefined,
    cost_status: costFilter || undefined,
    sort: sort !== DEFAULT_PRODUCT_LIST_SORT ? sort : undefined,
  }), [costFilter, search, sort, statusFilter, stockFilter]);

  const handleExportFiltered = async () => {
    setExportingScope("filtered");
    try {
      await exportProductsCsv(exportFilterParams);
      toast.success(tText("已开始下载 CSV"));
    } catch (error) {
      toast.error(toastErrorMessage(error, tText("导出失败")));
    } finally {
      setExportingScope(null);
    }
  };

  const handleExportSelected = async () => {
    if (!selected.length) {
      toast.warning(tText("请先勾选要导出的商品"));
      return;
    }
    setExportingScope("selected");
    try {
      await exportProductsCsv({ ids: selected });
      toast.success(`${tText("已开始导出")} ${selected.length} ${tText("个商品")}`);
    } catch (error) {
      toast.error(toastErrorMessage(error, tText("批量导出失败")));
    } finally {
      setExportingScope(null);
    }
  };

  const handleImportSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
    ]);
    setSelected([]);
  };

  const confirmBatchStatus = (status: ProductStatus) => {
    if (!selected.length) {
      toast.warning(tText("请先勾选商品"));
      return;
    }
    const actionLabel = status === "active" ? tText("批量上架") : status === "inactive" ? tText("批量下架") : tText("批量设为草稿");
    confirm({
      title: actionLabel,
      description: tText(`确定对已选 ${selected.length} 个商品执行「${actionLabel}」吗？该操作会影响前台商品展示状态。`),
      confirmText: actionLabel,
      danger: status === "inactive",
      onConfirm: async () => {
        await batchStatusMutation.mutateAsync(status);
      },
    });
  };

  const renderMobileCard = (product: Product) => {
    const meta = statusMeta(product.status, tText);
    const checked = selected.includes(product.id);
    const missingCost = Number(product.missing_cost_sku_count || 0) > 0;
    const outOfStock = Number(product.out_of_stock_sku_count || 0) > 0 || Number(product.stock || 0) <= 0;
    const margin = Number(product.gross_margin_30d || 0);
    const marginClass = margin < 0 ? THEME_BADGE_DANGER : margin < 15 ? THEME_BADGE_WARNING : THEME_BADGE_SUCCESS;

    return (
      <AdminTableMobileCard>
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleSelect(product.id)}
            aria-label={`选择${product.name}`}
            className="mt-1"
          />
          {product.cover_image ? (
            <SafeImage src={product.cover_image} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-secondary" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.category_name || "-"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("售价")}>
            <span className="font-semibold text-[var(--theme-price)]">{skuPrice(product)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("库存")}>
            <span className="font-medium">{Number(product.stock || 0)}</span>
            {outOfStock ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${THEME_BADGE_DANGER}`}><Tx>缺货</Tx></span> : null}
            {missingCost ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${THEME_BADGE_DANGER}`}><Tx>缺成本</Tx></span> : null}
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("毛利率")}>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${marginClass}`}>{percent(margin)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("近30天")}>
            <span className="text-xs">{Number(product.sales_qty_30d || 0)} 件 · {money(product.sales_amount_30d)}</span>
          </AdminTableMobileCardField>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
          <PermissionGate permission="product.manage">
          <UnifiedButton
            type="button"
            onClick={() => navigate(`/admin/products/${product.id}`)}
            className="touch-manipulation inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-secondary sm:flex-1"
          >
            <Pencil size={13} />
            <Tx>编辑</Tx>
          </UnifiedButton>
          </PermissionGate>
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <PermissionGate permission="product.view" mode="page">
      <AdminPageShell
        hint={<Tx>管理商品上下架、库存与成本，支持导入导出与批量操作。</Tx>}
        toolbar={(
        <div className="flex flex-wrap items-center gap-2">
          <AdminFilterButton onClick={handleExportFiltered} disabled={exportingScope !== null} variant="card" className="gap-1 font-medium disabled:opacity-60">
            {exportingScope === "filtered" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <Tx>导出筛选结果</Tx>
          </AdminFilterButton>
          <PermissionGate permission="product.manage">
            <AdminFilterButton onClick={() => void downloadProductCsvTemplate()} variant="card" className="gap-1 font-medium">
              <FileDown size={14} />
              <Tx>下载模板</Tx>
            </AdminFilterButton>
            <AdminFilterButton onClick={() => setImportOpen(true)} variant="card" className="gap-1 font-medium">
              <Upload size={14} />
              <Tx>批量导入</Tx>
            </AdminFilterButton>
          </PermissionGate>
          <PermissionGate permission="product.manage">
            <AdminFilterButton className="px-4 font-semibold" variant="card" onClick={() => navigate("/admin/products/new")}><Tx>新增商品</Tx></AdminFilterButton>
          </PermissionGate>
          <AdminFilterButton onClick={() => void productsQuery.refetch()} variant="card" className="font-medium"><Tx>刷新</Tx></AdminFilterButton>
        </div>
      )}
      filters={(
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchBar
              placeholder={tText("搜索商品名称 / 分类")}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <AdminFilterSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | ProductStatus); setPage(1); }} variant="card">
                <option value=""><Tx>全部状态</Tx></option>
                <option value="active"><Tx>上架</Tx></option>
                <option value="draft"><Tx>草稿</Tx></option>
                <option value="inactive"><Tx>下架</Tx></option>
              </AdminFilterSelect>
              <AdminFilterSelect value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as StockFilter); setPage(1); }} variant="card">
                <option value=""><Tx>全部库存</Tx></option>
                <option value="normal"><Tx>库存正常</Tx></option>
                <option value="low"><Tx>库存预警</Tx></option>
                <option value="out"><Tx>缺货</Tx></option>
              </AdminFilterSelect>
              <AdminFilterSelect value={costFilter} onChange={(e) => { setCostFilter(e.target.value as CostFilter); setPage(1); }} variant="card">
                <option value=""><Tx>全部成本</Tx></option>
                <option value="normal"><Tx>成本正常</Tx></option>
                <option value="missing"><Tx>缺成本</Tx></option>
              </AdminFilterSelect>
            </div>
          </div>
          <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={removeFilterChip} />
        </div>
      )}
      >

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{tText("已选")} {selected.length} {tText("件")}</span>
        <UnifiedButton
          type="button"
          disabled={selected.length === 0 || exportingScope !== null}
          onClick={handleExportSelected}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60"
        >
          {exportingScope === "selected" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {tText("批量导出")} ({selected.length})
        </UnifiedButton>
        {selected.length > 0 ? (
          <UnifiedButton type="button" onClick={() => setSelected([])} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary">
            <Tx>清空选择</Tx>
          </UnifiedButton>
        ) : null}
        <UnifiedButton type="button" disabled={batchStatusMutation.isPending || selected.length === 0} onClick={() => confirmBatchStatus("active")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">{batchStatusMutation.isPending ? tText("处理中...") : tText("批量上架")} ({selected.length})</UnifiedButton>
        <UnifiedButton type="button" disabled={batchStatusMutation.isPending || selected.length === 0} onClick={() => confirmBatchStatus("inactive")} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60">{batchStatusMutation.isPending ? tText("处理中...") : tText("批量下架")} ({selected.length})</UnifiedButton>
      </div>

      <AdminCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title={tText("批量导入商品")}
        onImport={importProductsCsv}
        extraHints={[
          tText("ERP 格式：同一商品多行，每行一个 SKU（规格名称/SKU编码/售价/库存/成本价）"),
          tText("标签列填中文名，多个用逗号分隔（须在「标签管理」中已存在）"),
          tText("无规格编号时可用 SKU 编码匹配已有 SKU"),
        ]}
        onSuccess={async (result) => {
          toast.success(
            `导入完成：新建 ${result.created} 条，更新 ${result.updated} 条${
              result.sku_rows ? `，同步 ${result.sku_rows} 个 SKU` : ""
            }${result.skipped ? `，跳过 ${result.skipped} 条` : ""}`,
          );
          await handleImportSuccess();
        }}
      />

      <AnimatedTable
        loading={productsQuery.isLoading && !productsQuery.data}
        error={productsQuery.isError && !productsQuery.data}
        errorTitle={tText("商品加载失败")}
        errorDescription={tText("商品接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={() => { void productsQuery.refetch(); }}
        rows={products}
        rowKey={(product) => product.id}
        skeletonRows={8}
        skeletonCols={14}
        emptyIcon={PackageSearch}
        emptyTitle={emptyGuide.title}
        emptyDescription={emptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={emptyGuide} showClearFilters={hasProductFilters} onClearFilters={clearFilters} />}
        className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] theme-shadow overflow-x-auto"
        tableClassName={adminTableClassName("w-full min-w-[1280px] text-left text-sm")}
        theadClassName="border-b border-border text-xs text-muted-foreground"
        thead={(
          <tr>
            <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelectedOnPage} onChange={togglePageSelection} aria-label={tText("全选当前页")} /></th>
            <AdminTableSortHeader
              label={tText("商品")}
              align="left"
              direction={getProductSortDirection(sort, "name")}
              onSort={() => handleColumnSort("name")}
            />
            <AdminTableSortHeader
              label={tText("分类")}
              align="left"
              direction={getProductSortDirection(sort, "category")}
              onSort={() => handleColumnSort("category")}
            />
            <AdminTableSortHeader
              label="SKU"
              align="right"
              direction={getProductSortDirection(sort, "sku")}
              onSort={() => handleColumnSort("sku")}
            />
            <AdminTableSortHeader
              label={tText("售价")}
              align="right"
              direction={getProductSortDirection(sort, "price")}
              onSort={() => handleColumnSort("price")}
            />
            <AdminTableSortHeader
              label={tText("成本")}
              align="right"
              direction={getProductSortDirection(sort, "cost")}
              onSort={() => handleColumnSort("cost")}
            />
            <AdminTableSortHeader
              label={tText("毛利率")}
              align="right"
              direction={getProductSortDirection(sort, "margin")}
              onSort={() => handleColumnSort("margin")}
            />
            <AdminTableSortHeader
              label={tText("库存")}
              align="right"
              direction={getProductSortDirection(sort, "stock")}
              onSort={() => handleColumnSort("stock")}
            />
            <AdminTableSortHeader
              label={tText("近7天销量")}
              align="right"
              direction={getProductSortDirection(sort, "sales_7d")}
              onSort={() => handleColumnSort("sales_7d")}
            />
            <AdminTableSortHeader
              label={tText("近30天销量")}
              align="right"
              direction={getProductSortDirection(sort, "sales_30d")}
              onSort={() => handleColumnSort("sales_30d")}
            />
            <AdminTableSortHeader
              label={tText("近30天销售额")}
              align="right"
              direction={getProductSortDirection(sort, "sales_amount_30d")}
              onSort={() => handleColumnSort("sales_amount_30d")}
            />
            <AdminTableSortHeader
              label={tText("近30天毛利")}
              align="right"
              direction={getProductSortDirection(sort, "gross_profit_30d")}
              onSort={() => handleColumnSort("gross_profit_30d")}
            />
            <AdminTableSortHeader label={tText("状态")} sortable={false} align="center" />
            <AdminTableSortHeader label={tText("操作")} sortable={false} align="right" />
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onPageSizeChange={() => undefined} showPageSizeSelect={false} />}
        renderMobileCard={renderMobileCard}
        renderRow={(product) => {
          const meta = statusMeta(product.status, tText);
          const checked = selected.includes(product.id);
          const missingCost = Number(product.missing_cost_sku_count || 0) > 0;
          const stockWarning = Number(product.stock_warning_sku_count || 0) > 0;
          const outOfStock = Number(product.out_of_stock_sku_count || 0) > 0 || Number(product.stock || 0) <= 0;
          const margin = Number(product.gross_margin_30d || 0);
          const marginClass = margin < 0 ? THEME_BADGE_DANGER : margin < 15 ? THEME_BADGE_WARNING : THEME_BADGE_SUCCESS;

          return (
            <>
              <td className="w-10"><input type="checkbox" checked={checked} onChange={() => toggleSelect(product.id)} aria-label={`选择${product.name}`} /></td>
              <td className={adminTdClassName("max-w-[14rem]", "left")}>
                <div className="flex items-center gap-3">
                  {product.cover_image ? <SafeImage src={product.cover_image} alt={product.name} className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" /> : <div className="h-11 w-11 shrink-0 rounded-lg border border-border bg-secondary" />}
                  <div className="min-w-0">
                    <AdminTableCell value={product.name} fullText={product.name} maxWidth="13.5rem" />
                  </div>
                </div>
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>
                <AdminTableCell
                  value={product.category_name || "-"}
                  fullText={product.category_name || "-"}
                  maxWidth="9rem"
                  muted
                />
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{Number(product.enabled_sku_count || product.sku_count || 0)}</td>
              <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} font-semibold`, "right")}>{skuPrice(product)}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                <div className="inline-flex max-w-full flex-nowrap items-center gap-1.5">
                  <span className="font-medium text-foreground">{product.min_cost_price ? money(product.min_cost_price) : "-"}</span>
                  {missingCost ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}><Tx>缺成本</Tx></span> : null}
                </div>
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${marginClass}`}>{percent(margin)}</span>
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                <div className="inline-flex max-w-full flex-nowrap items-center justify-end gap-1.5">
                  <span className="font-medium text-foreground">{Number(product.stock || 0)}</span>
                  {outOfStock ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_DANGER}`}><Tx>缺货</Tx></span> : stockWarning ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}><Tx>库存预警</Tx></span> : null}
                </div>
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{Number(product.sales_qty_7d || 0)}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{Number(product.sales_qty_30d || 0)}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{money(product.sales_amount_30d)}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{money(product.gross_profit_30d)}</td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
              </td>
              <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                <div className="inline-flex max-w-full flex-nowrap items-center justify-end gap-1.5">
                  <PermissionGate permission="product.manage">
                    <UnifiedButton type="button" onClick={() => navigate(`/admin/products/${product.id}`)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"><Pencil size={13} /><Tx>编辑</Tx></UnifiedButton>
                  </PermissionGate>
                </div>
              </td>
            </>
          );
        }}
      />
      </AdminPageShell>
    </PermissionGate>
  );
}
