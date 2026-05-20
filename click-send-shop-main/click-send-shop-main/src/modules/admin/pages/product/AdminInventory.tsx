import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, History, Loader2, Package, Plus, RefreshCcw, Search, SplitSquareHorizontal } from "lucide-react";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import {
  adjustInventorySkuStock,
  assembleInventoryRule,
  createInventoryPackRule,
  deleteInventoryPackRule,
  exportInventoryRecordsCsv,
  exportInventorySkusCsv,
  fetchInventoryConversions,
  fetchInventoryPackRules,
  fetchInventoryRecords,
  fetchInventorySkus,
  fetchInventorySummary,
  unpackInventoryRule,
  updateInventoryPackRule,
  updateInventorySkuWarningThreshold,
} from "@/services/admin/inventoryService";
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventorySku, InventoryStockRecord, InventorySummary } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";
import { THEME_BADGE_SUCCESS, THEME_BADGE_WARNING, THEME_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT, THEME_TEXT_WARNING } from "@/utils/themeVisuals";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";

const CHANGE_LABEL: Record<InventoryChangeType, string> = {
  in: "入库",
  out: "出库",
  adjust: "盘点调整",
  order_deduct: "订单扣减",
  order_release: "订单释放",
  unpack_parent_out: "拆包-大包装减少",
  unpack_child_in: "拆包-小包装增加",
  assemble_child_out: "组装-小包装减少",
  assemble_parent_in: "组装-大包装增加",
  auto_unpack_parent_out: "自动拆包-大包装减少",
  auto_unpack_child_in: "自动拆包-小包装增加",
};

const CONVERSION_LABEL: Record<string, string> = {
  unpack: "手动拆包",
  assemble: "手动组装",
  auto_unpack: "自动拆包",
};

type TabKey = "skus" | "records" | "rules" | "conversions";
type AdjustForm = { sku: InventorySku; change_type: "in" | "out" | "adjust"; quantity: string; reason: string; remark: string; source_no: string; cost_price: string };
type RuleForm = Partial<InventoryPackRule> & { id?: string; parent_keyword?: string; child_keyword?: string };
type ConvertForm = { type: "unpack" | "assemble"; rule: InventoryPackRule; parent_qty: string; remark: string };

function skuLabel(sku?: InventorySku | null) {
  if (!sku) return "";
  return `${sku.product_name} / ${sku.variant_title || sku.spec_text || "默认规格"} / ${sku.sku_code || "-"}`;
}

