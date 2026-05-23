import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Loader2, Package, Plus, RefreshCcw, Search, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import {
  adjustInventorySkuStock,
  assembleInventoryRule,
  batchAdjustInventory,
  batchUpdateInventoryWarningThreshold,
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
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventorySku, InventoryStockRecord } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { THEME_BADGE_SUCCESS, THEME_BADGE_WARNING, THEME_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT, THEME_TEXT_WARNING } from "@/utils/themeVisuals";

const PAGE_SIZE = 20;
const BATCH_MAX = 50;

const EMPTY_BATCH_ADJUST: BatchAdjustForm = {
  change_type: "in",
  quantity: "",
  reason: "",
  remark: "",
  source_no: "",
  cost_price: "",
};

type TabKey = "skus" | "records" | "rules" | "conversions";
type AdjustForm = { sku: InventorySku; change_type: "in" | "out" | "adjust"; quantity: string; reason: string; remark: string; source_no: string; cost_price: string };
type BatchAdjustForm = { change_type: "in" | "out" | "adjust"; quantity: string; reason: string; remark: string; source_no: string; cost_price: string };
type BatchThresholdForm = { threshold: string };
type RuleForm = Partial<InventoryPackRule> & { id?: string };
type ConvertForm = { type: "unpack" | "assemble"; rule: InventoryPackRule; parent_qty: string; remark: string };

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

function skuLabel(sku?: InventorySku | null) {
  if (!sku) return "";
  return `${sku.product_name} / ${sku.variant_title || sku.spec_text || "默认规格"} / ${sku.sku_code || "-"}`;
}

function stockStatusText(sku: InventorySku) {
  if (sku.out_of_stock) return "缺货";
  if (sku.low_stock) return "低库存";
  return "正常";
}

