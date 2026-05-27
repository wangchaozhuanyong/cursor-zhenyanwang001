import { createElement, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { adminRealtimeQueryOptions } from "@/lib/adminRealtimeQueryOptions";
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
import type { InventoryChangeType, InventorySku, SmartReplenishmentPreviewResult } from "@/types/inventory";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminT } from "@/hooks/useAdminT";
import {
  CHANGE_LABEL,
  CONVERSION_LABEL,
  INVENTORY_BATCH_MAX,
  INVENTORY_PAGE_SIZE,
  validateAdjustQuantity,
  type InventoryTabKey,
  type SmartViewKey,
} from "@/modules/admin/pages/product/inventory/inventoryConstants";
import { skuLabel } from "@/modules/admin/pages/product/inventory/inventoryDisplayUtils";
import type {
  AdjustForm,
  BatchAdjustForm,
  BatchThresholdForm,
  ConvertForm,
  PurchaseFromAlertForm,
  ReceivePurchaseOrderForm,
  RuleForm,
  SmartEditMap,
  SmartReplenishmentForm,
} from "@/modules/admin/pages/product/inventory/inventoryTypes";

const PAGE_SIZE = INVENTORY_PAGE_SIZE;
const BATCH_MAX = INVENTORY_BATCH_MAX;