export default function AdminInventory() {
  const [tab, setTab] = useState<TabKey>("skus");
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [skus, setSkus] = useState<InventorySku[]>([]);
  const [records, setRecords] = useState<InventoryStockRecord[]>([]);
  const [rules, setRules] = useState<InventoryPackRule[]>([]);
  const [conversions, setConversions] = useState<InventoryConversionOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [rulesTotal, setRulesTotal] = useState(0);
  const [conversionsTotal, setConversionsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [rulesPage, setRulesPage] = useState(1);
  const [conversionsPage, setConversionsPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [stockStatus, setStockStatus] = useState<"" | "normal" | "low" | "out">("");
  const [changeType, setChangeType] = useState("");
  const [conversionType, setConversionType] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<AdjustForm | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm | null>(null);

  const loadSummary = useCallback(async () => {
    setSummary(await fetchInventorySummary());
  }, []);

  const loadSkus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventorySkus({ page, pageSize: 20, keyword: keyword.trim() || undefined, stock_status: stockStatus || undefined });
      setSkus(res.list);
      setTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载 SKU 库存失败"));
    } finally {
      setLoading(false);
    }
  }, [keyword, page, stockStatus]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryRecords({ page: recordsPage, pageSize: 20, keyword: keyword.trim() || undefined, change_type: changeType || undefined });
      setRecords(res.list);
      setRecordsTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载库存流水失败"));
    } finally {
      setLoading(false);
    }
  }, [changeType, keyword, recordsPage]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryPackRules({ page: rulesPage, pageSize: 20, keyword: keyword.trim() || undefined });
      setRules(res.list);
      setRulesTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载组装拆包规则失败"));
    } finally {
      setLoading(false);
    }
  }, [keyword, rulesPage]);

  const loadConversions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryConversions({ page: conversionsPage, pageSize: 20, keyword: keyword.trim() || undefined, type: conversionType || undefined });
      setConversions(res.list);
      setConversionsTotal(res.total);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载组装拆包单据失败"));
    } finally {
      setLoading(false);
    }
  }, [conversionType, conversionsPage, keyword]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { if (tab === "skus") void loadSkus(); }, [loadSkus, tab]);
  useEffect(() => { if (tab === "records") void loadRecords(); }, [loadRecords, tab]);
  useEffect(() => { if (tab === "rules") void loadRules(); }, [loadRules, tab]);
  useEffect(() => { if (tab === "conversions") void loadConversions(); }, [loadConversions, tab]);

  const refreshAll = async () => {
    await Promise.all([loadSummary(), loadSkus(), loadRecords(), loadRules(), loadConversions()]);
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
      await refreshAll();
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

  const submitRule = async () => {
    if (!ruleForm) return;
    const payload = {
      parent_variant_id: ruleForm.parent_variant_id,
      child_variant_id: ruleForm.child_variant_id,
      parent_qty: Number(ruleForm.parent_qty || 1),
      child_qty: Number(ruleForm.child_qty || 0),
      auto_unpack_enabled: !!ruleForm.auto_unpack_enabled,
      manual_unpack_enabled: ruleForm.manual_unpack_enabled !== false,
      manual_assemble_enabled: ruleForm.manual_assemble_enabled !== false,
      enabled: ruleForm.enabled !== false,
      remark: ruleForm.remark || "",
    };
    setSaving(true);
    try {
      if (ruleForm.id) await updateInventoryPackRule(ruleForm.id, payload);
      else await createInventoryPackRule(payload);
      toast.success(ruleForm.id ? "规则已更新" : "规则已创建");
      setRuleForm(null);
      await Promise.all([loadRules(), loadSummary()]);
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存规则失败"));
    } finally {
      setSaving(false);
    }
  };

  const submitConversion = async () => {
    if (!convertForm) return;
    const parentQty = Number(convertForm.parent_qty);
    if (!Number.isInteger(parentQty) || parentQty <= 0) return toast.error("数量必须为大于 0 的整数");
    setSaving(true);
    try {
      const payload = { rule_id: convertForm.rule.id, parent_qty: parentQty, remark: convertForm.remark.trim() || undefined };
      if (convertForm.type === "unpack") await unpackInventoryRule(payload);
      else await assembleInventoryRule(payload);
      toast.success(convertForm.type === "unpack" ? "拆包完成" : "组装完成");
      setConvertForm(null);
      await refreshAll();
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    } finally {
      setSaving(false);
    }
  };

  const renderSkuOptions = (selectedId?: string) => skus.map((sku) => (
    <option key={`${selectedId || ""}-${sku.variant_id}`} value={sku.variant_id}>{skuLabel(sku)}</option>
  ));

  return (
    <PermissionGate permission="inventory.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <AdminPageTitle title="库存中心" hint="按 SKU 管理库存、库存流水、组装拆包规则和拆装单据。" />
          <div className="flex gap-2">
            <button onClick={() => void exportInventorySkusCsv({ keyword, stock_status: stockStatus })} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><Download size={15} />导出库存</button>
            <button onClick={() => void refreshAll()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><RefreshCcw size={15} />刷新</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[{ t: "全部 SKU", v: summary?.total_skus ?? 0 }, { t: "总库存", v: summary?.total_stock ?? 0 }, { t: "低库存 SKU", v: summary?.low_stock_skus ?? 0 }, { t: "缺货 SKU", v: summary?.out_of_stock_skus ?? 0 }, { t: "今日入库", v: summary?.today_in_qty ?? 0 }, { t: "今日出库", v: summary?.today_out_qty ?? 0 }, { t: "今日订单扣减", v: summary?.today_order_deduct_qty ?? 0 }].map((x) => (
            <div key={x.t} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{x.t}</p><p className="mt-1 text-xl font-bold text-foreground">{x.v}</p></div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {[
              ["skus", "SKU库存"],
              ["records", "库存流水"],
              ["rules", "组装拆包规则"],
              ["conversions", "组装拆包单据"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as TabKey)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <div className="relative min-w-[260px] max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); setRecordsPage(1); setRulesPage(1); setConversionsPage(1); }} placeholder="搜索商品、SKU、单据号..." className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-4 text-sm" />
            </div>
            {tab === "skus" && <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as typeof stockStatus); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部库存状态</option><option value="normal">正常</option><option value="low">低库存</option><option value="out">缺货</option></select>}
            {tab === "records" && <select value={changeType} onChange={(e) => { setChangeType(e.target.value); setRecordsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部流水类型</option>{Object.entries(CHANGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
            {tab === "conversions" && <select value={conversionType} onChange={(e) => { setConversionType(e.target.value); setConversionsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部单据类型</option><option value="unpack">手动拆包</option><option value="assemble">手动组装</option><option value="auto_unpack">自动拆包</option></select>}
            {tab === "rules" && <button onClick={() => setRuleForm({ parent_qty: 1, child_qty: 0, enabled: true, manual_unpack_enabled: true, manual_assemble_enabled: true, auto_unpack_enabled: false })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={15} />新增规则</button>}
            {tab === "records" && <button type="button" onClick={() => void exportInventoryRecordsCsv({ keyword, change_type: changeType })} className="rounded-lg border border-border px-3 py-2.5 text-sm">导出流水</button>}
          </div>
        </div>

        {tab === "skus" && (
          <AnimatedTable embedded loading={loading} rows={skus} rowKey={(s) => s.variant_id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1220px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" thead={<tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">规格/SKU</th><th className="px-4 py-3">分类</th><th className="px-4 py-3">库存</th><th className="px-4 py-3">单位</th><th className="px-4 py-3">预警值</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">更新时间</th><th className="px-4 py-3 text-right">操作</th></tr>} emptyIcon={Package} emptyTitle="暂无 SKU 库存" emptyDescription="创建商品规格后会显示库存。"
            renderRow={(s) => (
              <>
                <td className="px-4 py-3"><div className="flex items-center gap-3">{s.cover_image ? <img src={s.cover_image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-secondary" />}<div className="min-w-0"><p className="truncate font-medium">{s.product_name}</p><p className="truncate text-[10px] text-muted-foreground">商品编号：{s.product_id}</p></div></div></td>
                <td className="px-4 py-3"><p>{s.variant_title || s.spec_text || "默认规格"}</p><p className="text-xs text-muted-foreground">{s.sku_code || "-"}</p></td>
                <td className="px-4 py-3 text-muted-foreground">{s.category_name || "未分类"}</td>
                <td className="px-4 py-3"><span className={s.out_of_stock ? `font-bold ${THEME_TEXT_DANGER}` : s.low_stock ? `font-bold ${THEME_TEXT_WARNING}` : "font-medium"}>{s.available_stock} {s.unit_name || "件"}</span><span className="ml-1 text-xs text-muted-foreground">(总 {s.stock} {s.unit_name || "件"})</span></td>
                <td className="px-4 py-3">{s.unit_name || "件"}</td>
                <td className="px-4 py-3"><input type="number" min={0} defaultValue={s.stock_warning_threshold} onBlur={(e) => { if (Number(e.target.value) !== s.stock_warning_threshold) void saveThreshold(s, e.target.value); }} className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs" /></td>
                <td className="px-4 py-3 text-xs">{s.out_of_stock ? "缺货" : s.low_stock ? "低库存" : "正常"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{s.updated_at ? formatDateTime(s.updated_at) : "-"}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => setAdjusting({ sku: s, change_type: "in", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}>入库</button><button type="button" onClick={() => setAdjusting({ sku: s, change_type: "out", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}>出库</button><button type="button" onClick={() => setAdjusting({ sku: s, change_type: "adjust", quantity: String(s.stock), reason: "", remark: "", source_no: "", cost_price: "" })} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-theme-price">盘点</button></div></td>
              </>
            )}
          />
        )}

        {tab === "records" && (
          <AnimatedTable embedded loading={loading} rows={records} rowKey={(r) => r.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1200px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" thead={<tr><th className="px-4 py-3">时间</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">规格/SKU</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">变化</th><th className="px-4 py-3">变更前后</th><th className="px-4 py-3">原因</th><th className="px-4 py-3">单据</th><th className="px-4 py-3">操作人</th></tr>} emptyIcon={History} emptyTitle="暂无库存流水" emptyDescription="库存调整、订单扣减、拆包组装会写入流水。"
            renderRow={(r) => <><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</td><td className="px-4 py-3">{r.product_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.variant_name || "-"} / {r.sku_code || "-"}</td><td className="px-4 py-3 text-xs">{CHANGE_LABEL[r.change_type] || r.change_type}</td><td className={`px-4 py-3 font-semibold ${r.quantity_delta >= 0 ? THEME_TEXT_SUCCESS_SOFT : THEME_TEXT_DANGER}`}>{r.quantity_delta > 0 ? "+" : ""}{r.quantity_delta}</td><td className="px-4 py-3 text-muted-foreground">{r.before_stock} → {r.after_stock}</td><td className="px-4 py-3 text-muted-foreground">{r.reason || r.remark || "-"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.order_no || r.source_no || "-"}</td><td className="px-4 py-3 text-muted-foreground">{r.operator_name || "系统"}</td></>}
          />
        )}

        {tab === "rules" && (
          <AnimatedTable embedded loading={loading} rows={rules} rowKey={(r) => r.id} skeletonRows={8} skeletonCols={8} tableClassName="w-full min-w-[1260px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" thead={<tr><th className="px-4 py-3">大包装 SKU</th><th className="px-4 py-3">小包装 SKU</th><th className="px-4 py-3">换算</th><th className="px-4 py-3">当前库存</th><th className="px-4 py-3">自动拆包</th><th className="px-4 py-3">启用</th><th className="px-4 py-3">备注</th><th className="px-4 py-3 text-right">操作</th></tr>} emptyIcon={SplitSquareHorizontal} emptyTitle="暂无组装拆包规则" emptyDescription="新增规则后可手动拆包、组装，也可支持订单自动拆包。"
            renderRow={(r) => <><td className="px-4 py-3"><p>{r.parent_product_name}</p><p className="text-xs text-muted-foreground">{r.parent_variant_name || "默认规格"} / {r.parent_sku_code || "-"}</p></td><td className="px-4 py-3"><p>{r.child_product_name}</p><p className="text-xs text-muted-foreground">{r.child_variant_name || "默认规格"} / {r.child_sku_code || "-"}</p></td><td className="px-4 py-3">{r.parent_qty} {r.parent_unit_name} = {r.child_qty} {r.child_unit_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">大包 {r.parent_stock} / 小包 {r.child_stock}</td><td className="px-4 py-3">{r.auto_unpack_enabled ? "已开启" : "关闭"}</td><td className="px-4 py-3">{r.enabled ? "启用" : "停用"}</td><td className="px-4 py-3 text-muted-foreground">{r.remark || "-"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => setConvertForm({ type: "unpack", rule: r, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs">立即拆包</button><button onClick={() => setConvertForm({ type: "assemble", rule: r, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs">立即组装</button><button onClick={() => setRuleForm(r)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs">编辑</button><button onClick={() => void deleteInventoryPackRule(r.id).then(() => { toast.success("规则已删除"); return loadRules(); }).catch((e) => toast.error(toastErrorMessage(e, "删除失败")))} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">删除</button></div></td></>}
          />
        )}

        {tab === "conversions" && (
          <AnimatedTable embedded loading={loading} rows={conversions} rowKey={(r) => r.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1320px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" thead={<tr><th className="px-4 py-3">单据号</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">大包装</th><th className="px-4 py-3">小包装</th><th className="px-4 py-3">数量</th><th className="px-4 py-3">大包装库存</th><th className="px-4 py-3">小包装库存</th><th className="px-4 py-3">来源订单</th><th className="px-4 py-3">时间</th></tr>} emptyIcon={History} emptyTitle="暂无组装拆包单据" emptyDescription="手动拆包、手动组装和自动拆包都会生成单据。"
            renderRow={(r) => <><td className="px-4 py-3 font-medium">{r.order_no}</td><td className="px-4 py-3">{CONVERSION_LABEL[r.type] || r.type}</td><td className="px-4 py-3"><p>{r.parent_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{r.parent_variant_name_snapshot || "默认规格"} / {r.parent_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3"><p>{r.child_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{r.child_variant_name_snapshot || "默认规格"} / {r.child_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3">{r.parent_qty} {r.parent_unit_name_snapshot} → {r.child_total_qty} {r.child_unit_name_snapshot}</td><td className="px-4 py-3">{r.parent_before_stock} → {r.parent_after_stock}</td><td className="px-4 py-3">{r.child_before_stock} → {r.child_after_stock}</td><td className="px-4 py-3 text-muted-foreground">{r.source_order_no || "-"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</td></>}
          />
        )}

        {tab === "skus" && (loading || skus.length > 0) && <Pagination total={total} page={page} pageSize={20} onPageChange={setPage} onPageSizeChange={() => undefined} />}
        {tab === "records" && (loading || records.length > 0) && <Pagination total={recordsTotal} page={recordsPage} pageSize={20} onPageChange={setRecordsPage} onPageSizeChange={() => undefined} />}
        {tab === "rules" && (loading || rules.length > 0) && <Pagination total={rulesTotal} page={rulesPage} pageSize={20} onPageChange={setRulesPage} onPageSizeChange={() => undefined} />}
        {tab === "conversions" && (loading || conversions.length > 0) && <Pagination total={conversionsTotal} page={conversionsPage} pageSize={20} onPageChange={setConversionsPage} onPageSizeChange={() => undefined} />}

        {adjusting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAdjusting(null)}>
            <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold">{CHANGE_LABEL[adjusting.change_type]}：{adjusting.sku.product_name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">SKU：{adjusting.sku.variant_title || "默认规格"} / {adjusting.sku.sku_code || "-"}，当前 {adjusting.sku.stock} {adjusting.sku.unit_name || "件"}，调整后 {projectedStock} {adjusting.sku.unit_name || "件"}</p>
              <div className="mt-4 space-y-3"><input type="number" min={adjusting.change_type === "adjust" ? 0 : 1} value={adjusting.quantity} onChange={(e) => setAdjusting({ ...adjusting, quantity: e.target.value })} placeholder={adjusting.change_type === "adjust" ? "盘点后实际库存" : "数量"} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><input value={adjusting.reason} onChange={(e) => setAdjusting({ ...adjusting, reason: e.target.value })} placeholder="原因（必填）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><input value={adjusting.remark} onChange={(e) => setAdjusting({ ...adjusting, remark: e.target.value })} placeholder="备注（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><div className="grid grid-cols-2 gap-2"><input value={adjusting.source_no} onChange={(e) => setAdjusting({ ...adjusting, source_no: e.target.value })} placeholder="来源单号" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><input type="number" value={adjusting.cost_price} onChange={(e) => setAdjusting({ ...adjusting, cost_price: e.target.value })} placeholder="成本价" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /></div></div>
              <div className="mt-5 flex justify-end gap-2"><button onClick={() => setAdjusting(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm">取消</button><LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} loadingText="提交中..." onClick={() => void submitAdjust()} className="rounded-lg px-4 py-2.5 text-sm font-semibold">确认</LoadingButton></div>
            </div>
          </div>
        )}

        {ruleForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRuleForm(null)}>
            <div className="w-full max-w-2xl rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold">{ruleForm.id ? "编辑组装拆包规则" : "新增组装拆包规则"}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span>大包装 SKU</span><select value={ruleForm.parent_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, parent_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value="">请选择</option>{renderSkuOptions(ruleForm.parent_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span>小包装 SKU</span><select value={ruleForm.child_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, child_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value="">请选择</option>{renderSkuOptions(ruleForm.child_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span>大包装数量</span><input type="number" min={1} value={ruleForm.parent_qty ?? 1} onChange={(e) => setRuleForm({ ...ruleForm, parent_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
                <label className="space-y-1 text-sm"><span>小包装数量</span><input type="number" min={2} value={ruleForm.child_qty ?? ""} onChange={(e) => setRuleForm({ ...ruleForm, child_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-4">{[["enabled", "启用规则"], ["auto_unpack_enabled", "自动拆包"], ["manual_unpack_enabled", "允许手动拆包"], ["manual_assemble_enabled", "允许手动组装"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"><input type="checkbox" checked={(ruleForm as Record<string, unknown>)[key] !== false && !!(ruleForm as Record<string, unknown>)[key]} onChange={(e) => setRuleForm({ ...ruleForm, [key]: e.target.checked })} />{label}</label>)}</div>
              <textarea value={ruleForm.remark || ""} onChange={(e) => setRuleForm({ ...ruleForm, remark: e.target.value })} placeholder="备注" className="mt-4 min-h-20 w-full rounded-lg bg-secondary px-3 py-2.5 text-sm" />
              <div className="mt-5 flex justify-end gap-2"><button onClick={() => setRuleForm(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm">取消</button><LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} loadingText="保存中..." onClick={() => void submitRule()} className="rounded-lg px-4 py-2.5 text-sm font-semibold">保存</LoadingButton></div>
            </div>
          </div>
        )}

        {convertForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConvertForm(null)}>
            <div className="w-full max-w-lg rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold">{convertForm.type === "unpack" ? "立即拆包" : "立即组装"}</h3>
              <div className="mt-4 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                <p>规则：{convertForm.rule.parent_qty} {convertForm.rule.parent_unit_name} = {convertForm.rule.child_qty} {convertForm.rule.child_unit_name}</p>
                <p className="mt-1">大包装当前库存：{convertForm.rule.parent_stock} {convertForm.rule.parent_unit_name}</p>
                <p>小包装当前库存：{convertForm.rule.child_stock} {convertForm.rule.child_unit_name}</p>
              </div>
              {(() => {
                const qty = Number(convertForm.parent_qty || 0);
                const childTotal = Math.floor((qty * convertForm.rule.child_qty) / Math.max(1, convertForm.rule.parent_qty));
                const parentAfter = convertForm.type === "unpack" ? convertForm.rule.parent_stock - qty : convertForm.rule.parent_stock + qty;
                const childAfter = convertForm.type === "unpack" ? convertForm.rule.child_stock + childTotal : convertForm.rule.child_stock - childTotal;
                return <div className="mt-3 rounded-xl border border-border p-4 text-sm"><p>{convertForm.type === "unpack" ? "预计增加小包装数量" : "需要扣减小包装数量"}：{childTotal} {convertForm.rule.child_unit_name}</p><p>大包装操作后库存：{parentAfter} {convertForm.rule.parent_unit_name}</p><p>小包装操作后库存：{childAfter} {convertForm.rule.child_unit_name}</p></div>;
              })()}
              <div className="mt-4 space-y-3"><input type="number" min={1} value={convertForm.parent_qty} onChange={(e) => setConvertForm({ ...convertForm, parent_qty: e.target.value })} placeholder="大包装数量" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /><input value={convertForm.remark} onChange={(e) => setConvertForm({ ...convertForm, remark: e.target.value })} placeholder="备注" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" /></div>
              <div className="mt-5 flex justify-end gap-2"><button onClick={() => setConvertForm(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm">取消</button><LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} loadingText="提交中..." onClick={() => void submitConversion()} className="rounded-lg px-4 py-2.5 text-sm font-semibold">确认</LoadingButton></div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
