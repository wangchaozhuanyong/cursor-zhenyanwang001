import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Loader2, Package, Plus, RefreshCcw, Search, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import Pagination from "@/components/admin/Pagination";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import {
  adjustInventorySkuStock,
  applySmartReplenishmentRun,
  assembleInventoryRule,
  batchAdjustInventory,
  batchUpdateInventoryWarningThreshold,
  createSmartReplenishmentPreview,
  createPurchaseOrderFromAlert,
  createPurchaseOrderFromSmartRun,
  createInventoryPackRule,
  deleteInventoryPackRule,
  executeUnpackForSmartRun,
  exportInventoryRecordsCsv,
  exportInventorySkusCsv,
  fetchReplenishmentProfiles,
  generateDailyInventorySnapshot,
  fetchInventoryConversions,
  fetchInventoryPackRules,
  fetchInventoryRecords,
  fetchInventorySkus,
  fetchInventorySummary,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchReplenishmentAlerts,
  generateReplenishmentAlerts,
  receivePurchaseOrder,
  saveReplenishmentProfiles,
  unpackInventoryRule,
  updateInventoryPackRule,
  updateInventorySkuWarningThreshold,
} from "@/services/admin/inventoryService";
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventoryReplenishmentAlert, InventorySku, InventoryStockRecord, PurchaseOrder, SmartReplenishmentPreviewResult } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { THEME_BADGE_SUCCESS, THEME_BADGE_WARNING, THEME_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT, THEME_TEXT_WARNING } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

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

type TabKey = "skus" | "smart" | "alerts" | "purchaseOrders" | "records" | "rules" | "conversions";
type SmartViewKey = "overview" | "limits" | "suggestions" | "purchase" | "rules";
type AdjustForm = { sku: InventorySku; change_type: "in" | "out" | "adjust"; quantity: string; reason: string; remark: string; source_no: string; cost_price: string };
type BatchAdjustForm = { change_type: "in" | "out" | "adjust"; quantity: string; reason: string; remark: string; source_no: string; cost_price: string };
type BatchThresholdForm = { threshold: string };
type SmartReplenishmentForm = { analysis_days: string; strategy: string; lead_time_days: string; safety_stock_days: string; target_cover_days: string; min_floor_stock: string; purchase_multiple: string };
type SmartEditMap = Record<string, { lower: string; upper: string; qty: string }>;
type RuleForm = Partial<InventoryPackRule> & { id?: string };
type ConvertForm = { type: "unpack" | "assemble"; rule: InventoryPackRule; parent_qty: string; remark: string };
type PurchaseFromAlertForm = { alert: InventoryReplenishmentAlert; ordered_qty: string; unit_cost: string; expected_arrival_date: string; remark: string };
type ReceivePurchaseOrderForm = {
  order: PurchaseOrder;
  remark: string;
  actual_arrival_date: string;
  items: Record<string, { received_qty: string; unit_cost: string }>;
};

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

const ALERT_STATUS_LABEL: Record<string, string> = {
  pending: "待补货",
  suggested: "已生成建议",
  ordered: "已下单",
  in_transit: "已补货待到货",
  partial_received: "部分到货",
  resolved: "已完成",
  cancelled: "已取消",
  overdue: "已延期",
  ignored: "已忽略",
  snoozed: "延后提醒",
};

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  ordered: "已下单",
  in_transit: "在途",
  partial_received: "部分到货",
  received: "已全部到货",
  cancelled: "已取消",
  overdue: "已延期",
};

function skuLabel(sku: InventorySku | null | undefined, tText: (zh: string) => string) {
  if (!sku) return "";
  return `${sku.product_name} / ${sku.variant_title || sku.spec_text || tText("默认规格")} / ${sku.sku_code || "-"}`;
}

function stockStatusText(sku: InventorySku, tText: (zh: string) => string) {
  if (sku.out_of_stock) return tText("缺货");
  if (sku.low_stock) return tText("低库存");
  return tText("正常");
}

function validateAdjustQuantity(
  changeType: "in" | "out" | "adjust",
  qty: number,
  availableStock: number,
  tText: (zh: string) => string,
) {
  if (!Number.isInteger(qty)) throw new Error(tText("数量必须为整数"));
  if (changeType === "adjust" && qty < 0) throw new Error(tText("盘点后的库存必须大于等于 0"));
  if (changeType !== "adjust" && qty <= 0) throw new Error(tText("数量必须大于 0"));
  if (changeType === "out" && qty > availableStock) throw new Error(tText("出库数量不能超过当前可用库存"));
}

type AdminInventoryProps = {
  initialTab?: TabKey;
  pageTitle?: string;
  pageHint?: string;
};

