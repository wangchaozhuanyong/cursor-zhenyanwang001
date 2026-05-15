import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, History, Loader2, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import {
  adjustInventorySkuStock,
  exportInventoryRecordsCsv,
  exportInventorySkusCsv,
  fetchInventoryRecords,
  fetchInventorySkus,
  fetchInventorySummary,
  updateInventorySkuWarningThreshold,
} from "@/services/admin/inventoryService";
import type { InventoryChangeType, InventorySku, InventoryStockRecord, InventorySummary } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";

const CHANGE_LABEL: Record<InventoryChangeType, string> = {
  in: "入库",
  out: "出库",
  adjust: "盘点调整",
  order_deduct: "订单扣减",
  order_release: "订单释放",
};

type AdjustForm = {
  sku: InventorySku;
  change_type: "in" | "out" | "adjust";
  quantity: string;
  reason: string;
  remark: string;
  source_no: string;
  cost_price: string;
};

export default function AdminInventory() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [skus, setSkus] = useState<InventorySku[]>([]);
  const [records, setRecords] = useState<InventoryStockRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [stockStatus, setStockStatus] = useState<"" | "normal" | "low" | "out">("");
  const [changeType, setChangeType] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<AdjustForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchInventorySummary());
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载库存统计失败"));
    }
  }, []);

  const loadSkus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventorySkus({ page, pageSize, keyword: keyword.trim() || undefined, stock_status: stockStatus || undefined });
      setSkus(res.list);
      setTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载SKU库存失败"));
    } finally {
      setLoading(false);
    }
  }, [keyword, stockStatus, page, pageSize]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetchInventoryRecords({ page: recordsPage, pageSize: recordsPageSize, change_type: changeType || undefined, keyword: keyword.trim() || undefined });
      setRecords(res.list);
      setRecordsTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载库存流水失败"));
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsPage, recordsPageSize, changeType, keyword]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadSkus(); }, [loadSkus]);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const openAdjust = (sku: InventorySku, change_type: AdjustForm["change_type"]) => {
    setAdjusting({ sku, change_type, quantity: change_type === "adjust" ? String(sku.stock) : "", reason: "", remark: "", source_no: "", cost_price: "" });
  };

  const projectedStock = useMemo(() => {
    if (!adjusting) return 0;
    const qty = Number(adjusting.quantity || 0);
    if (!Number.isFinite(qty)) return adjusting.sku.stock;
    if (adjusting.change_type === "in") return adjusting.sku.stock + Math.max(0, qty);
    if (adjusting.change_type === "out") return adjusting.sku.stock - Math.max(0, qty);
    return Math.max(0, qty);
  }, [adjusting]);

  const submitAdjust = async () => {
    if (!adjusting) return;
    const qty = Number(adjusting.quantity);
    if (!Number.isInteger(qty)) return toast.error("数量必须为整数");
    if (adjusting.change_type === "adjust" && qty < 0) return toast.error("盘点后的库存必须 >= 0");
    if (adjusting.change_type !== "adjust" && qty <= 0) return toast.error("数量必须 > 0");
    if (adjusting.change_type === "out" && qty > adjusting.sku.stock) return toast.error("出库数量不能超过当前库存");

    setSaving(true);
    try {
      await adjustInventorySkuStock(adjusting.sku.variant_id, {
        change_type: adjusting.change_type,
        quantity: qty,
        reason: adjusting.reason.trim(),
        remark: adjusting.remark.trim() || undefined,
        source_no: adjusting.source_no.trim() || undefined,
        cost_price: adjusting.cost_price ? Number(adjusting.cost_price) : undefined,
      });
      toast.success("库存已更新");
      setAdjusting(null);
      await Promise.all([loadSummary(), loadSkus(), loadRecords()]);
    } catch (e) {
      toast.error(toastErrorMessage(e, "库存更新失败"));
    } finally {
      setSaving(false);
    }
  };

  const saveThreshold = async (sku: InventorySku, raw: string) => {
    const threshold = Number(raw);
    if (!Number.isInteger(threshold) || threshold < 0) return toast.error("预警值必须为非负整数");
    try {
      await updateInventorySkuWarningThreshold(sku.variant_id, threshold);
      toast.success("预警值已保存");
      await Promise.all([loadSummary(), loadSkus()]);
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    }
  };

  return (
    <PermissionGate permission="inventory.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">库存中心</h1>
            <p className="mt-1 text-sm text-muted-foreground">按 SKU 维度管理库存，商品总库存仅作汇总展示。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void exportInventorySkusCsv({ keyword, stock_status: stockStatus })} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><Download size={15} />导出库存</button>
            <button onClick={() => Promise.all([loadSummary(), loadSkus(), loadRecords()])} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><RefreshCcw size={15} />刷新</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[{ t: "全部SKU", v: summary?.total_skus ?? 0 }, { t: "总库存", v: summary?.total_stock ?? 0 }, { t: "低库存SKU", v: summary?.low_stock_skus ?? 0 }, { t: "缺货SKU", v: summary?.out_of_stock_skus ?? 0 }, { t: "今日入库", v: summary?.today_in_qty ?? 0 }, { t: "今日出库", v: summary?.today_out_qty ?? 0 }, { t: "今日订单扣减", v: summary?.today_order_deduct_qty ?? 0 }].map((x) => (
            <div key={x.t} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{x.t}</p><p className="mt-1 text-xl font-bold text-foreground">{x.v}</p></div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="商品名 / SKU" className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-4 text-sm" /></div>
            <div className="flex gap-2">
              <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as typeof stockStatus); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部库存状态</option><option value="normal">正常</option><option value="low">低库存</option><option value="out">缺货</option></select>
              <button onClick={() => { setKeyword(""); setStockStatus(""); setPage(1); }} className="rounded-lg border border-border px-3 py-2.5 text-sm">重置</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">规格/SKU</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">可售库存</th><th className="px-4 py-3">预警值</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">更新时间</th><th className="px-4 py-3 text-right">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : skus.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">暂无SKU库存数据</td></tr> : skus.map((s) => (
                  <tr key={s.variant_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">{s.cover_image ? <img src={s.cover_image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-secondary" />}<div><p className="font-medium">{s.product_name}</p><p className="text-[10px] text-muted-foreground">PID: {s.product_id}</p></div></div></td>
                    <td className="px-4 py-3"><p>{s.variant_title || "默认规格"}</p><p className="text-xs text-muted-foreground">{s.sku_code || "-"}</p></td>
                    <td className="px-4 py-3 text-muted-foreground">{s.category_name || "未分类"}</td>
                    <td className="px-4 py-3"><span className={s.out_of_stock ? "font-bold text-destructive" : s.low_stock ? "font-bold text-orange-600" : "font-medium"}>{s.available_stock}</span><span className="ml-1 text-xs text-muted-foreground">(总:{s.stock})</span></td>
                    <td className="px-4 py-3"><input type="number" min={0} defaultValue={s.stock_warning_threshold} onBlur={(e) => { if (Number(e.target.value) !== s.stock_warning_threshold) void saveThreshold(s, e.target.value); }} className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs" /></td>
                    <td className="px-4 py-3 text-xs">{s.out_of_stock ? "缺货" : s.low_stock ? "低库存" : "正常"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.updated_at ? new Date(s.updated_at).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => openAdjust(s, "in")} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-600">入库</button><button onClick={() => openAdjust(s, "out")} className="rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs text-orange-600">出库</button><button onClick={() => openAdjust(s, "adjust")} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-gold">盘点</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3"><div className="flex items-center gap-2"><History size={16} className="text-muted-foreground" /><h2 className="text-sm font-semibold">库存流水</h2></div><div className="flex items-center gap-2"><select value={changeType} onChange={(e) => { setChangeType(e.target.value); setRecordsPage(1); }} className="rounded-lg bg-secondary px-2 py-1.5 text-xs"><option value="">全部类型</option><option value="in">入库</option><option value="out">出库</option><option value="adjust">盘点</option><option value="order_deduct">订单扣减</option><option value="order_release">订单释放</option></select><button onClick={() => void exportInventoryRecordsCsv({ keyword, change_type: changeType })} className="rounded-lg border border-border px-3 py-1.5 text-xs">导出流水</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-4 py-3">时间</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">规格/SKU</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">变化</th><th className="px-4 py-3">变更前后</th><th className="px-4 py-3">原因</th><th className="px-4 py-3">单据</th><th className="px-4 py-3">操作人</th></tr></thead><tbody>
            {recordsLoading ? <tr><td colSpan={9} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : records.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">暂无库存流水</td></tr> : records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0"><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td><td className="px-4 py-3">{r.product_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.variant_name || "-"} / {r.sku_code || "-"}</td><td className="px-4 py-3 text-xs">{CHANGE_LABEL[r.change_type]}</td><td className={`px-4 py-3 font-semibold ${r.quantity_delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>{r.quantity_delta > 0 ? "+" : ""}{r.quantity_delta}</td><td className="px-4 py-3 text-muted-foreground">{r.before_stock} → {r.after_stock}</td><td className="px-4 py-3 text-muted-foreground">{r.reason || r.remark || "-"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.order_no || r.source_no || "-"}</td><td className="px-4 py-3 text-muted-foreground">{r.operator_name || r.operator_id || "系统"}</td></tr>
            ))}
          </tbody></table></div>
          <Pagination total={recordsTotal} page={recordsPage} pageSize={recordsPageSize} onPageChange={setRecordsPage} onPageSizeChange={setRecordsPageSize} pageSizeOptions={[10, 20, 50]} />
        </div>

        {adjusting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAdjusting(null)}>
            <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold">{CHANGE_LABEL[adjusting.change_type]}：{adjusting.sku.product_name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">SKU：{adjusting.sku.variant_title || "默认规格"} / {adjusting.sku.sku_code || "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">当前库存：{adjusting.sku.stock}，调整后：{projectedStock}</p>
              <div className="mt-4 space-y-3">
                <input type="number" min={adjusting.change_type === "adjust" ? 0 : 1} value={adjusting.quantity} onChange={(e) => setAdjusting({ ...adjusting, quantity: e.target.value })} placeholder={adjusting.change_type === "adjust" ? "盘点后实际库存" : "数量"} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input value={adjusting.reason} onChange={(e) => setAdjusting({ ...adjusting, reason: e.target.value })} placeholder="原因（必填）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input value={adjusting.remark} onChange={(e) => setAdjusting({ ...adjusting, remark: e.target.value })} placeholder="备注（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <div className="grid grid-cols-2 gap-2"><input value={adjusting.source_no} onChange={(e) => setAdjusting({ ...adjusting, source_no: e.target.value })} placeholder="来源单号（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><input type="number" value={adjusting.cost_price} onChange={(e) => setAdjusting({ ...adjusting, cost_price: e.target.value })} placeholder="成本价（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /></div>
              </div>
              <div className="mt-5 flex justify-end gap-2"><button onClick={() => setAdjusting(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm">取消</button><button disabled={saving} onClick={() => void submitAdjust()} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认"}</button></div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}