function validateAdjustQuantity(changeType: "in" | "out" | "adjust", qty: number, stock: number) {
  if (!Number.isInteger(qty)) throw new Error("数量必须为整数");
  if (changeType === "adjust" && qty < 0) throw new Error("盘点后的库存必须大于等于 0");
  if (changeType !== "adjust" && qty <= 0) throw new Error("数量必须大于 0");
  if (changeType === "out" && qty > stock) throw new Error("出库数量不能超过当前库存");
}

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("skus");
  const [page, setPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [rulesPage, setRulesPage] = useState(1);
  const [conversionsPage, setConversionsPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [stockStatus, setStockStatus] = useState<"" | "normal" | "low" | "out">("");
  const [changeType, setChangeType] = useState("");
  const [conversionType, setConversionType] = useState("");
  const [adjusting, setAdjusting] = useState<AdjustForm | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [skuCache, setSkuCache] = useState<Record<string, InventorySku>>({});
  const [batchThreshold, setBatchThreshold] = useState<BatchThresholdForm | null>(null);
  const [batchAdjust, setBatchAdjust] = useState<BatchAdjustForm | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm | null>(null);

  const keywordValue = keyword.trim() || undefined;
  const summaryQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "summary"], queryFn: fetchInventorySummary, staleTime: 60_000, refetchInterval: 90_000 });

  const skuParams = useMemo(() => ({ page, pageSize: PAGE_SIZE, keyword: keywordValue, stock_status: stockStatus || undefined }), [keywordValue, page, stockStatus]);
  const recordsParams = useMemo(() => ({ page: recordsPage, pageSize: PAGE_SIZE, keyword: keywordValue, change_type: changeType || undefined }), [changeType, keywordValue, recordsPage]);
  const rulesParams = useMemo(() => ({ page: rulesPage, pageSize: PAGE_SIZE, keyword: keywordValue }), [keywordValue, rulesPage]);
  const conversionsParams = useMemo(() => ({ page: conversionsPage, pageSize: PAGE_SIZE, keyword: keywordValue, type: conversionType || undefined }), [conversionType, conversionsPage, keywordValue]);

  const skusQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "skus", skuParams], queryFn: () => fetchInventorySkus(skuParams), enabled: tab === "skus", staleTime: 60_000, refetchInterval: 90_000 });
  const recordsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "records", recordsParams], queryFn: () => fetchInventoryRecords(recordsParams), enabled: tab === "records", staleTime: 60_000, refetchInterval: 90_000 });
  const rulesQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "rules", rulesParams], queryFn: () => fetchInventoryPackRules(rulesParams), enabled: tab === "rules" || !!ruleForm || !!convertForm, staleTime: 60_000 });
  const conversionsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "conversions", conversionsParams], queryFn: () => fetchInventoryConversions(conversionsParams), enabled: tab === "conversions", staleTime: 60_000, refetchInterval: 90_000 });

  const invalidateInventory = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
    ]);
  };

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjusting) return;
      const qty = Number(adjusting.quantity);
      if (!Number.isInteger(qty)) throw new Error("数量必须为整数");
      if (adjusting.change_type === "adjust" && qty < 0) throw new Error("盘点后的库存必须大于等于 0");
      if (adjusting.change_type !== "adjust" && qty <= 0) throw new Error("数量必须大于 0");
      if (adjusting.change_type === "out" && qty > adjusting.sku.stock) throw new Error("出库数量不能超过当前库存");
      await adjustInventorySkuStock(adjusting.sku.variant_id, {
        change_type: adjusting.change_type,
        quantity: qty,
        reason: adjusting.reason.trim(),
        remark: adjusting.remark.trim() || undefined,
        source_no: adjusting.source_no.trim() || undefined,
        cost_price: adjusting.cost_price ? Number(adjusting.cost_price) : undefined,
      });
    },
    onSuccess: async () => { toast.success("库存已更新"); setAdjusting(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, "库存更新失败")),
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ sku, threshold }: { sku: InventorySku; threshold: number }) => updateInventorySkuWarningThreshold(sku.variant_id, threshold),
    onSuccess: async () => { toast.success("预警值已保存"); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, "保存预警值失败")),
  });

  const batchThresholdMutation = useMutation({
    mutationFn: async () => {
      if (!batchThreshold || selectedVariantIds.length === 0) return;
      if (selectedVariantIds.length > BATCH_MAX) throw new Error(`单次最多处理 ${BATCH_MAX} 个 SKU`);
      const threshold = Number(batchThreshold.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error("预警阈值必须为非负整数");
      return batchUpdateInventoryWarningThreshold(selectedVariantIds, threshold);
    },
    onSuccess: async (result) => {
      toast.success(`已更新 ${result?.updated ?? selectedVariantIds.length} 条预警值`);
      setBatchThreshold(null);
      setSelectedVariantIds([]);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "批量设置预警值失败")),
  });

  const batchAdjustMutation = useMutation({
    mutationFn: async () => {
      if (!batchAdjust || selectedVariantIds.length === 0) return;
      if (selectedVariantIds.length > BATCH_MAX) throw new Error(`单次最多处理 ${BATCH_MAX} 个 SKU`);
      const reason = batchAdjust.reason.trim();
      if (!reason) throw new Error("请填写原因");
      const qty = Number(batchAdjust.quantity);
      const items = selectedVariantIds.map((variantId) => {
        const sku = skuCache[variantId];
        if (!sku) throw new Error("部分 SKU 数据未加载，请刷新后重试");
        validateAdjustQuantity(batchAdjust.change_type, qty, sku.stock);
        return {
          variant_id: variantId,
          change_type: batchAdjust.change_type,
          quantity: qty,
          reason,
          remark: batchAdjust.remark.trim() || undefined,
          source_no: batchAdjust.source_no.trim() || undefined,
          cost_price: batchAdjust.cost_price ? Number(batchAdjust.cost_price) : undefined,
        };
      });
      return batchAdjustInventory(items);
    },
    onSuccess: async (result) => {
      toast.success(`已批量调整 ${result?.updated ?? selectedVariantIds.length} 条库存`);
      setBatchAdjust(null);
      setSelectedVariantIds([]);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "批量库存调整失败，请刷新后核对流水")),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async () => {
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
      if (ruleForm.id) await updateInventoryPackRule(ruleForm.id, payload);
      else await createInventoryPackRule(payload);
    },
    onSuccess: async () => { toast.success(ruleForm?.id ? "规则已更新" : "规则已创建"); setRuleForm(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, "保存规则失败")),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryPackRule(id),
    onSuccess: async () => { toast.success("规则已删除"); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, "删除规则失败")),
  });

  const conversionMutation = useMutation({
    mutationFn: async () => {
      if (!convertForm) return;
      const parentQty = Number(convertForm.parent_qty);
      if (!Number.isInteger(parentQty) || parentQty <= 0) throw new Error("数量必须为大于 0 的整数");
      const payload = { rule_id: convertForm.rule.id, parent_qty: parentQty, remark: convertForm.remark.trim() || undefined };
      if (convertForm.type === "unpack") await unpackInventoryRule(payload);
      else await assembleInventoryRule(payload);
    },
    onSuccess: async () => { toast.success(convertForm?.type === "unpack" ? "拆包完成" : "组装完成"); setConvertForm(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, "操作失败")),
  });

  const summary = summaryQuery.data;
  const skus = skusQuery.data?.list || [];
  const pageVariantIds = useMemo(() => skus.map((sku) => sku.variant_id), [skus]);
  const allSelectedOnPage = pageVariantIds.length > 0 && pageVariantIds.every((id) => selectedVariantIds.includes(id));
  const selectedCount = selectedVariantIds.length;

  useEffect(() => {
    if (!skus.length) return;
    setSkuCache((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const sku of skus) {
        if (next[sku.variant_id] !== sku) {
          next[sku.variant_id] = sku;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [skus]);

  const toggleVariantSelect = (variantId: string) => {
    setSelectedVariantIds((prev) => (prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]));
  };

  const togglePageVariantSelection = () => {
    setSelectedVariantIds((prev) => (
      allSelectedOnPage ? prev.filter((id) => !pageVariantIds.includes(id)) : [...new Set([...prev, ...pageVariantIds])]
    ));
  };

  const selectedSkuPreview = useMemo(
    () => selectedVariantIds.slice(0, 5).map((id) => skuCache[id]).filter(Boolean) as InventorySku[],
    [selectedVariantIds, skuCache],
  );

  const records = recordsQuery.data?.list || [];
  const rules = rulesQuery.data?.list || [];
  const conversions = conversionsQuery.data?.list || [];

  const projectedStock = useMemo(() => {
    if (!adjusting) return 0;
    const qty = Number(adjusting.quantity || 0);
    if (!Number.isFinite(qty)) return adjusting.sku.stock;
    if (adjusting.change_type === "in") return adjusting.sku.stock + Math.max(0, qty);
    if (adjusting.change_type === "out") return adjusting.sku.stock - Math.max(0, qty);
    return Math.max(0, qty);
  }, [adjusting]);

  const renderSkuOptions = (selectedId?: string) => skus.map((sku) => <option key={`${selectedId || ""}-${sku.variant_id}`} value={sku.variant_id}>{skuLabel(sku)}</option>);

  return (
    <PermissionGate permission="inventory.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <AdminPageTitle title="库存中心" hint="按 SKU 管理库存、流水、组装拆包规则和转换单据。" />
          <div className="flex gap-2">
            <button onClick={() => void exportInventorySkusCsv({ keyword, stock_status: stockStatus })} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><Download size={15} />导出库存</button>
            <button onClick={() => void invalidateInventory()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><RefreshCcw size={15} />刷新</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { t: "全部 SKU", v: summary?.total_skus ?? 0 },
            { t: "总库存", v: summary?.total_stock ?? 0 },
            { t: "低库存 SKU", v: summary?.low_stock_skus ?? 0 },
            { t: "缺货 SKU", v: summary?.out_of_stock_skus ?? 0 },
            { t: "今日入库", v: summary?.today_in_qty ?? 0 },
            { t: "今日出库", v: summary?.today_out_qty ?? 0 },
            { t: "今日订单扣减", v: summary?.today_order_deduct_qty ?? 0 },
          ].map((item) => <div key={item.t} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{item.t}</p><p className="mt-1 text-xl font-bold text-foreground">{item.v}</p></div>)}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {([
              ["skus", "SKU 库存"],
              ["records", "库存流水"],
              ["rules", "组装拆包规则"],
              ["conversions", "组装拆包单据"],
            ] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{label}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <div className="relative min-w-[260px] max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); setRecordsPage(1); setRulesPage(1); setConversionsPage(1); }} placeholder="搜索商品、SKU、单据号..." className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-4 text-sm" />
            </div>
            {tab === "skus" ? (
              <>
                <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as typeof stockStatus); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部库存状态</option><option value="normal">正常</option><option value="low">低库存</option><option value="out">缺货</option></select>
                <button type="button" disabled={selectedCount === 0} onClick={() => setBatchThreshold({ threshold: "10" })} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm disabled:opacity-50">批量预警值 ({selectedCount})</button>
                <button type="button" disabled={selectedCount === 0} onClick={() => setBatchAdjust({ ...EMPTY_BATCH_ADJUST })} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm disabled:opacity-50">批量库存调整 ({selectedCount})</button>
                {selectedCount > 0 ? (
                  <button type="button" onClick={() => setSelectedVariantIds([])} className="rounded-lg bg-secondary px-3 py-2.5 text-xs text-muted-foreground">清空选择</button>
                ) : null}
              </>
            ) : null}
            {tab === "records" ? <select value={changeType} onChange={(e) => { setChangeType(e.target.value); setRecordsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部流水类型</option>{Object.entries(CHANGE_LABEL).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select> : null}
            {tab === "conversions" ? <select value={conversionType} onChange={(e) => { setConversionType(e.target.value); setConversionsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value="">全部单据类型</option><option value="unpack">手动拆包</option><option value="assemble">手动组装</option><option value="auto_unpack">自动拆包</option></select> : null}
            {tab === "rules" ? <button onClick={() => setRuleForm({ parent_qty: 1, child_qty: 0, enabled: true, manual_unpack_enabled: true, manual_assemble_enabled: true, auto_unpack_enabled: false })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={15} />新增规则</button> : null}
            {tab === "records" ? <button type="button" onClick={() => void exportInventoryRecordsCsv({ keyword, change_type: changeType })} className="rounded-lg border border-border px-3 py-2.5 text-sm">导出流水</button> : null}
          </div>
        </div>

        {tab === "skus" ? (
          <>
            <AnimatedTable embedded loading={skusQuery.isLoading} rows={skus} rowKey={(sku) => sku.variant_id} skeletonRows={8} skeletonCols={10} tableClassName="w-full min-w-[1260px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={Package} emptyTitle="暂无 SKU 库存" emptyDescription="创建商品规格后会显示库存。" thead={(
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={togglePageVariantSelection} aria-label="全选当前页" />
                </th>
                {["商品", "规格/SKU", "分类", "库存", "单位", "预警值", "状态", "更新时间", "操作"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left">{head}</th>
                ))}
              </tr>
            )}
              renderRow={(sku) => {
                const checked = selectedVariantIds.includes(sku.variant_id);
                return (
                  <>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={checked} onChange={() => toggleVariantSelect(sku.variant_id)} aria-label={`选择 ${sku.product_name}`} />
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {sku.cover_image ? <img src={sku.cover_image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary" />}
                        <AdminTableCellGroup maxWidth="10rem" lines={[{ text: sku.product_name }, { text: sku.sku_code ? `SKU：${sku.sku_code}` : "SKU：未填写", muted: true }]} tooltipLines={[sku.product_name, sku.sku_code ? `SKU：${sku.sku_code}` : "SKU：未填写"]} />
                      </div>
                    </td>
                    <td className="px-4 py-3"><p>{sku.variant_title || sku.spec_text || "默认规格"}</p><p className="text-xs text-muted-foreground">{sku.sku_code || "-"}</p></td>
                    <td className="px-4 py-3 text-muted-foreground">{sku.category_name || "未分类"}</td>
                    <td className="px-4 py-3">
                      <span className={sku.out_of_stock ? `font-bold ${THEME_TEXT_DANGER}` : sku.low_stock ? `font-bold ${THEME_TEXT_WARNING}` : "font-medium"}>{sku.available_stock} {sku.unit_name || "件"}</span>
                      <span className="ml-1 text-xs text-muted-foreground">(总 {sku.stock} {sku.unit_name || "件"})</span>
                    </td>
                    <td className="px-4 py-3">{sku.unit_name || "件"}</td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} defaultValue={sku.stock_warning_threshold} onBlur={(e) => { const threshold = Number(e.target.value); if (Number.isInteger(threshold) && threshold >= 0 && threshold !== sku.stock_warning_threshold) thresholdMutation.mutate({ sku, threshold }); }} className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs" />
                    </td>
                    <td className="px-4 py-3 text-xs">{stockStatusText(sku)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{sku.updated_at ? formatDateTime(sku.updated_at) : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "in", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}>入库</button>
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "out", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}>出库</button>
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "adjust", quantity: String(sku.stock), reason: "", remark: "", source_no: "", cost_price: "" })} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-theme-price">盘点</button>
                      </div>
                    </td>
                  </>
                );
              }}
            />
            <Pagination total={skusQuery.data?.total || 0} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "records" ? (
          <>
            <AnimatedTable embedded loading={recordsQuery.isLoading} rows={records} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1200px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={History} emptyTitle="暂无库存流水" emptyDescription="库存调整、订单扣减、拆包组装会写入流水。" thead={<tr>{["时间", "商品", "规格/SKU", "类型", "变化", "变更前后", "原因", "单据", "操作人"].map((head) => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr>}
              renderRow={(row: InventoryStockRecord) => <><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td><td className="max-w-[10rem] px-4 py-3 align-middle"><AdminTableCell value={row.product_name} maxWidth="9.5rem" /></td><td className="max-w-[9rem] px-4 py-3 align-middle"><AdminTableCell value={`${row.variant_name || "-"} / ${row.sku_code || "-"}`} fullText={`规格：${row.variant_name || "-"}\nSKU：${row.sku_code || "-"}`} maxWidth="8.5rem" muted /></td><td className="px-4 py-3 text-xs">{CHANGE_LABEL[row.change_type] || row.change_type}</td><td className={`px-4 py-3 font-semibold ${row.quantity_delta >= 0 ? THEME_TEXT_SUCCESS_SOFT : THEME_TEXT_DANGER}`}>{row.quantity_delta > 0 ? "+" : ""}{row.quantity_delta}</td><td className="px-4 py-3 text-muted-foreground">{row.before_stock} → {row.after_stock}</td><td className="max-w-[11rem] px-4 py-3 align-middle"><AdminTableCell value={row.reason || row.remark || "-"} fullText={[row.reason, row.remark].filter(Boolean).join("\n") || "-"} maxWidth="10.5rem" muted /></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.order_no || row.source_no || "-"}</td><td className="px-4 py-3 text-muted-foreground">{row.operator_name || "系统"}</td></>}
            />
            <Pagination total={recordsQuery.data?.total || 0} page={recordsPage} pageSize={PAGE_SIZE} onPageChange={setRecordsPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "rules" ? (
          <>
            <AnimatedTable embedded loading={rulesQuery.isLoading} rows={rules} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={8} tableClassName="w-full min-w-[1260px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={SplitSquareHorizontal} emptyTitle="暂无组装拆包规则" emptyDescription="新增规则后可手动拆包、组装，也可支持订单自动拆包。" thead={<tr>{["大包装 SKU", "小包装 SKU", "换算", "当前库存", "自动拆包", "启用", "备注", "操作"].map((head) => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr>}
              renderRow={(row: InventoryPackRule) => <><td className="px-4 py-3"><p>{row.parent_product_name}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name || "默认规格"} / {row.parent_sku_code || "-"}</p></td><td className="px-4 py-3"><p>{row.child_product_name}</p><p className="text-xs text-muted-foreground">{row.child_variant_name || "默认规格"} / {row.child_sku_code || "-"}</p></td><td className="px-4 py-3">{row.parent_qty} {row.parent_unit_name} = {row.child_qty} {row.child_unit_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">大包 {row.parent_stock} / 小包 {row.child_stock}</td><td className="px-4 py-3">{row.auto_unpack_enabled ? "已开启" : "关闭"}</td><td className="px-4 py-3">{row.enabled ? "启用" : "停用"}</td><td className="px-4 py-3 text-muted-foreground">{row.remark || "-"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => setConvertForm({ type: "unpack", rule: row, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs">立即拆包</button><button onClick={() => setConvertForm({ type: "assemble", rule: row, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs">立即组装</button><button onClick={() => setRuleForm(row)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs">编辑</button><button onClick={() => deleteRuleMutation.mutate(row.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">删除</button></div></td></>}
            />
            <Pagination total={rulesQuery.data?.total || 0} page={rulesPage} pageSize={PAGE_SIZE} onPageChange={setRulesPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "conversions" ? (
          <>
            <AnimatedTable embedded loading={conversionsQuery.isLoading} rows={conversions} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1320px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={History} emptyTitle="暂无组装拆包单据" emptyDescription="手动拆包、手动组装和自动拆包都会生成单据。" thead={<tr>{["单据号", "类型", "大包装", "小包装", "数量", "大包装库存", "小包装库存", "来源订单", "时间"].map((head) => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr>}
              renderRow={(row: InventoryConversionOrder) => <><td className="px-4 py-3 font-medium">{row.order_no}</td><td className="px-4 py-3">{CONVERSION_LABEL[row.type] || row.type}</td><td className="px-4 py-3"><p>{row.parent_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name_snapshot || "默认规格"} / {row.parent_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3"><p>{row.child_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.child_variant_name_snapshot || "默认规格"} / {row.child_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3">{row.parent_qty} {row.parent_unit_name_snapshot} → {row.child_total_qty} {row.child_unit_name_snapshot}</td><td className="px-4 py-3">{row.parent_before_stock} → {row.parent_after_stock}</td><td className="px-4 py-3">{row.child_before_stock} → {row.child_after_stock}</td><td className="px-4 py-3 text-muted-foreground">{row.source_order_no || "-"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td></>}
            />
            <Pagination total={conversionsQuery.data?.total || 0} page={conversionsPage} pageSize={PAGE_SIZE} onPageChange={setConversionsPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        <AdminFormSheet
          open={!!batchThreshold}
          onOpenChange={(open) => !open && setBatchThreshold(null)}
          title="批量设置预警值"
          description={`已选 ${selectedCount} 个 SKU（单次最多 ${BATCH_MAX} 个）`}
          submitText="确认"
          loading={batchThresholdMutation.isPending}
          submitDisabled={selectedCount === 0 || selectedCount > BATCH_MAX}
          onSubmit={async () => { await batchThresholdMutation.mutateAsync(); }}
          size="sm"
        >
          {selectedSkuPreview.length > 0 ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {selectedSkuPreview.map((sku) => <li key={sku.variant_id}>{skuLabel(sku)}</li>)}
              {selectedCount > selectedSkuPreview.length ? <li>…等 {selectedCount} 项</li> : null}
            </ul>
          ) : null}
          <input type="number" min={0} value={batchThreshold?.threshold ?? ""} onChange={(e) => setBatchThreshold({ threshold: e.target.value })} placeholder="预警阈值" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
        </AdminFormSheet>

        <AdminFormSheet
          open={!!batchAdjust}
          onOpenChange={(open) => !open && setBatchAdjust(null)}
          title={batchAdjust ? `批量${CHANGE_LABEL[batchAdjust.change_type]}` : "批量调整"}
          description={`已选 ${selectedCount} 个 SKU，将使用相同数量与原因`}
          submitText="确认"
          loading={batchAdjustMutation.isPending}
          submitDisabled={selectedCount === 0 || selectedCount > BATCH_MAX}
          onSubmit={async () => { await batchAdjustMutation.mutateAsync(); }}
          size="sm"
        >
          {batchAdjust ? (
            <div className="space-y-3">
              <select value={batchAdjust.change_type} onChange={(e) => setBatchAdjust({ ...batchAdjust, change_type: e.target.value as BatchAdjustForm["change_type"] })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm">
                <option value="in">入库</option>
                <option value="out">出库</option>
                <option value="adjust">盘点调整</option>
              </select>
              <input type="number" min={batchAdjust.change_type === "adjust" ? 0 : 1} value={batchAdjust.quantity} onChange={(e) => setBatchAdjust({ ...batchAdjust, quantity: e.target.value })} placeholder={batchAdjust.change_type === "adjust" ? "盘点后实际库存" : "数量"} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={batchAdjust.reason} onChange={(e) => setBatchAdjust({ ...batchAdjust, reason: e.target.value })} placeholder="原因（必填）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={batchAdjust.remark} onChange={(e) => setBatchAdjust({ ...batchAdjust, remark: e.target.value })} placeholder="备注（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={batchAdjust.source_no} onChange={(e) => setBatchAdjust({ ...batchAdjust, source_no: e.target.value })} placeholder="来源单号" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input type="number" value={batchAdjust.cost_price} onChange={(e) => setBatchAdjust({ ...batchAdjust, cost_price: e.target.value })} placeholder="成本价" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              </div>
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!adjusting}
          onOpenChange={(open) => !open && setAdjusting(null)}
          title={adjusting ? `${CHANGE_LABEL[adjusting.change_type]}：${adjusting.sku.product_name}` : "库存调整"}
          description={adjusting ? `当前 ${adjusting.sku.stock} ${adjusting.sku.unit_name || "件"}，调整后 ${projectedStock} ${adjusting.sku.unit_name || "件"}` : undefined}
          submitText="确认"
          loading={adjustMutation.isPending}
          onSubmit={async () => { await adjustMutation.mutateAsync(); }}
          size="sm"
        >
          {adjusting ? (
            <div className="space-y-3">
              <input type="number" min={adjusting.change_type === "adjust" ? 0 : 1} value={adjusting.quantity} onChange={(e) => setAdjusting({ ...adjusting, quantity: e.target.value })} placeholder={adjusting.change_type === "adjust" ? "盘点后实际库存" : "数量"} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={adjusting.reason} onChange={(e) => setAdjusting({ ...adjusting, reason: e.target.value })} placeholder="原因（必填）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={adjusting.remark} onChange={(e) => setAdjusting({ ...adjusting, remark: e.target.value })} placeholder="备注（可选）" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={adjusting.source_no} onChange={(e) => setAdjusting({ ...adjusting, source_no: e.target.value })} placeholder="来源单号" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input type="number" value={adjusting.cost_price} onChange={(e) => setAdjusting({ ...adjusting, cost_price: e.target.value })} placeholder="成本价" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              </div>
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!ruleForm}
          onOpenChange={(open) => !open && setRuleForm(null)}
          title={ruleForm?.id ? "编辑组装拆包规则" : "新增组装拆包规则"}
          submitText="保存"
          loading={saveRuleMutation.isPending}
          onSubmit={async () => { await saveRuleMutation.mutateAsync(); }}
          size="lg"
        >
          {ruleForm ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span>大包装 SKU</span><select value={ruleForm.parent_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, parent_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value="">请选择</option>{renderSkuOptions(ruleForm.parent_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span>小包装 SKU</span><select value={ruleForm.child_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, child_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value="">请选择</option>{renderSkuOptions(ruleForm.child_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span>大包装数量</span><input type="number" min={1} value={ruleForm.parent_qty ?? 1} onChange={(e) => setRuleForm({ ...ruleForm, parent_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
                <label className="space-y-1 text-sm"><span>小包装数量</span><input type="number" min={2} value={ruleForm.child_qty ?? ""} onChange={(e) => setRuleForm({ ...ruleForm, child_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                {([["enabled", "启用规则"], ["auto_unpack_enabled", "自动拆包"], ["manual_unpack_enabled", "允许手动拆包"], ["manual_assemble_enabled", "允许手动组装"]] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                    <input type="checkbox" checked={ruleForm[key] !== false && !!ruleForm[key]} onChange={(e) => setRuleForm({ ...ruleForm, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <textarea value={ruleForm.remark || ""} onChange={(e) => setRuleForm({ ...ruleForm, remark: e.target.value })} placeholder="备注" className="min-h-20 w-full rounded-lg bg-secondary px-3 py-2.5 text-sm" />
            </>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!convertForm}
          onOpenChange={(open) => !open && setConvertForm(null)}
          title={convertForm?.type === "unpack" ? "立即拆包" : "立即组装"}
          submitText="确认"
          loading={conversionMutation.isPending}
          onSubmit={async () => { await conversionMutation.mutateAsync(); }}
          size="sm"
        >
          {convertForm ? (
            <>
              <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                <p>规则：{convertForm.rule.parent_qty} {convertForm.rule.parent_unit_name} = {convertForm.rule.child_qty} {convertForm.rule.child_unit_name}</p>
                <p className="mt-1">大包装当前库存：{convertForm.rule.parent_stock}</p>
                <p>小包装当前库存：{convertForm.rule.child_stock}</p>
              </div>
              <input type="number" min={1} value={convertForm.parent_qty} onChange={(e) => setConvertForm({ ...convertForm, parent_qty: e.target.value })} placeholder="大包装数量" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={convertForm.remark} onChange={(e) => setConvertForm({ ...convertForm, remark: e.target.value })} placeholder="备注" className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
            </>
          ) : null}
        </AdminFormSheet>
      </div>
    </PermissionGate>
  );
}