export default function AdminInventory({
  initialTab = "skus",
  pageTitle,
  pageHint,
}: AdminInventoryProps = {}) {
  const { tText } = useAdminT();
  const L = tText;
  const changeLabel = (key: string) => L(CHANGE_LABEL[key as InventoryChangeType] ?? key);
  const conversionLabel = (key: string) => L(CONVERSION_LABEL[key] ?? key);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [page, setPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [rulesPage, setRulesPage] = useState(1);
  const [conversionsPage, setConversionsPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [stockStatus, setStockStatus] = useState<"" | "normal" | "low" | "out">("");
  const [alertStatus, setAlertStatus] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("");
  const [changeType, setChangeType] = useState("");
  const [conversionType, setConversionType] = useState("");
  const [adjusting, setAdjusting] = useState<AdjustForm | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [skuCache, setSkuCache] = useState<Record<string, InventorySku>>({});
  const [batchThreshold, setBatchThreshold] = useState<BatchThresholdForm | null>(null);
  const [batchAdjust, setBatchAdjust] = useState<BatchAdjustForm | null>(null);
  const [smartForm, setSmartForm] = useState<SmartReplenishmentForm>({
    analysis_days: "30",
    strategy: "balanced",
    lead_time_days: "7",
    safety_stock_days: "3",
    target_cover_days: "20",
    min_floor_stock: "0",
    purchase_multiple: "1",
  });
  const [smartPreview, setSmartPreview] = useState<SmartReplenishmentPreviewResult | null>(null);
  const [smartEdits, setSmartEdits] = useState<SmartEditMap>({});
  const [smartView, setSmartView] = useState<SmartViewKey>("overview");
  const [ruleForm, setRuleForm] = useState<RuleForm | null>(null);
  const [ruleSkuKeyword, setRuleSkuKeyword] = useState("");
  const [convertForm, setConvertForm] = useState<ConvertForm | null>(null);
  const [purchaseFromAlert, setPurchaseFromAlert] = useState<PurchaseFromAlertForm | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<ReceivePurchaseOrderForm | null>(null);

  const keywordValue = keyword.trim() || undefined;
  const summaryQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "summary"], queryFn: fetchInventorySummary, staleTime: 60_000, refetchInterval: 90_000 });

  const skuParams = useMemo(() => ({ page, pageSize: PAGE_SIZE, keyword: keywordValue, stock_status: stockStatus || undefined }), [keywordValue, page, stockStatus]);
  const alertParams = useMemo(() => ({ page: alertsPage, pageSize: PAGE_SIZE, keyword: keywordValue, status: alertStatus || undefined }), [alertStatus, alertsPage, keywordValue]);
  const purchaseOrderParams = useMemo(() => ({ page: purchaseOrdersPage, pageSize: PAGE_SIZE, keyword: keywordValue, status: purchaseStatus || undefined }), [keywordValue, purchaseOrdersPage, purchaseStatus]);
  const recordsParams = useMemo(() => ({ page: recordsPage, pageSize: PAGE_SIZE, keyword: keywordValue, change_type: changeType || undefined }), [changeType, keywordValue, recordsPage]);
  const rulesParams = useMemo(() => ({ page: rulesPage, pageSize: PAGE_SIZE, keyword: keywordValue }), [keywordValue, rulesPage]);
  const conversionsParams = useMemo(() => ({ page: conversionsPage, pageSize: PAGE_SIZE, keyword: keywordValue, type: conversionType || undefined }), [conversionType, conversionsPage, keywordValue]);

  const skusQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "skus", skuParams], queryFn: () => fetchInventorySkus(skuParams), enabled: tab === "skus", staleTime: 60_000, refetchInterval: 90_000 });
  const alertsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "replenishment-alerts", alertParams], queryFn: () => fetchReplenishmentAlerts(alertParams), enabled: tab === "alerts", staleTime: 30_000, refetchInterval: 90_000 });
  const purchaseOrdersQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "purchase-orders", purchaseOrderParams], queryFn: () => fetchPurchaseOrders(purchaseOrderParams), enabled: tab === "purchaseOrders", staleTime: 30_000, refetchInterval: 90_000 });
  const receivingOrderDetailQuery = useQuery({
    queryKey: [...adminQueryKeys.inventoryRoot(), "purchase-order", receivingOrder?.order.id],
    queryFn: () => fetchPurchaseOrder(receivingOrder!.order.id),
    enabled: !!receivingOrder,
    staleTime: 0,
  });
  const recordsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "records", recordsParams], queryFn: () => fetchInventoryRecords(recordsParams), enabled: tab === "records", staleTime: 60_000, refetchInterval: 90_000 });
  const rulesQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "rules", rulesParams], queryFn: () => fetchInventoryPackRules(rulesParams), enabled: tab === "rules" || !!ruleForm || !!convertForm, staleTime: 60_000 });
  const conversionsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "conversions", conversionsParams], queryFn: () => fetchInventoryConversions(conversionsParams), enabled: tab === "conversions", staleTime: 60_000, refetchInterval: 90_000 });
  const ruleSkuSearchQuery = useQuery({
    queryKey: [...adminQueryKeys.inventoryRoot(), "rule-sku-search", ruleSkuKeyword.trim()],
    queryFn: () => fetchInventorySkus({ page: 1, pageSize: 100, keyword: ruleSkuKeyword.trim() || undefined }),
    enabled: !!ruleForm,
    staleTime: 30_000,
  });

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
      validateAdjustQuantity(adjusting.change_type, qty, adjusting.sku.available_stock ?? adjusting.sku.stock, L);
      await adjustInventorySkuStock(adjusting.sku.variant_id, {
        change_type: adjusting.change_type,
        quantity: qty,
        reason: adjusting.reason.trim(),
        remark: adjusting.remark.trim() || undefined,
        source_no: adjusting.source_no.trim() || undefined,
        cost_price: adjusting.cost_price ? Number(adjusting.cost_price) : undefined,
      });
    },
    onSuccess: async () => { toast.success(tText("库存已更新")); setAdjusting(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, L("库存更新失败"))),
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ sku, threshold }: { sku: InventorySku; threshold: number }) => updateInventorySkuWarningThreshold(sku.variant_id, threshold),
    onSuccess: async () => { toast.success(tText("预警值已保存")); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, L("保存预警值失败"))),
  });

  const batchThresholdMutation = useMutation({
    mutationFn: async () => {
      if (!batchThreshold || selectedVariantIds.length === 0) return;
      if (selectedVariantIds.length > BATCH_MAX) throw new Error(L(`单次最多处理 ${BATCH_MAX} 个 SKU`));
      const threshold = Number(batchThreshold.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error(L("预警阈值必须为非负整数"));
      return batchUpdateInventoryWarningThreshold(selectedVariantIds, threshold);
    },
    onSuccess: async (result) => {
      toast.success(`${L("已更新")} ${result?.updated ?? selectedVariantIds.length} ${L("条预警值")}`);
      setBatchThreshold(null);
      setSelectedVariantIds([]);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("批量设置预警值失败"))),
  });

  const batchAdjustMutation = useMutation({
    mutationFn: async () => {
      if (!batchAdjust || selectedVariantIds.length === 0) return;
      if (selectedVariantIds.length > BATCH_MAX) throw new Error(L(`单次最多处理 ${BATCH_MAX} 个 SKU`));
      const reason = batchAdjust.reason.trim();
      if (!reason) throw new Error(L("请填写原因"));
      const qty = Number(batchAdjust.quantity);
      const items = selectedVariantIds.map((variantId) => {
        const sku = skuCache[variantId];
        if (!sku) throw new Error(L("部分 SKU 数据未加载，请刷新后重试"));
        validateAdjustQuantity(batchAdjust.change_type, qty, sku.available_stock ?? sku.stock, L);
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
      toast.success(`${L("已批量调整")} ${result?.updated ?? selectedVariantIds.length} ${L("条库存")}`);
      setBatchAdjust(null);
      setSelectedVariantIds([]);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("批量库存调整失败，请刷新后核对流水"))),
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
    onSuccess: async () => { toast.success(ruleForm?.id ? L("规则已更新") : L("规则已创建")); setRuleForm(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, L("保存规则失败"))),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryPackRule(id),
    onSuccess: async () => { toast.success(tText("规则已删除")); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, L("删除规则失败"))),
  });

  const conversionMutation = useMutation({
    mutationFn: async () => {
      if (!convertForm) return;
      const parentQty = Number(convertForm.parent_qty);
      if (!Number.isInteger(parentQty) || parentQty <= 0) throw new Error(L("数量必须为大于 0 的整数"));
      const payload = { rule_id: convertForm.rule.id, parent_qty: parentQty, remark: convertForm.remark.trim() || undefined };
      if (convertForm.type === "unpack") await unpackInventoryRule(payload);
      else await assembleInventoryRule(payload);
    },
    onSuccess: async () => { toast.success(convertForm?.type === "unpack" ? L("拆包完成") : L("组装完成")); setConvertForm(null); await invalidateInventory(); },
    onError: (error) => toast.error(toastErrorMessage(error, L("操作失败"))),
  });

  const generateAlertsMutation = useMutation({
    mutationFn: generateReplenishmentAlerts,
    onSuccess: async (result) => {
      toast.success(`${L("已扫描")} ${result.scanned} ${L("个 SKU，新增")} ${result.created} ${L("条，更新")} ${result.updated} ${L("条预警")}`);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("生成补货预警失败"))),
  });

  const smartPreviewMutation = useMutation({
    mutationFn: async () => createSmartReplenishmentPreview({
      variant_ids: selectedVariantIds.length > 0 ? selectedVariantIds : undefined,
      analysis_days: Number(smartForm.analysis_days) || 30,
      strategy: smartForm.strategy || "balanced",
      lead_time_days: Number(smartForm.lead_time_days) || 7,
      safety_stock_days: Number(smartForm.safety_stock_days) || 3,
      target_cover_days: Number(smartForm.target_cover_days) || 20,
      min_floor_stock: Number(smartForm.min_floor_stock) || 0,
      purchase_multiple: Math.max(1, Number(smartForm.purchase_multiple) || 1),
    }),
    onSuccess: (result) => {
      const edits: SmartEditMap = {};
      for (const item of result.items || []) {
        edits[item.id] = {
          lower: String(item.suggested_lower_limit ?? 0),
          upper: String(item.suggested_upper_limit ?? 0),
          qty: String(item.suggested_replenishment_qty ?? 0),
        };
      }
      setSmartPreview(result);
      setSmartEdits(edits);
      setTab("smart");
      setSmartView("suggestions");
      toast.success(`${L("智能补货预览已生成")} ${result.items?.length ?? 0} ${L("条")}`);
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("智能补货计算失败"))),
  });

  const smartApplyMutation = useMutation({
    mutationFn: async () => {
      if (!smartPreview) return;
      return applySmartReplenishmentRun(smartPreview.id, {
        items: smartPreview.items.map((item) => {
          const edit = smartEdits[item.id];
          return {
            id: item.id,
            suggested_lower_limit: Number(edit?.lower ?? item.suggested_lower_limit) || 0,
            suggested_upper_limit: Number(edit?.upper ?? item.suggested_upper_limit) || 0,
            suggested_replenishment_qty: Number(edit?.qty ?? item.suggested_replenishment_qty) || 0,
          };
        }),
      });
    },
    onSuccess: async (result) => {
      toast.success(`${L("已应用智能补货上下限")} ${result?.applied ?? 0} ${L("条")}`);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("应用智能补货结果失败"))),
  });

  const smartCreatePoMutation = useMutation({
    mutationFn: async () => {
      if (!smartPreview) return;
      return createPurchaseOrderFromSmartRun(smartPreview.id, {
        items: smartPreview.items.map((item) => {
          const edit = smartEdits[item.id];
          return {
            id: item.id,
            suggested_replenishment_qty: Number(edit?.qty ?? item.suggested_replenishment_qty) || 0,
          };
        }),
        remark: `智能补货批次 ${smartPreview.id}`,
      });
    },
    onSuccess: async (result) => {
      toast.success(`${L("采购单已生成")}：${result?.order_no || ""}`);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("生成采购单失败"))),
  });

  const smartUnpackMutation = useMutation({
    mutationFn: async (itemIds?: string[]) => {
      if (!smartPreview) return;
      return executeUnpackForSmartRun(smartPreview.id, {
        item_ids: itemIds,
        remark: `智能补货批次 ${smartPreview.id}`,
      });
    },
    onSuccess: async (result) => {
      toast.success(`${L("拆包完成")} ${result?.executed ?? 0} ${L("项")}`);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("执行拆包失败"))),
  });

  const smartProfileMutation = useMutation({
    mutationFn: async () => {
      if (selectedVariantIds.length === 0) throw new Error(L("请先选择 SKU"));
      return saveReplenishmentProfiles({
        variant_ids: selectedVariantIds,
        auto_limit_enabled: true,
        analysis_days: Number(smartForm.analysis_days) || 30,
        strategy: smartForm.strategy || "balanced",
        lead_time_days: Number(smartForm.lead_time_days) || 7,
        safety_stock_days: Number(smartForm.safety_stock_days) || 3,
        target_cover_days: Number(smartForm.target_cover_days) || 20,
        min_floor_stock: Number(smartForm.min_floor_stock) || 0,
        purchase_multiple: Math.max(1, Number(smartForm.purchase_multiple) || 1),
        exclude_stockout_days: true,
      });
    },
    onSuccess: (result) => {
      toast.success(`${L("补货规则已保存")} ${result?.updated ?? selectedVariantIds.length} ${L("个 SKU")}`);
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("保存补货规则失败"))),
  });

  const smartProfileLoadMutation = useMutation({
    mutationFn: async () => {
      if (selectedVariantIds.length !== 1) throw new Error(L("请只选择一个 SKU"));
      const list = await fetchReplenishmentProfiles({ variant_id: selectedVariantIds[0] });
      const profile = list[0];
      if (!profile) throw new Error(L("当前 SKU 暂无专属补货规则"));
      return profile;
    },
    onSuccess: (profile) => {
      setSmartForm((prev) => ({
        ...prev,
        analysis_days: String(profile.analysis_days ?? prev.analysis_days),
        strategy: profile.strategy || prev.strategy,
        lead_time_days: String(profile.lead_time_days ?? prev.lead_time_days),
        safety_stock_days: String(profile.safety_stock_days ?? prev.safety_stock_days),
        target_cover_days: String(profile.target_cover_days ?? prev.target_cover_days),
        min_floor_stock: String(profile.min_floor_stock ?? prev.min_floor_stock),
        purchase_multiple: String(profile.purchase_multiple ?? prev.purchase_multiple),
      }));
      toast.success(L("补货规则已加载"));
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("加载补货规则失败"))),
  });
  const dailySnapshotMutation = useMutation({
    mutationFn: () => generateDailyInventorySnapshot(),
    onSuccess: (result) => {
      toast.success(`${L("库存快照已生成")}：${result.snapshot_date}`);
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("生成库存快照失败"))),
  });

  const createPoMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseFromAlert) return;
      const qty = Number(purchaseFromAlert.ordered_qty);
      if (!Number.isInteger(qty) || qty <= 0) throw new Error(L("采购数量必须为大于 0 的整数"));
      await createPurchaseOrderFromAlert(purchaseFromAlert.alert.id, {
        ordered_qty: qty,
        unit_cost: purchaseFromAlert.unit_cost ? Number(purchaseFromAlert.unit_cost) : undefined,
        expected_arrival_date: purchaseFromAlert.expected_arrival_date || undefined,
        remark: purchaseFromAlert.remark.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success(L("采购单已创建"));
      setPurchaseFromAlert(null);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("创建采购单失败"))),
  });

  const receivePoMutation = useMutation({
    mutationFn: async () => {
      if (!receivingOrder) return;
      const detail = receivingOrderDetailQuery.data;
      const items = detail?.items
        .map((item) => {
          const formItem = receivingOrder.items[item.id];
          const receivedQty = Number(formItem?.received_qty ?? item.remaining_qty);
          return {
            id: item.id,
            received_qty: Number.isFinite(receivedQty) ? receivedQty : 0,
            unit_cost: formItem?.unit_cost ? Number(formItem.unit_cost) : item.unit_cost ?? undefined,
          };
        })
        .filter((item) => item.received_qty > 0);
      if (detail && items.length === 0) throw new Error(L("请至少填写一项本次到货数量"));
      await receivePurchaseOrder(receivingOrder.order.id, {
        actual_arrival_date: receivingOrder.actual_arrival_date || undefined,
        remark: receivingOrder.remark.trim() || undefined,
        items,
      });
    },
    onSuccess: async () => {
      toast.success(L("采购到货已入库"));
      setReceivingOrder(null);
      await invalidateInventory();
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("确认入库失败"))),
  });

  const summary = summaryQuery.data;
  const skus = useMemo(() => skusQuery.data?.list || [], [skusQuery.data?.list]);
  const pageVariantIds = useMemo(() => skus.map((sku) => sku.variant_id), [skus]);
  const allSelectedOnPage = pageVariantIds.length > 0 && pageVariantIds.every((id) => selectedVariantIds.includes(id));
  const selectedCount = selectedVariantIds.length;
  const smartPurchaseableCount = smartPreview?.items.filter((item) => {
    const edit = smartEdits[item.id];
    const qty = Number(edit?.qty ?? item.suggested_replenishment_qty) || 0;
    return (item.suggestion_type || "purchase") === "purchase" && qty > 0;
  }).length ?? 0;
  const smartWatchCount = smartPreview?.items.filter((item) => item.suggestion_type === "watch").length ?? 0;
  const smartUnpackCount = smartPreview?.items.filter((item) => item.suggestion_type === "unpack").length ?? 0;
  const smartIncompleteHistoryCount = smartPreview?.items.filter((item) => /历史数据不完整|snapshot|快照/i.test(item.reason || "")).length ?? 0;
  const smartUnpackableItemIds = smartPreview?.items
    .filter((item) => item.suggestion_type === "unpack" && !["unpacked", "applied"].includes(String(item.apply_status || "")))
    .map((item) => item.id) ?? [];

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
  const ruleSkuOptions = useMemo(() => {
    const map = new Map<string, InventorySku>();
    for (const sku of skus) map.set(sku.variant_id, sku);
    for (const sku of ruleSkuSearchQuery.data?.list || []) map.set(sku.variant_id, sku);
    return Array.from(map.values());
  }, [ruleSkuSearchQuery.data?.list, skus]);

  const records = recordsQuery.data?.list || [];
  const alerts = alertsQuery.data?.list || [];
  const purchaseOrders = purchaseOrdersQuery.data?.list || [];
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

  const renderSkuOptions = (selectedId?: string) => ruleSkuOptions.map((sku) => <option key={`${selectedId || ""}-${sku.variant_id}`} value={sku.variant_id}>{skuLabel(sku, L)}</option>);

  const renderSkuMobileCard = (sku: InventorySku) => {
    const checked = selectedVariantIds.includes(sku.variant_id);
    return (
      <AdminTableMobileCard>
        <div className="mb-3 flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleVariantSelect(sku.variant_id)}
            className="mt-1"
            aria-label={`选择 ${sku.product_name}`}
          />
          {sku.cover_image ? (
            <img src={sku.cover_image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded-lg bg-secondary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold">{sku.product_name}</p>
            <p className="text-xs text-muted-foreground">{sku.variant_title || sku.spec_text || L("默认规格")}</p>
          </div>
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={L("库存")}>
            <span className={sku.out_of_stock ? `font-bold ${THEME_TEXT_DANGER}` : sku.low_stock ? `font-bold ${THEME_TEXT_WARNING}` : "font-medium"}>
              {sku.available_stock} {sku.unit_name || L("件")}
            </span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("状态")}>
            <span className="text-xs">{stockStatusText(sku, L)}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label="SKU">
            <span className="font-mono text-xs text-muted-foreground">{sku.sku_code || "-"}</span>
          </AdminTableMobileCardField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <button type="button" onClick={() => setAdjusting({ sku, change_type: "in", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`touch-manipulation rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}><Tx>入库</Tx></button>
          <button type="button" onClick={() => setAdjusting({ sku, change_type: "out", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`touch-manipulation rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}><Tx>出库</Tx></button>
          <button type="button" onClick={() => setAdjusting({ sku, change_type: "adjust", quantity: String(sku.stock), reason: "", remark: "", source_no: "", cost_price: "" })} className="touch-manipulation rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-theme-price"><Tx>盘点</Tx></button>
        </div>
      </AdminTableMobileCard>
    );
  };

  const renderRecordMobileCard = (row: InventoryStockRecord) => (
    <AdminTableMobileCard>
      <p className="mb-2 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
      <p className="mb-1 text-sm font-semibold">{row.product_name}</p>
      <p className="mb-3 text-xs text-muted-foreground">{row.variant_name || "-"} / {row.sku_code || "-"}</p>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("类型")}>{changeLabel(row.change_type)}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("变化")}>
          <span className={row.quantity_delta >= 0 ? THEME_TEXT_SUCCESS_SOFT : THEME_TEXT_DANGER}>
            {row.quantity_delta > 0 ? "+" : ""}{row.quantity_delta}
          </span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("变更前后")}>
          <span className="text-xs">{row.before_stock} → {row.after_stock}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("原因")}>
          <span className="text-xs text-muted-foreground line-clamp-2">{row.reason || row.remark || "-"}</span>
        </AdminTableMobileCardField>
      </div>
    </AdminTableMobileCard>
  );

  const renderAlertMobileCard = (row: InventoryReplenishmentAlert) => (
    <AdminTableMobileCard>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{row.product_name}</p>
          <p className="text-xs text-muted-foreground">{row.variant_title || L("默认规格")} / {row.sku_code || "-"}</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{L(ALERT_STATUS_LABEL[row.alert_status] || row.alert_status)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("库存")}>{row.available_stock} / {L("预警")} {row.warning_stock}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("在途")}>{row.in_transit_qty} {row.unit_name || L("件")}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("建议补货")}>{row.suggested_qty} {row.unit_name || L("件")}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("原因")}><span className="text-xs text-muted-foreground">{row.reason || "-"}</span></AdminTableMobileCardField>
      </div>
      {row.alert_status !== "resolved" ? (
        <div className="mt-3 border-t border-border pt-3">
          <button type="button" onClick={() => setPurchaseFromAlert({ alert: row, ordered_qty: String(Math.max(row.suggested_qty, row.warning_stock - row.available_stock, 1)), unit_cost: "", expected_arrival_date: "", remark: "" })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Tx>生成采购单</Tx></button>
        </div>
      ) : null}
    </AdminTableMobileCard>
  );

  const renderPurchaseOrderMobileCard = (row: PurchaseOrder) => (
    <AdminTableMobileCard>
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-semibold">{row.order_no}</p>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{L(PURCHASE_STATUS_LABEL[row.status] || row.status)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("数量")}>{row.received_qty} / {row.ordered_qty}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("在途")}>{row.in_transit_qty}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("预计到货")}>{row.expected_arrival_date || "-"}</AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("创建时间")}><span className="text-xs text-muted-foreground">{row.created_at ? formatDateTime(row.created_at) : "-"}</span></AdminTableMobileCardField>
      </div>
      {!["received", "cancelled"].includes(row.status) ? (
        <div className="mt-3 border-t border-border pt-3">
          <button type="button" onClick={() => setReceivingOrder({ order: row, remark: "", actual_arrival_date: "", items: {} })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Tx>确认到货入库</Tx></button>
        </div>
      ) : null}
    </AdminTableMobileCard>
  );

  const renderRuleMobileCard = (row: InventoryPackRule) => (
    <AdminTableMobileCard>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("大包装 SKU")}>
          <span className="text-xs">{row.parent_product_name}<br />{row.parent_variant_name || L("默认规格")} / {row.parent_sku_code || "-"}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("小包装 SKU")}>
          <span className="text-xs">{row.child_product_name}<br />{row.child_variant_name || L("默认规格")} / {row.child_sku_code || "-"}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("换算")}>
          <span className="text-xs">{row.parent_qty} {row.parent_unit_name} = {row.child_qty} {row.child_unit_name}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("当前库存")}>
          <span className="text-xs">{L("大包可用")} {row.parent_available_stock ?? row.parent_stock} / {L("小包可用")} {row.child_available_stock ?? row.child_stock}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <button type="button" onClick={() => setConvertForm({ type: "unpack", rule: row, parent_qty: "1", remark: "" })} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即拆包</Tx></button>
        <button type="button" onClick={() => setConvertForm({ type: "assemble", rule: row, parent_qty: "1", remark: "" })} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即组装</Tx></button>
        <button type="button" onClick={() => setRuleForm(row)} className="touch-manipulation rounded-lg bg-secondary px-3 py-1.5 text-xs"><Tx>编辑</Tx></button>
      </div>
    </AdminTableMobileCard>
  );

  const renderConversionMobileCard = (row: InventoryConversionOrder) => (
    <AdminTableMobileCard>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium">{row.order_no}</p>
        <span className="text-xs text-muted-foreground">{conversionLabel(row.type)}</span>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={L("大包装")}>
          <span className="text-xs">{row.parent_product_name_snapshot}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("小包装")}>
          <span className="text-xs">{row.child_product_name_snapshot}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("数量")}>
          <span className="text-xs">{row.parent_qty} {row.parent_unit_name_snapshot} → {row.child_total_qty} {row.child_unit_name_snapshot}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={L("时间")}>
          <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
        </AdminTableMobileCardField>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <PermissionGate permission="inventory.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <AdminPageTitle title={pageTitle || tText("库存中心")} hint={pageHint || L("按 SKU 管理库存、流水、组装拆包规则和转换单据。")} />
          <div className="flex gap-2">
            <button onClick={() => void exportInventorySkusCsv({ keyword, stock_status: stockStatus })} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><Download size={15} /><Tx>导出库存</Tx></button>
            <button onClick={() => void invalidateInventory()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><RefreshCcw size={15} /><Tx>刷新</Tx></button>
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
          ].map((item) => <div key={item.t} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{L(item.t)}</p><p className="mt-1 text-xl font-bold text-foreground">{item.v}</p></div>)}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {([
              ["skus", "SKU 库存"],
              ["smart", "智能补货"],
              ["alerts", "补货预警"],
              ["purchaseOrders", "采购单"],
              ["records", "库存流水"],
              ["rules", "组装拆包规则"],
              ["conversions", "组装拆包单据"],
            ] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{L(label)}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <div className="relative min-w-[260px] max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); setAlertsPage(1); setPurchaseOrdersPage(1); setRecordsPage(1); setRulesPage(1); setConversionsPage(1); }} placeholder={tText("搜索商品、SKU、单据号...")} className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-4 text-sm" />
            </div>
            {tab === "skus" ? (
              <>
                <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as typeof stockStatus); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value=""><Tx>全部库存状态</Tx></option><option value="normal"><Tx>正常</Tx></option><option value="low"><Tx>低库存</Tx></option><option value="out"><Tx>缺货</Tx></option></select>
                <button type="button" disabled={selectedCount === 0} onClick={() => setBatchThreshold({ threshold: "10" })} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm disabled:opacity-50">{L("批量预警值")} ({selectedCount})</button>
                <button type="button" disabled={selectedCount === 0} onClick={() => setBatchAdjust({ ...EMPTY_BATCH_ADJUST })} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm disabled:opacity-50">{L("批量库存调整")} ({selectedCount})</button>
                {selectedCount > 0 ? (
                  <button type="button" onClick={() => setSelectedVariantIds([])} className="rounded-lg bg-secondary px-3 py-2.5 text-xs text-muted-foreground"><Tx>清空选择</Tx></button>
                ) : null}
              </>
            ) : null}
            {tab === "smart" ? (
              <>
                <select value={smartForm.analysis_days} onChange={(e) => setSmartForm((s) => ({ ...s, analysis_days: e.target.value }))} className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
                  {[7, 14, 30, 60, 90].map((day) => <option key={day} value={String(day)}>{L(`近 ${day} 天`)}</option>)}
                </select>
                <select value={smartForm.strategy} onChange={(e) => setSmartForm((s) => ({ ...s, strategy: e.target.value }))} className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
                  <option value="conservative"><Tx>保守</Tx></option>
                  <option value="balanced"><Tx>平衡</Tx></option>
                  <option value="aggressive"><Tx>激进</Tx></option>
                </select>
                <button type="button" onClick={() => smartPreviewMutation.mutate()} disabled={smartPreviewMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {smartPreviewMutation.isPending ? L("计算中...") : selectedCount > 0 ? `${L("计算已选 SKU")} (${selectedCount})` : L("计算全部 SKU")}
                </button>
              </>
            ) : null}
            {tab === "alerts" ? (
              <>
                <select value={alertStatus} onChange={(e) => { setAlertStatus(e.target.value); setAlertsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
                  <option value=""><Tx>全部预警状态</Tx></option>
                  {Object.entries(ALERT_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{L(label)}</option>)}
                </select>
                <button type="button" onClick={() => generateAlertsMutation.mutate()} disabled={generateAlertsMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {generateAlertsMutation.isPending ? L("扫描中...") : L("扫描生成预警")}
                </button>
              </>
            ) : null}
            {tab === "purchaseOrders" ? (
              <select value={purchaseStatus} onChange={(e) => { setPurchaseStatus(e.target.value); setPurchaseOrdersPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
                <option value=""><Tx>全部采购状态</Tx></option>
                {Object.entries(PURCHASE_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{L(label)}</option>)}
              </select>
            ) : null}
            {tab === "records" ? <select value={changeType} onChange={(e) => { setChangeType(e.target.value); setRecordsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value=""><Tx>全部流水类型</Tx></option>{Object.entries(CHANGE_LABEL).map(([key, value]) => <option key={key} value={key}>{L(value)}</option>)}</select> : null}
            {tab === "conversions" ? <select value={conversionType} onChange={(e) => { setConversionType(e.target.value); setConversionsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm"><option value=""><Tx>全部单据类型</Tx></option><option value="unpack"><Tx>手动拆包</Tx></option><option value="assemble"><Tx>手动组装</Tx></option><option value="auto_unpack"><Tx>自动拆包</Tx></option></select> : null}
            {tab === "rules" ? <button onClick={() => setRuleForm({ parent_qty: 1, child_qty: 0, enabled: true, manual_unpack_enabled: true, manual_assemble_enabled: true, auto_unpack_enabled: false })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={15} /><Tx>新增规则</Tx></button> : null}
            {tab === "records" ? <button type="button" onClick={() => void exportInventoryRecordsCsv({ keyword, change_type: changeType })} className="rounded-lg border border-border px-3 py-2.5 text-sm"><Tx>导出流水</Tx></button> : null}
          </div>
        </div>

        {tab === "skus" ? (
          <>
            <AnimatedTable embedded loading={skusQuery.isLoading} rows={skus} rowKey={(sku) => sku.variant_id} skeletonRows={8} skeletonCols={11} tableClassName="w-full min-w-[1320px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={Package} emptyTitle={L("暂无 SKU 库存")} emptyDescription={L("创建商品规格后会显示库存。")} thead={(
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={togglePageVariantSelection} aria-label={tText("全选当前页")} />
                </th>
                {["商品", "规格", "SKU 编码", "分类", "库存", "单位", "预警值", "状态", "更新时间", "操作"].map((head) => (
                  <th key={head} className="whitespace-nowrap px-4 py-3 text-left">{L(head)}</th>
                ))}
              </tr>
            )}
              renderMobileCard={renderSkuMobileCard}
              renderRow={(sku) => {
                const checked = selectedVariantIds.includes(sku.variant_id);
                const unit = sku.unit_name || L("件");
                const skuCodeLabel = sku.sku_code || L("未填写");
                return (
                  <>
                    <td className="whitespace-nowrap px-4 py-2 align-middle">
                      <input type="checkbox" checked={checked} onChange={() => toggleVariantSelect(sku.variant_id)} aria-label={`选择 ${sku.product_name}`} />
                    </td>
                    <td className="max-w-[12rem] whitespace-nowrap px-4 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        {sku.cover_image ? <img src={sku.cover_image} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" /> : <div className="h-8 w-8 shrink-0 rounded-md bg-secondary" />}
                        <AdminTableCell value={sku.product_name} fullText={sku.product_name} maxWidth="9.5rem" />
                      </div>
                    </td>
                    <td className="max-w-[8rem] whitespace-nowrap px-4 py-2 align-middle">
                      <AdminTableCell value={sku.variant_title || sku.spec_text || L("默认规格")} maxWidth="7.5rem" />
                    </td>
                    <td className="max-w-[9rem] whitespace-nowrap px-4 py-2 align-middle">
                      <AdminTableCell value={skuCodeLabel} fullText={sku.sku_code ? `SKU：${sku.sku_code}` : L("SKU：未填写")} maxWidth="8.5rem" mono muted={!sku.sku_code} />
                    </td>
                    <td className="max-w-[7rem] whitespace-nowrap px-4 py-2 align-middle text-muted-foreground">
                      <AdminTableCell value={sku.category_name || L("未分类")} maxWidth="6.5rem" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle">
                      <span className={sku.out_of_stock ? `font-bold ${THEME_TEXT_DANGER}` : sku.low_stock ? `font-bold ${THEME_TEXT_WARNING}` : "font-medium"}>
                        {sku.available_stock} {unit}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">({L("总")} {sku.stock} {unit})</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle">{unit}</td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle">
                      <input type="number" min={0} defaultValue={sku.stock_warning_threshold} onBlur={(e) => { const threshold = Number(e.target.value); if (Number.isInteger(threshold) && threshold >= 0 && threshold !== sku.stock_warning_threshold) thresholdMutation.mutate({ sku, threshold }); }} className="w-20 rounded-lg bg-secondary px-2 py-1.5 text-xs" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle text-xs">{stockStatusText(sku, L)}</td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle text-xs text-muted-foreground">{sku.updated_at ? formatDateTime(sku.updated_at) : "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2 align-middle">
                      <div className="flex flex-nowrap justify-end gap-2">
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "in", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}><Tx>入库</Tx></button>
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "out", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}><Tx>出库</Tx></button>
                        <button type="button" onClick={() => setAdjusting({ sku, change_type: "adjust", quantity: String(sku.stock), reason: "", remark: "", source_no: "", cost_price: "" })} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-theme-price"><Tx>盘点</Tx></button>
                      </div>
                    </td>
                  </>
                );
              }}
            />
            <Pagination total={skusQuery.data?.total || 0} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "smart" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap gap-2">
                {([
                  ["overview", "智能补货总览"],
                  ["limits", "一键设置上下限"],
                  ["suggestions", "补货建议"],
                  ["purchase", "采购计划"],
                  ["rules", "补货规则设置"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSmartView(key)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${smartView === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    {L(label)}
                  </button>
                ))}
              </div>
            </div>

            {smartView === "overview" ? (
              <>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {[
                    { t: "缺货 SKU", v: summary?.out_of_stock_skus ?? 0 },
                    { t: "低于下限 SKU", v: summary?.low_stock_skus ?? 0 },
                    { t: "建议采购 SKU", v: smartPurchaseableCount },
                    { t: "建议拆包 SKU", v: smartUnpackCount },
                    { t: "观察 SKU", v: smartWatchCount },
                    { t: "历史数据不完整", v: smartIncompleteHistoryCount },
                  ].map((item) => (
                    <div key={item.t} className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">{L(item.t)}</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{item.v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">{L("智能补货闭环")}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {L("当前版本按可用库存、在途库存、销量快照、库存上下限生成预览；低销量和新品只给观察建议；小包装缺货时会先判断大包装可拆库存，再决定拆包或采购。")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSmartView("limits")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{L("去计算上下限")}</button>
                    <button type="button" onClick={() => setSmartView("suggestions")} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{L("查看补货建议")}</button>
                  </div>
                </div>
              </>
            ) : null}

            {smartView === "limits" ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground"><Tx>一键设置上下限</Tx></h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Tx>系统按可用库存、在途库存、销量快照和采购周期生成预览；预览结果可人工修正，确认后才会批量应用。</Tx>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => smartPreviewMutation.mutate()} disabled={smartPreviewMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {smartPreviewMutation.isPending ? L("智能计算中...") : L("智能计算")}
                  </button>
                  <button type="button" onClick={() => dailySnapshotMutation.mutate()} disabled={dailySnapshotMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {dailySnapshotMutation.isPending ? L("生成中...") : L("生成今日快照")}
                  </button>
                  <button type="button" onClick={() => smartApplyMutation.mutate()} disabled={!smartPreview || smartApplyMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartApplyMutation.isPending ? L("应用中...") : L("批量应用")}
                  </button>
                  <button type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={!smartPreview || smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartCreatePoMutation.isPending ? L("生成中...") : L("生成采购单")}
                  </button>
                  <button type="button" onClick={() => smartUnpackMutation.mutate(smartUnpackableItemIds)} disabled={!smartPreview || smartUnpackableItemIds.length <= 0 || smartUnpackMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartUnpackMutation.isPending ? L("拆包中...") : L("批量执行拆包")}
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                <label className="text-xs text-muted-foreground">
                  <span className="mb-1 block"><Tx>计算周期</Tx></span>
                  <select value={smartForm.analysis_days} onChange={(e) => setSmartForm((s) => ({ ...s, analysis_days: e.target.value }))} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                    {[7, 14, 30, 60, 90].map((day) => <option key={day} value={String(day)}>{L(`近 ${day} 天`)}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  <span className="mb-1 block"><Tx>策略</Tx></span>
                  <select value={smartForm.strategy} onChange={(e) => setSmartForm((s) => ({ ...s, strategy: e.target.value }))} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                    <option value="conservative"><Tx>保守</Tx></option>
                    <option value="balanced"><Tx>平衡</Tx></option>
                    <option value="aggressive"><Tx>激进</Tx></option>
                  </select>
                </label>
                {[
                  ["lead_time_days", "到货周期"],
                  ["safety_stock_days", "安全天数"],
                  ["target_cover_days", "覆盖天数"],
                  ["min_floor_stock", "保底库存"],
                  ["purchase_multiple", "采购倍数"],
                ].map(([key, label]) => (
                  <label key={key} className="text-xs text-muted-foreground">
                    <span className="mb-1 block">{L(label)}</span>
                    <input
                      type="number"
                      min={key === "purchase_multiple" ? 1 : 0}
                      value={smartForm[key as keyof SmartReplenishmentForm]}
                      onChange={(e) => setSmartForm((s) => ({ ...s, [key]: e.target.value }))}
                      className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {selectedCount > 0 ? `${L("当前将计算已选 SKU")}：${selectedCount}` : L("未选择 SKU 时将按当前接口范围计算全部 SKU。")}
              </p>
            </div>
            ) : null}

            {smartView === "purchase" ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{L("采购计划")}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {L("只会把建议动作为采购、且建议数量大于 0 的 SKU 生成采购单。拆包和观察建议不会进入采购单。")}
                    </p>
                  </div>
                  <button type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={!smartPreview || smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {smartCreatePoMutation.isPending ? L("生成中...") : `${L("生成采购单")} (${smartPurchaseableCount})`}
                  </button>
                </div>
              </div>
            ) : null}

            {smartView === "suggestions" || smartView === "purchase" ? (
              smartPreview ? (
              <div className="rounded-xl border border-border bg-card">
                <div className="flex flex-col gap-2 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground"><Tx>智能补货预览</Tx></h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {L("批次")} {smartPreview.id} · {L("共")} {smartPreview.items.length} {L("条")}
                    </p>
                  </div>
                  <button type="button" onClick={() => smartApplyMutation.mutate()} disabled={smartApplyMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {smartApplyMutation.isPending ? L("应用中...") : L("确认批量应用")}
                  </button>
                  <button type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartCreatePoMutation.isPending ? L("生成中...") : L("生成采购单")}
                  </button>
                  <button type="button" onClick={() => smartUnpackMutation.mutate(smartUnpackableItemIds)} disabled={smartUnpackableItemIds.length <= 0 || smartUnpackMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartUnpackMutation.isPending ? L("拆包中...") : L("批量执行拆包")}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] text-left text-sm">
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        {["SKU", "库存", "在途", "销量/天", "当前下限/上限", "建议下限", "建议上限", "建议补货", "建议动作", "置信度", "原因"].map((head) => (
                          <th key={head} className="px-4 py-3 text-left">{L(head)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {smartPreview.items.map((item) => {
                        const sku = skuCache[item.variant_id];
                        const edit = smartEdits[item.id] || { lower: String(item.suggested_lower_limit), upper: String(item.suggested_upper_limit), qty: String(item.suggested_replenishment_qty) };
                        return (
                          <tr key={item.id} className="border-b border-border/70">
                            <td className="px-4 py-3">
                              <p className="font-medium">{sku?.product_name || item.variant_id}</p>
                              <p className="text-xs text-muted-foreground">{sku?.variant_title || sku?.spec_text || L("SKU")} / {sku?.sku_code || "-"}</p>
                            </td>
                            <td className="px-4 py-3">{item.available_stock} / {item.current_stock}</td>
                            <td className="px-4 py-3">{item.in_transit_qty}</td>
                            <td className="px-4 py-3">{item.sales_qty} / {Number(item.avg_daily_sales || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">{item.old_lower_limit ?? "-"} / {item.old_upper_limit ?? "-"}</td>
                            <td className="px-4 py-3">
                              <input type="number" min={0} value={edit.lower} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, lower: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" min={0} value={edit.upper} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, upper: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" min={0} value={edit.qty} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, qty: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                                  {item.suggestion_type === "unpack" ? L("拆包") : item.suggestion_type === "watch" ? L("观察") : L("采购")}
                                </span>
                                {item.suggestion_type === "unpack" ? (
                                  <button
                                    type="button"
                                    onClick={() => smartUnpackMutation.mutate([item.id])}
                                    disabled={smartUnpackMutation.isPending || item.apply_status === "unpacked"}
                                    className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-50"
                                  >
                                    {item.apply_status === "unpacked" ? <Tx>已拆包</Tx> : <Tx>执行拆包</Tx>}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">{item.confidence_score}%</td>
                            <td className="max-w-[18rem] px-4 py-3 text-xs text-muted-foreground">{item.reason || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                <Tx>暂无智能补货预览。请先点击“智能计算”，系统只会生成预览，不会直接修改库存上下限。</Tx>
              </div>
              )
            ) : null}

            {smartView === "rules" ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{L("补货规则设置")}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {L("当前批次规则从这里录入后用于本次预览：采购到货周期、安全库存天数、目标覆盖天数、保底库存、采购倍数和策略。后续可继续扩展为按 SKU 保存专属 profile。")}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    ["lead_time_days", "采购到货周期"],
                    ["safety_stock_days", "安全库存天数"],
                    ["target_cover_days", "目标覆盖天数"],
                    ["min_floor_stock", "最低保底库存"],
                    ["purchase_multiple", "采购倍数"],
                  ].map(([key, label]) => (
                    <label key={key} className="text-xs text-muted-foreground">
                      <span className="mb-1 block">{L(label)}</span>
                      <input
                        type="number"
                        min={key === "purchase_multiple" ? 1 : 0}
                        value={smartForm[key as keyof SmartReplenishmentForm]}
                        onChange={(e) => setSmartForm((s) => ({ ...s, [key]: e.target.value }))}
                        className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSmartView("limits")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{L("?????????")}</button>
                  <button type="button" onClick={() => smartProfileLoadMutation.mutate()} disabled={selectedCount !== 1 || smartProfileLoadMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartProfileLoadMutation.isPending ? L("???...") : L("???? SKU ??")}
                  </button>
                  <button type="button" onClick={() => smartProfileMutation.mutate()} disabled={selectedCount <= 0 || smartProfileMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {smartProfileMutation.isPending ? L("???...") : `${L("????? SKU")} (${selectedCount})`}
                  </button>
                  <button type="button" onClick={() => dailySnapshotMutation.mutate()} disabled={dailySnapshotMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    {dailySnapshotMutation.isPending ? L("???...") : L("??????")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "alerts" ? (
          <>
            <AnimatedTable embedded loading={alertsQuery.isLoading} rows={alerts} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1180px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={Package} emptyTitle={L("暂无补货预警")} emptyDescription={L("点击扫描生成预警，系统会按 SKU 库存和在途数量生成补货事项。")} thead={<tr>{["商品", "SKU", "状态", "可用/预警", "在途", "预计可用", "建议补货", "预计到货", "操作"].map((head) => <th key={head} className="px-4 py-3 text-left">{L(head)}</th>)}</tr>}
              renderMobileCard={renderAlertMobileCard}
              renderRow={(row: InventoryReplenishmentAlert) => (
                <>
                  <td className="px-4 py-3"><AdminTableCell value={row.product_name} maxWidth="12rem" /></td>
                  <td className="px-4 py-3"><p>{row.variant_title || L("默认规格")}</p><p className="text-xs text-muted-foreground">{row.sku_code || "-"}</p></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2 py-1 text-xs">{L(ALERT_STATUS_LABEL[row.alert_status] || row.alert_status)}</span></td>
                  <td className="px-4 py-3">{row.available_stock} / {row.warning_stock}</td>
                  <td className="px-4 py-3">{row.in_transit_qty} {row.unit_name || L("件")}</td>
                  <td className="px-4 py-3">{row.expected_available_stock}</td>
                  <td className="px-4 py-3 font-semibold">{row.suggested_qty}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.expected_arrival_date || "-"}</td>
                  <td className="px-4 py-3">
                    {row.alert_status !== "resolved" ? (
                      <button type="button" onClick={() => setPurchaseFromAlert({ alert: row, ordered_qty: String(Math.max(row.suggested_qty, row.warning_stock - row.available_stock, 1)), unit_cost: "", expected_arrival_date: "", remark: "" })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Tx>生成采购单</Tx></button>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </>
              )}
            />
            <Pagination total={alertsQuery.data?.total || 0} page={alertsPage} pageSize={PAGE_SIZE} onPageChange={setAlertsPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "purchaseOrders" ? (
          <>
            <AnimatedTable embedded loading={purchaseOrdersQuery.isLoading} rows={purchaseOrders} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={8} tableClassName="w-full min-w-[1080px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={Package} emptyTitle={L("暂无采购单")} emptyDescription={L("从补货预警生成采购单后，会在这里跟进入库状态。")} thead={<tr>{["采购单", "状态", "明细数", "数量", "在途", "预计到货", "金额", "操作"].map((head) => <th key={head} className="px-4 py-3 text-left">{L(head)}</th>)}</tr>}
              renderMobileCard={renderPurchaseOrderMobileCard}
              renderRow={(row: PurchaseOrder) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.order_no}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2 py-1 text-xs">{L(PURCHASE_STATUS_LABEL[row.status] || row.status)}</span></td>
                  <td className="px-4 py-3">{row.item_count}</td>
                  <td className="px-4 py-3">{row.received_qty} / {row.ordered_qty}</td>
                  <td className="px-4 py-3">{row.in_transit_qty}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.expected_arrival_date || "-"}</td>
                  <td className="px-4 py-3">RM {Number(row.total_amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {!["received", "cancelled"].includes(row.status) ? (
                      <button type="button" onClick={() => setReceivingOrder({ order: row, remark: "", actual_arrival_date: "", items: {} })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Tx>确认到货入库</Tx></button>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </>
              )}
            />
            <Pagination total={purchaseOrdersQuery.data?.total || 0} page={purchaseOrdersPage} pageSize={PAGE_SIZE} onPageChange={setPurchaseOrdersPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "records" ? (
          <>
            <AnimatedTable embedded loading={recordsQuery.isLoading} rows={records} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1200px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={History} emptyTitle={L("暂无库存流水")} emptyDescription={L("库存调整、订单扣减、拆包组装会写入流水。")} thead={<tr>{["时间", "商品", "规格/SKU", "类型", "变化", "变更前后", "原因", "单据", "操作人"].map((head) => <th key={head} className="px-4 py-3 text-left">{L(head)}</th>)}</tr>}
              renderMobileCard={renderRecordMobileCard}
              renderRow={(row: InventoryStockRecord) => <><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td><td className="max-w-[10rem] px-4 py-3 align-middle"><AdminTableCell value={row.product_name} maxWidth="9.5rem" /></td><td className="max-w-[9rem] px-4 py-3 align-middle"><AdminTableCell value={`${row.variant_name || "-"} / ${row.sku_code || "-"}`} fullText={`${L("规格")}：${row.variant_name || "-"}\nSKU：${row.sku_code || "-"}`} maxWidth="8.5rem" muted /></td><td className="px-4 py-3 text-xs">{changeLabel(row.change_type)}</td><td className={`px-4 py-3 font-semibold ${row.quantity_delta >= 0 ? THEME_TEXT_SUCCESS_SOFT : THEME_TEXT_DANGER}`}>{row.quantity_delta > 0 ? "+" : ""}{row.quantity_delta}</td><td className="px-4 py-3 text-muted-foreground">{row.before_stock} → {row.after_stock}</td><td className="max-w-[11rem] px-4 py-3 align-middle"><AdminTableCell value={row.reason || row.remark || "-"} fullText={[row.reason, row.remark].filter(Boolean).join("\n") || "-"} maxWidth="10.5rem" muted /></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.order_no || row.source_no || "-"}</td><td className="px-4 py-3 text-muted-foreground">{row.operator_name || L("系统")}</td></>}
            />
            <Pagination total={recordsQuery.data?.total || 0} page={recordsPage} pageSize={PAGE_SIZE} onPageChange={setRecordsPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "rules" ? (
          <>
            <AnimatedTable embedded loading={rulesQuery.isLoading} rows={rules} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={8} tableClassName="w-full min-w-[1260px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={SplitSquareHorizontal} emptyTitle={L("暂无组装拆包规则")} emptyDescription={L("新增规则后可手动拆包、组装，也可支持订单自动拆包。")} thead={<tr>{["大包装 SKU", "小包装 SKU", "换算", "当前库存", "自动拆包", "启用", "备注", "操作"].map((head) => <th key={head} className="px-4 py-3 text-left">{L(head)}</th>)}</tr>}
              renderMobileCard={renderRuleMobileCard}
              renderRow={(row: InventoryPackRule) => <><td className="px-4 py-3"><p>{row.parent_product_name}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name || L("默认规格")} / {row.parent_sku_code || "-"}</p></td><td className="px-4 py-3"><p>{row.child_product_name}</p><p className="text-xs text-muted-foreground">{row.child_variant_name || L("默认规格")} / {row.child_sku_code || "-"}</p></td><td className="px-4 py-3">{row.parent_qty} {row.parent_unit_name} = {row.child_qty} {row.child_unit_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">{L("大包可用")} {row.parent_available_stock ?? row.parent_stock} / {L("小包可用")} {row.child_available_stock ?? row.child_stock}</td><td className="px-4 py-3">{row.auto_unpack_enabled ? L("已开启") : L("关闭")}</td><td className="px-4 py-3">{row.enabled ? L("启用") : L("停用")}</td><td className="px-4 py-3 text-muted-foreground">{row.remark || "-"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => setConvertForm({ type: "unpack", rule: row, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即拆包</Tx></button><button onClick={() => setConvertForm({ type: "assemble", rule: row, parent_qty: "1", remark: "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即组装</Tx></button><button onClick={() => setRuleForm(row)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs"><Tx>编辑</Tx></button><button onClick={() => deleteRuleMutation.mutate(row.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600"><Tx>删除</Tx></button></div></td></>}
            />
            <Pagination total={rulesQuery.data?.total || 0} page={rulesPage} pageSize={PAGE_SIZE} onPageChange={setRulesPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        {tab === "conversions" ? (
          <>
            <AnimatedTable embedded loading={conversionsQuery.isLoading} rows={conversions} rowKey={(row) => row.id} skeletonRows={8} skeletonCols={9} tableClassName="w-full min-w-[1320px] text-left text-sm" theadClassName="border-b border-border text-xs text-muted-foreground" emptyIcon={History} emptyTitle={L("暂无组装拆包单据")} emptyDescription={L("手动拆包、手动组装和自动拆包都会生成单据。")} thead={<tr>{["单据号", "类型", "大包装", "小包装", "数量", "大包装库存", "小包装库存", "来源订单", "时间"].map((head) => <th key={head} className="px-4 py-3 text-left">{L(head)}</th>)}</tr>}
              renderMobileCard={renderConversionMobileCard}
              renderRow={(row: InventoryConversionOrder) => <><td className="px-4 py-3 font-medium">{row.order_no}</td><td className="px-4 py-3">{conversionLabel(row.type)}</td><td className="px-4 py-3"><p>{row.parent_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.parent_variant_name_snapshot || L("默认规格")} / {row.parent_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3"><p>{row.child_product_name_snapshot}</p><p className="text-xs text-muted-foreground">{row.child_variant_name_snapshot || L("默认规格")} / {row.child_sku_code_snapshot || "-"}</p></td><td className="px-4 py-3">{row.parent_qty} {row.parent_unit_name_snapshot} → {row.child_total_qty} {row.child_unit_name_snapshot}</td><td className="px-4 py-3">{row.parent_before_stock} → {row.parent_after_stock}</td><td className="px-4 py-3">{row.child_before_stock} → {row.child_after_stock}</td><td className="px-4 py-3 text-muted-foreground">{row.source_order_no || "-"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td></>}
            />
            <Pagination total={conversionsQuery.data?.total || 0} page={conversionsPage} pageSize={PAGE_SIZE} onPageChange={setConversionsPage} onPageSizeChange={() => undefined} />
          </>
        ) : null}

        <AdminFormSheet
          open={!!purchaseFromAlert}
          onOpenChange={(open) => !open && setPurchaseFromAlert(null)}
          title={L("生成采购单")}
          description={purchaseFromAlert ? `${purchaseFromAlert.alert.product_name} / ${purchaseFromAlert.alert.variant_title || L("默认规格")}` : undefined}
          submitText={L("创建采购单")}
          loading={createPoMutation.isPending}
          onSubmit={async () => { await createPoMutation.mutateAsync(); }}
          size="sm"
        >
          {purchaseFromAlert ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <p>{L("可用库存")}：{purchaseFromAlert.alert.available_stock}</p>
                <p>{L("预警库存")}：{purchaseFromAlert.alert.warning_stock}</p>
                <p>{L("在途库存")}：{purchaseFromAlert.alert.in_transit_qty}</p>
                <p>{L("建议补货")}：{purchaseFromAlert.alert.suggested_qty}</p>
              </div>
              <input type="number" min={1} value={purchaseFromAlert.ordered_qty} onChange={(e) => setPurchaseFromAlert({ ...purchaseFromAlert, ordered_qty: e.target.value })} placeholder={tText("采购数量")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input type="number" min={0} value={purchaseFromAlert.unit_cost} onChange={(e) => setPurchaseFromAlert({ ...purchaseFromAlert, unit_cost: e.target.value })} placeholder={tText("采购单价（可选）")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input type="date" value={purchaseFromAlert.expected_arrival_date} onChange={(e) => setPurchaseFromAlert({ ...purchaseFromAlert, expected_arrival_date: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <textarea value={purchaseFromAlert.remark} onChange={(e) => setPurchaseFromAlert({ ...purchaseFromAlert, remark: e.target.value })} placeholder={tText("采购备注（可选）")} className="min-h-20 w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!receivingOrder}
          onOpenChange={(open) => !open && setReceivingOrder(null)}
          title={L("确认采购到货入库")}
          description={receivingOrder ? `${receivingOrder.order.order_no} · ${L("剩余在途")} ${receivingOrder.order.in_transit_qty}` : undefined}
          submitText={L("确认入库")}
          loading={receivePoMutation.isPending}
          submitDisabled={receivingOrderDetailQuery.isLoading}
          onSubmit={async () => { await receivePoMutation.mutateAsync(); }}
          size="sm"
        >
          {receivingOrder ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <p>{L("下单数量")}：{receivingOrder.order.ordered_qty}</p>
                <p>{L("已到货")}：{receivingOrder.order.received_qty}</p>
                <p>{L("剩余在途")}：{receivingOrder.order.in_transit_qty}</p>
              </div>
              {receivingOrderDetailQuery.isLoading ? (
                <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground"><Tx>正在加载采购明细...</Tx></div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {(receivingOrderDetailQuery.data?.items || []).map((item) => {
                    const formItem = receivingOrder.items[item.id] || {
                      received_qty: String(item.remaining_qty),
                      unit_cost: item.unit_cost == null ? "" : String(item.unit_cost),
                    };
                    return (
                      <div key={item.id} className="rounded-xl border border-border p-3">
                        <div className="mb-2">
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.variant_title || L("默认规格")} / {item.sku_code || "-"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{L("已到货")} {item.received_qty} / {item.ordered_qty}，{L("未到货")} {item.remaining_qty} {item.unit_name || L("件")}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="number"
                            min={0}
                            max={item.remaining_qty}
                            value={formItem.received_qty}
                            onChange={(e) => setReceivingOrder({
                              ...receivingOrder,
                              items: {
                                ...receivingOrder.items,
                                [item.id]: { ...formItem, received_qty: e.target.value },
                              },
                            })}
                            placeholder={tText("本次到货数量")}
                            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            min={0}
                            value={formItem.unit_cost}
                            onChange={(e) => setReceivingOrder({
                              ...receivingOrder,
                              items: {
                                ...receivingOrder.items,
                                [item.id]: { ...formItem, unit_cost: e.target.value },
                              },
                            })}
                            placeholder={tText("本次成本价")}
                            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <input type="date" value={receivingOrder.actual_arrival_date} onChange={(e) => setReceivingOrder({ ...receivingOrder, actual_arrival_date: e.target.value })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <textarea value={receivingOrder.remark} onChange={(e) => setReceivingOrder({ ...receivingOrder, remark: e.target.value })} placeholder={tText("入库备注（可选）")} className="min-h-20 w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!batchThreshold}
          onOpenChange={(open) => !open && setBatchThreshold(null)}
          title={tText("批量设置预警值")}
          description={`${L("已选")} ${selectedCount} ${L("个 SKU（单次最多")} ${BATCH_MAX} ${L("个）")}`}
          submitText={L("确认")}
          loading={batchThresholdMutation.isPending}
          submitDisabled={selectedCount === 0 || selectedCount > BATCH_MAX}
          onSubmit={async () => { await batchThresholdMutation.mutateAsync(); }}
          size="sm"
        >
          {selectedSkuPreview.length > 0 ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {selectedSkuPreview.map((sku) => <li key={sku.variant_id}>{skuLabel(sku, L)}</li>)}
              {selectedCount > selectedSkuPreview.length ? <li>…{L("等")} {selectedCount} {L("项")}</li> : null}
            </ul>
          ) : null}
          <input type="number" min={0} value={batchThreshold?.threshold ?? ""} onChange={(e) => setBatchThreshold({ threshold: e.target.value })} placeholder={tText("预警阈值")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
        </AdminFormSheet>

        <AdminFormSheet
          open={!!batchAdjust}
          onOpenChange={(open) => !open && setBatchAdjust(null)}
          title={batchAdjust ? `${L("批量")}${changeLabel(batchAdjust.change_type)}` : L("批量调整")}
          description={`${L("已选")} ${selectedCount} ${L("个 SKU，将使用相同数量与原因")}`}
          submitText={L("确认")}
          loading={batchAdjustMutation.isPending}
          submitDisabled={selectedCount === 0 || selectedCount > BATCH_MAX}
          onSubmit={async () => { await batchAdjustMutation.mutateAsync(); }}
          size="sm"
        >
          {batchAdjust ? (
            <div className="space-y-3">
              <select value={batchAdjust.change_type} onChange={(e) => setBatchAdjust({ ...batchAdjust, change_type: e.target.value as BatchAdjustForm["change_type"] })} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm">
                <option value="in"><Tx>入库</Tx></option>
                <option value="out"><Tx>出库</Tx></option>
                <option value="adjust"><Tx>盘点调整</Tx></option>
              </select>
              <input type="number" min={batchAdjust.change_type === "adjust" ? 0 : 1} value={batchAdjust.quantity} onChange={(e) => setBatchAdjust({ ...batchAdjust, quantity: e.target.value })} placeholder={batchAdjust.change_type === "adjust" ? L("盘点后实际库存") : L("数量")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={batchAdjust.reason} onChange={(e) => setBatchAdjust({ ...batchAdjust, reason: e.target.value })} placeholder={tText("原因（必填）")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={batchAdjust.remark} onChange={(e) => setBatchAdjust({ ...batchAdjust, remark: e.target.value })} placeholder={tText("备注（可选）")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={batchAdjust.source_no} onChange={(e) => setBatchAdjust({ ...batchAdjust, source_no: e.target.value })} placeholder={tText("来源单号")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input type="number" value={batchAdjust.cost_price} onChange={(e) => setBatchAdjust({ ...batchAdjust, cost_price: e.target.value })} placeholder={tText("成本价")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              </div>
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!adjusting}
          onOpenChange={(open) => !open && setAdjusting(null)}
          title={adjusting ? `${changeLabel(adjusting.change_type)}：${adjusting.sku.product_name}` : L("库存调整")}
          description={adjusting ? `${L("当前")} ${adjusting.sku.stock} ${adjusting.sku.unit_name || L("件")}，${L("调整后")} ${projectedStock} ${adjusting.sku.unit_name || L("件")}` : undefined}
          submitText={L("确认")}
          loading={adjustMutation.isPending}
          onSubmit={async () => { await adjustMutation.mutateAsync(); }}
          size="sm"
        >
          {adjusting ? (
            <div className="space-y-3">
              <input type="number" min={adjusting.change_type === "adjust" ? 0 : 1} value={adjusting.quantity} onChange={(e) => setAdjusting({ ...adjusting, quantity: e.target.value })} placeholder={adjusting.change_type === "adjust" ? L("盘点后实际库存") : L("数量")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={adjusting.reason} onChange={(e) => setAdjusting({ ...adjusting, reason: e.target.value })} placeholder={tText("原因（必填）")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={adjusting.remark} onChange={(e) => setAdjusting({ ...adjusting, remark: e.target.value })} placeholder={tText("备注（可选）")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={adjusting.source_no} onChange={(e) => setAdjusting({ ...adjusting, source_no: e.target.value })} placeholder={tText("来源单号")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
                <input type="number" value={adjusting.cost_price} onChange={(e) => setAdjusting({ ...adjusting, cost_price: e.target.value })} placeholder={tText("成本价")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              </div>
            </div>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!ruleForm}
          onOpenChange={(open) => !open && setRuleForm(null)}
          title={ruleForm?.id ? L("编辑组装拆包规则") : L("新增组装拆包规则")}
          submitText={L("保存")}
          loading={saveRuleMutation.isPending}
          onSubmit={async () => { await saveRuleMutation.mutateAsync(); }}
          size="lg"
        >
          {ruleForm ? (
            <>
              <label className="space-y-1 text-sm">
                <span><Tx>远程搜索 SKU</Tx></span>
                <input
                  value={ruleSkuKeyword}
                  onChange={(e) => setRuleSkuKeyword(e.target.value)}
                  placeholder={tText("搜索商品名、SKU 编码、规格名或条码")}
                  className="w-full rounded-lg bg-secondary px-3 py-2.5"
                />
                <span className="block text-xs text-muted-foreground">
                  {ruleSkuSearchQuery.isFetching ? L("搜索中...") : L("下方选项会随搜索结果更新，不受当前库存分页限制。")}
                </span>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span><Tx>大包装 SKU</Tx></span><select value={ruleForm.parent_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, parent_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value=""><Tx>请选择</Tx></option>{renderSkuOptions(ruleForm.parent_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span><Tx>小包装 SKU</Tx></span><select value={ruleForm.child_variant_id || ""} onChange={(e) => setRuleForm({ ...ruleForm, child_variant_id: e.target.value })} className="w-full rounded-lg bg-secondary px-3 py-2.5"><option value=""><Tx>请选择</Tx></option>{renderSkuOptions(ruleForm.child_variant_id)}</select></label>
                <label className="space-y-1 text-sm"><span><Tx>大包装数量</Tx></span><input type="number" min={1} value={ruleForm.parent_qty ?? 1} onChange={(e) => setRuleForm({ ...ruleForm, parent_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
                <label className="space-y-1 text-sm"><span><Tx>小包装数量</Tx></span><input type="number" min={2} value={ruleForm.child_qty ?? ""} onChange={(e) => setRuleForm({ ...ruleForm, child_qty: Number(e.target.value) })} className="w-full rounded-lg bg-secondary px-3 py-2.5" /></label>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                {([["enabled", "启用规则"], ["auto_unpack_enabled", "自动拆包"], ["manual_unpack_enabled", "允许手动拆包"], ["manual_assemble_enabled", "允许手动组装"]] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                    <input type="checkbox" checked={ruleForm[key] !== false && !!ruleForm[key]} onChange={(e) => setRuleForm({ ...ruleForm, [key]: e.target.checked })} />
                    {L(label)}
                  </label>
                ))}
              </div>
              <textarea value={ruleForm.remark || ""} onChange={(e) => setRuleForm({ ...ruleForm, remark: e.target.value })} placeholder={tText("备注")} className="min-h-20 w-full rounded-lg bg-secondary px-3 py-2.5 text-sm" />
            </>
          ) : null}
        </AdminFormSheet>

        <AdminFormSheet
          open={!!convertForm}
          onOpenChange={(open) => !open && setConvertForm(null)}
          title={convertForm?.type === "unpack" ? L("立即拆包") : L("立即组装")}
          submitText={L("确认")}
          loading={conversionMutation.isPending}
          onSubmit={async () => { await conversionMutation.mutateAsync(); }}
          size="sm"
        >
          {convertForm ? (
            <>
              <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                <p>{L("规则")}：{convertForm.rule.parent_qty} {convertForm.rule.parent_unit_name} = {convertForm.rule.child_qty} {convertForm.rule.child_unit_name}</p>
                <p className="mt-1">{L("大包装当前库存")}：{convertForm.rule.parent_stock}</p>
                <p>{L("小包装当前库存")}：{convertForm.rule.child_stock}</p>
              </div>
              <input type="number" min={1} value={convertForm.parent_qty} onChange={(e) => setConvertForm({ ...convertForm, parent_qty: e.target.value })} placeholder={tText("大包装数量")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
              <input value={convertForm.remark} onChange={(e) => setConvertForm({ ...convertForm, remark: e.target.value })} placeholder={tText("备注")} className="w-full rounded-lg bg-secondary px-4 py-3 text-sm" />
            </>
          ) : null}
        </AdminFormSheet>
      </div>
    </PermissionGate>
  );
}
