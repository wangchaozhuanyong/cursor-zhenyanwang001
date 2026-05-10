import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Loader2, PackagePlus, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import {
  adjustInventoryStock,
  fetchInventoryProducts,
  fetchInventoryRecords,
  updateInventoryWarningThreshold,
} from "@/services/admin/inventoryService";
import type { InventoryChangeType, InventoryProduct, InventoryStockRecord } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";

const CHANGE_LABEL: Record<InventoryChangeType, string> = {
  in: "入库",
  out: "出库",
  adjust: "盘点调整",
  order_deduct: "订单扣减",
  order_release: "订单释放",
};

type AdjustForm = {
  product: InventoryProduct;
  change_type: "in" | "out" | "adjust";
  quantity: string;
  reason: string;
};

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [records, setRecords] = useState<InventoryStockRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<AdjustForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryProducts({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        lowStock,
      });
      setProducts(res.list);
      setTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载库存失败"));
    } finally {
      setLoading(false);
    }
  }, [keyword, lowStock, page, pageSize]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetchInventoryRecords({ page: recordsPage, pageSize: recordsPageSize });
      setRecords(res.list);
      setRecordsTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载库存流水失败"));
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsPage, recordsPageSize]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const lowStockCount = useMemo(() => products.filter((p) => p.low_stock).length, [products]);

  const openAdjust = (product: InventoryProduct, changeType: AdjustForm["change_type"]) => {
    setAdjusting({
      product,
      change_type: changeType,
      quantity: changeType === "adjust" ? String(product.stock) : "",
      reason: "",
    });
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    const qty = Number(adjusting.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error(adjusting.change_type === "adjust" ? "盘点库存必须为正整数或大于 0" : "数量必须为正整数");
      return;
    }
    setSaving(true);
    try {
      await adjustInventoryStock(adjusting.product.id, {
        change_type: adjusting.change_type,
        quantity: qty,
        reason: adjusting.reason.trim(),
      });
      toast.success("库存已更新");
      setAdjusting(null);
      await Promise.all([loadProducts(), loadRecords()]);
    } catch (e) {
      toast.error(toastErrorMessage(e, "库存更新失败"));
    } finally {
      setSaving(false);
    }
  };

  const saveThreshold = async (product: InventoryProduct, raw: string) => {
    const threshold = Number(raw);
    if (!Number.isInteger(threshold) || threshold < 0) {
      toast.error("预警值必须为非负整数");
      return;
    }
    try {
      await updateInventoryWarningThreshold(product.id, threshold);
      toast.success("预警值已保存");
      await loadProducts();
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    }
  };

  return (
    <PermissionGate permission="inventory.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">库存管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              支持入库、出库、盘点调整、低库存预警；订单下单与取消会自动写入库存流水。
            </p>
          </div>
          <button
            type="button"
            onClick={() => Promise.all([loadProducts(), loadRecords()])}
            className="flex w-fit items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
          >
            <RefreshCcw size={15} /> 刷新
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">当前页商品</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{products.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">当前页低库存</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{lowStockCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">流水总数</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{recordsTotal}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索商品名称"
                className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-4 text-sm text-foreground outline-none"
              />
            </div>
            <label className="flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(e) => {
                  setLowStock(e.target.checked);
                  setPage(1);
                }}
                className="accent-gold"
              />
              只看低库存
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">商品</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">库存</th>
                  <th className="px-4 py-3">预警值</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      暂无库存数据
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.cover_image ? (
                            <img src={p.cover_image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                              <PackagePlus size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">ID: {p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category_name || "未分类"}</td>
                      <td className="px-4 py-3">
                        <span className={p.low_stock ? "font-bold text-destructive" : "font-medium text-foreground"}>
                          {p.stock}
                        </span>
                        {p.low_stock && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                            <AlertTriangle size={10} /> 低库存
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          defaultValue={p.stock_warning_threshold}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== p.stock_warning_threshold) saveThreshold(p, e.target.value);
                          }}
                          className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs text-foreground outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.lifecycle_status === 1 ? "上架" : p.lifecycle_status === 0 ? "草稿" : "下架"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openAdjust(p, "in")} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600">
                            入库
                          </button>
                          <button onClick={() => openAdjust(p, "out")} className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-600">
                            出库
                          </button>
                          <button onClick={() => openAdjust(p, "adjust")} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold">
                            盘点
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <History size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">库存流水</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3">商品</th>
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">变化</th>
                  <th className="px-4 py-3">库存</th>
                  <th className="px-4 py-3">原因</th>
                  <th className="px-4 py-3">操作人</th>
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      暂无库存流水
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-foreground">{r.product_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{CHANGE_LABEL[r.change_type]}</td>
                      <td className={`px-4 py-3 font-semibold ${r.quantity_delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {r.quantity_delta > 0 ? "+" : ""}
                        {r.quantity_delta}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.before_stock} → {r.after_stock}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reason || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.operator_name || r.operator_id || "系统"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            total={recordsTotal}
            page={recordsPage}
            pageSize={recordsPageSize}
            onPageChange={setRecordsPage}
            onPageSizeChange={setRecordsPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>

        {adjusting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAdjusting(null)}>
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-foreground">{CHANGE_LABEL[adjusting.change_type]}：{adjusting.product.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">当前库存：{adjusting.product.stock}</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {adjusting.change_type === "adjust" ? "盘点后的实际库存" : "数量"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={adjusting.quantity}
                    onChange={(e) => setAdjusting({ ...adjusting, quantity: e.target.value })}
                    className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">原因 / 备注</label>
                  <textarea
                    rows={3}
                    value={adjusting.reason}
                    onChange={(e) => setAdjusting({ ...adjusting, reason: e.target.value })}
                    placeholder="例如：采购入库、损耗出库、月末盘点"
                    className="w-full resize-none rounded-lg bg-secondary px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setAdjusting(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground">
                  取消
                </button>
                <button disabled={saving} onClick={submitAdjust} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