export function useAdminInventory(initialTab: InventoryTabKey = "skus") {
  const { tText } = useAdminT();
  const L = tText;
  const changeLabel = (key: string) => L(CHANGE_LABEL[key as InventoryChangeType] ?? key);
  const conversionLabel = (key: string) => L(CONVERSION_LABEL[key] ?? key);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<InventoryTabKey>(initialTab);
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
  const summaryQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "summary"], queryFn: fetchInventorySummary, ...adminRealtimeQueryOptions.inventory });

  const skuParams = useMemo(() => ({ page, pageSize: PAGE_SIZE, keyword: keywordValue, stock_status: stockStatus || undefined }), [keywordValue, page, stockStatus]);
  const alertParams = useMemo(() => ({ page: alertsPage, pageSize: PAGE_SIZE, keyword: keywordValue, status: alertStatus || undefined }), [alertStatus, alertsPage, keywordValue]);
  const purchaseOrderParams = useMemo(() => ({ page: purchaseOrdersPage, pageSize: PAGE_SIZE, keyword: keywordValue, status: purchaseStatus || undefined }), [keywordValue, purchaseOrdersPage, purchaseStatus]);
  const recordsParams = useMemo(() => ({ page: recordsPage, pageSize: PAGE_SIZE, keyword: keywordValue, change_type: changeType || undefined }), [changeType, keywordValue, recordsPage]);
  const rulesParams = useMemo(() => ({ page: rulesPage, pageSize: PAGE_SIZE, keyword: keywordValue }), [keywordValue, rulesPage]);
  const conversionsParams = useMemo(() => ({ page: conversionsPage, pageSize: PAGE_SIZE, keyword: keywordValue, type: conversionType || undefined }), [conversionType, conversionsPage, keywordValue]);

  const skusQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "skus", skuParams], queryFn: () => fetchInventorySkus(skuParams), enabled: tab === "skus", ...adminRealtimeQueryOptions.inventory });
  const alertsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "replenishment-alerts", alertParams], queryFn: () => fetchReplenishmentAlerts(alertParams), enabled: tab === "alerts", ...adminRealtimeQueryOptions.inventory });
  const purchaseOrdersQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "purchase-orders", purchaseOrderParams], queryFn: () => fetchPurchaseOrders(purchaseOrderParams), enabled: tab === "purchaseOrders", ...adminRealtimeQueryOptions.inventory });
  const receivingOrderDetailQuery = useQuery({
    queryKey: [...adminQueryKeys.inventoryRoot(), "purchase-order", receivingOrder?.order.id],
    queryFn: () => fetchPurchaseOrder(receivingOrder!.order.id),
    enabled: !!receivingOrder,
    ...adminRealtimeQueryOptions.inventory,
  });
  const recordsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "records", recordsParams], queryFn: () => fetchInventoryRecords(recordsParams), enabled: tab === "records", ...adminRealtimeQueryOptions.inventory });
  const rulesQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "rules", rulesParams], queryFn: () => fetchInventoryPackRules(rulesParams), enabled: tab === "rules" || !!ruleForm || !!convertForm, ...adminRealtimeQueryOptions.operation });
  const conversionsQuery = useQuery({ queryKey: [...adminQueryKeys.inventoryRoot(), "conversions", conversionsParams], queryFn: () => fetchInventoryConversions(conversionsParams), enabled: tab === "conversions", ...adminRealtimeQueryOptions.inventory });
  const ruleSkuSearchQuery = useQuery({
    queryKey: [...adminQueryKeys.inventoryRoot(), "rule-sku-search", ruleSkuKeyword.trim()],
    queryFn: () => fetchInventorySkus({ page: 1, pageSize: 100, keyword: ruleSkuKeyword.trim() || undefined }),
    enabled: !!ruleForm,
    ...adminRealtimeQueryOptions.operation,
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

  const renderSkuOptions = (selectedId?: string) =>
    ruleSkuOptions.map((sku) =>
      createElement("option", { key: `${selectedId || ""}-${sku.variant_id}`, value: sku.variant_id }, skuLabel(sku, L)),
    );

  return {
    L,
    tText,
    changeLabel,
    conversionLabel,
    tab,
    setTab,
    page,
    setPage,
    alertsPage,
    setAlertsPage,
    purchaseOrdersPage,
    setPurchaseOrdersPage,
    recordsPage,
    setRecordsPage,
    rulesPage,
    setRulesPage,
    conversionsPage,
    setConversionsPage,
    keyword,
    setKeyword,
    stockStatus,
    setStockStatus,
    alertStatus,
    setAlertStatus,
    purchaseStatus,
    setPurchaseStatus,
    changeType,
    setChangeType,
    conversionType,
    setConversionType,
    adjusting,
    setAdjusting,
    selectedVariantIds,
    setSelectedVariantIds,
    skuCache,
    batchThreshold,
    setBatchThreshold,
    batchAdjust,
    setBatchAdjust,
    smartForm,
    setSmartForm,
    smartPreview,
    setSmartPreview,
    smartEdits,
    setSmartEdits,
    smartView,
    setSmartView,
    ruleForm,
    setRuleForm,
    ruleSkuKeyword,
    setRuleSkuKeyword,
    convertForm,
    setConvertForm,
    purchaseFromAlert,
    setPurchaseFromAlert,
    receivingOrder,
    setReceivingOrder,
    summaryQuery,
    skusQuery,
    alertsQuery,
    purchaseOrdersQuery,
    receivingOrderDetailQuery,
    recordsQuery,
    rulesQuery,
    conversionsQuery,
    ruleSkuSearchQuery,
    invalidateInventory,
    adjustMutation,
    thresholdMutation,
    batchThresholdMutation,
    batchAdjustMutation,
    saveRuleMutation,
    deleteRuleMutation,
    conversionMutation,
    generateAlertsMutation,
    smartPreviewMutation,
    smartApplyMutation,
    smartCreatePoMutation,
    smartUnpackMutation,
    smartProfileMutation,
    smartProfileLoadMutation,
    dailySnapshotMutation,
    createPoMutation,
    receivePoMutation,
    summary,
    skus,
    allSelectedOnPage,
    selectedCount,
    smartPurchaseableCount,
    smartWatchCount,
    smartUnpackCount,
    smartIncompleteHistoryCount,
    smartUnpackableItemIds,
    toggleVariantSelect,
    togglePageVariantSelection,
    selectedSkuPreview,
    ruleSkuOptions,
    records,
    alerts,
    purchaseOrders,
    rules,
    conversions,
    projectedStock,
    renderSkuOptions,
    batchMax: BATCH_MAX,
  };
}
