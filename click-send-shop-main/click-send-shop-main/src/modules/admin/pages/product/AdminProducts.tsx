import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Pencil } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { Tx } from "@/components/admin/AdminText";
import { useAdminProductsStore } from "@/stores/useAdminProductsStore";
import { THEME_BADGE_MUTED, THEME_BADGE_SUCCESS, THEME_BADGE_WARNING } from "@/utils/themeVisuals";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { exportProductsCsv } from "@/services/admin/productService";
import { patchProductLifecycle } from "@/api/admin/product";
import type { ProductStatus } from "@/types/product";

function statusMeta(status: string) {
  if (status === "active") return { label: "上架", className: THEME_BADGE_SUCCESS };
  if (status === "draft") return { label: "草稿", className: THEME_BADGE_MUTED };
  return { label: "下架", className: THEME_BADGE_WARNING };
}

function toLifecycle(status: ProductStatus) {
  return status === "active" ? 1 : status === "draft" ? 0 : 2;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useAdminProductsStore((s) => s.products);
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
  const [newArrivalFilter, setNewArrivalFilter] = useState<"all" | "new" | "not-new">("all");
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const category = String(p.category_id || "").toLowerCase();
      const searchHit = !q || p.name.toLowerCase().includes(q) || category.includes(q);
      const statusHit = !statusFilter || p.status === statusFilter;
      const newArrivalHit =
        newArrivalFilter === "all" ? true : newArrivalFilter === "new" ? !!p.is_new : !p.is_new;
      return searchHit && statusHit && newArrivalHit;
    });
  }, [products, search, statusFilter, newArrivalFilter]);

  const total = filteredProducts.length;

  const pageProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const pageIds = useMemo(() => pageProducts.map((p) => p.id), [pageProducts]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

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
    } catch (error) {
      toast.error(toastErrorMessage(error, "批量更新状态失败"));
      await loadProducts();
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
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | ProductStatus);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
          >
            <option value="">全部状态</option>
            <option value="active">上架</option>
            <option value="draft">草稿</option>
            <option value="inactive">下架</option>
          </select>
          <select
            value={newArrivalFilter}
            onChange={(e) => {
              setNewArrivalFilter(e.target.value as "all" | "new" | "not-new");
              setPage(1);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
          >
            <option value="all">全部商品</option>
            <option value="new">新品商品</option>
            <option value="not-new">非新品商品</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <Tx>导出</Tx>
          </button>
          <button
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            onClick={() => navigate("/admin/products/new")}
          >
            <Tx>新增商品</Tx>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={batchUpdating || selected.length === 0}
          onClick={() => void handleBatchStatus("active")}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60"
        >
          批量上架 ({selected.length})
        </button>
        <button
          type="button"
          disabled={batchUpdating || selected.length === 0}
          onClick={() => void handleBatchStatus("inactive")}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary disabled:opacity-60"
        >
          批量下架 ({selected.length})
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span><Tx>加载中...</Tx></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={() => togglePageSelection(pageIds)}
                      aria-label="全选当前页"
                    />
                  </th>
                  <th className="px-5 py-3"><Tx>商品</Tx></th>
                  <th className="px-5 py-3"><Tx>价格</Tx></th>
                  <th className="px-5 py-3"><Tx>库存</Tx></th>
                  <th className="px-5 py-3"><Tx>新品</Tx></th>
                  <th className="px-5 py-3"><Tx>状态</Tx></th>
                  <th className="px-5 py-3 text-right"><Tx>操作</Tx></th>
                </tr>
              </thead>
              <tbody>
                {pageProducts.map((p) => {
                  const meta = statusMeta(p.status);
                  const checked = selected.includes(p.id);
                  return (
                    <tr key={p.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} aria-label={`选择${p.name}`} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt={p.name} className="h-11 w-11 rounded-lg border border-border object-cover" />
                          ) : (
                            <div className="h-11 w-11 rounded-lg border border-border bg-secondary" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">RM {Number(p.price || 0).toFixed(2)}</td>
                      <td className="px-5 py-3 text-foreground">{Number(p.stock || 0)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${p.is_new ? THEME_BADGE_SUCCESS : THEME_BADGE_MUTED}`}>
                          {p.is_new ? "新品" : "非新品"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/products/${p.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
                        >
                          <Pencil size={13} />
                          <Tx>编辑</Tx>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!pageProducts.length ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={7}>
                      <Tx>暂无商品数据</Tx>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={() => {}} />
    </div>
  );
}
