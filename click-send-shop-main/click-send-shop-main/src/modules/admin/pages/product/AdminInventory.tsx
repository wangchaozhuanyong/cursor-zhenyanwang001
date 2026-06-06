import { Download, Plus, RefreshCcw } from "lucide-react";
import PermissionGate from "@/components/admin/PermissionGate";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import {
  AdminFilterButton,
  AdminFilterSelect,
} from "@/components/admin/AdminFilterControls";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import AdminPageShell from "@/components/admin/AdminPageShell";
import InventoryFormSheets from "@/modules/admin/pages/product/inventory/InventoryFormSheets";
import {
  exportInventoryRecordsCsv,
  exportInventorySkusCsv,
} from "@/services/admin/inventoryService";
import type { InventoryConversionOrder, InventoryPackRule, InventoryReplenishmentAlert, InventorySku, InventoryStockRecord, PurchaseOrder } from "@/types/inventory";
import { formatDateTime } from "@/utils/formatDateTime";
import { THEME_BADGE_SUCCESS, THEME_BADGE_WARNING, THEME_TEXT_DANGER, THEME_TEXT_SUCCESS_SOFT, THEME_TEXT_WARNING } from "@/utils/themeVisuals";
import { Tx } from "@/components/admin/AdminText";
import {
  ALERT_STATUS_LABEL,
  CHANGE_LABEL,
  PURCHASE_STATUS_LABEL,
  type InventoryTabKey,
} from "@/modules/admin/pages/product/inventory/inventoryConstants";
import { stockStatusText } from "@/modules/admin/pages/product/inventory/inventoryDisplayUtils";
import { useAdminInventory } from "@/modules/admin/pages/product/inventory/useAdminInventory";
import InventorySkusTab from "@/modules/admin/pages/product/inventory/tabs/InventorySkusTab";
import InventorySmartTab from "@/modules/admin/pages/product/inventory/tabs/InventorySmartTab";
import {
  InventoryAlertsTab,
  InventoryConversionsTab,
  InventoryPurchaseOrdersTab,
  InventoryRecordsTab,
  InventoryRulesTab,
} from "@/modules/admin/pages/product/inventory/tabs/InventorySimpleListTabs";
import { EMPTY_BATCH_ADJUST } from "@/modules/admin/pages/product/inventory/inventoryTypes";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type TabKey = InventoryTabKey;

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
  const inv = useAdminInventory(initialTab);
  const {
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
    batchThreshold,
    setBatchThreshold,
    batchAdjust,
    setBatchAdjust,
    smartForm,
    setSmartForm,
    smartPreview,
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
    dailySnapshotMutation,
    smartProfileMutation,
    smartProfileLoadMutation,
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
    skuCache,
    toggleVariantSelect,
    togglePageVariantSelection,
    selectedSkuPreview,
    records,
    alerts,
    purchaseOrders,
    rules,
    conversions,
    projectedStock,
    renderSkuOptions,
    batchMax: BATCH_MAX,
  } = inv;

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
            <img src={sku.cover_image} alt={`${sku.product_name || "商品"} 库存商品图`} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
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
          <UnifiedButton type="button" onClick={() => setAdjusting({ sku, change_type: "in", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`touch-manipulation rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}><Tx>入库</Tx></UnifiedButton>
          <UnifiedButton type="button" onClick={() => setAdjusting({ sku, change_type: "out", quantity: "", reason: "", remark: "", source_no: "", cost_price: "" })} className={`touch-manipulation rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}><Tx>出库</Tx></UnifiedButton>
          <UnifiedButton type="button" onClick={() => setAdjusting({ sku, change_type: "adjust", quantity: String(sku.stock), reason: "", remark: "", source_no: "", cost_price: "" })} className="touch-manipulation rounded-lg bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-3 py-1.5 text-xs text-theme-price"><Tx>盘点</Tx></UnifiedButton>
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
          <UnifiedButton type="button" onClick={() => setPurchaseFromAlert({ alert: row, ordered_qty: String(Math.max(row.suggested_qty, row.warning_stock - row.available_stock, 1)), unit_cost: "", expected_arrival_date: "", remark: "" })} className="rounded-lg bg-[var(--theme-price)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-price-foreground)]"><Tx>生成采购单</Tx></UnifiedButton>
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
          <UnifiedButton type="button" onClick={() => setReceivingOrder({ order: row, remark: "", actual_arrival_date: "", items: {} })} className="rounded-lg bg-[var(--theme-price)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-price-foreground)]"><Tx>确认到货入库</Tx></UnifiedButton>
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
        <UnifiedButton type="button" onClick={() => setConvertForm({ type: "unpack", rule: row, parent_qty: "1", remark: "" })} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即拆包</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => setConvertForm({ type: "assemble", rule: row, parent_qty: "1", remark: "" })} className="touch-manipulation rounded-lg border border-border px-3 py-1.5 text-xs"><Tx>立即组装</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => setRuleForm(row)} className="touch-manipulation rounded-lg bg-secondary px-3 py-1.5 text-xs"><Tx>编辑</Tx></UnifiedButton>
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
    <PermissionGate permission="inventory.manage" mode="page">
      <AdminPageShell
        hint={pageHint || L("按 SKU 管理库存、流水、组装拆包规则和转换单据。")}
        toolbar={(
          <div className="flex gap-2">
            <UnifiedButton onClick={() => void exportInventorySkusCsv({ keyword, stock_status: stockStatus })} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><Download size={15} /><Tx>导出库存</Tx></UnifiedButton>
            <UnifiedButton onClick={() => void invalidateInventory()} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><RefreshCcw size={15} /><Tx>刷新</Tx></UnifiedButton>
          </div>
        )}
      >
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
            ] as const).map(([key, label]) => <UnifiedButton key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]" : "bg-secondary text-muted-foreground"}`}>{L(label)}</UnifiedButton>)}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <AdminSearchInput
              value={keyword}
              onChange={(value) => { setKeyword(value); setPage(1); setAlertsPage(1); setPurchaseOrdersPage(1); setRecordsPage(1); setRulesPage(1); setConversionsPage(1); }}
              placeholder={tText("搜索商品、SKU、单据号...")}
              containerClassName="min-w-[260px] max-w-sm flex-1"
              className="border-0 bg-secondary pr-3.5"
            />
            {tab === "skus" ? (
              <>
                <AdminFilterSelect value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as typeof stockStatus); setPage(1); }} variant="card" className="border-0 bg-secondary"><option value=""><Tx>全部库存状态</Tx></option><option value="normal"><Tx>正常</Tx></option><option value="low"><Tx>低库存</Tx></option><option value="out"><Tx>缺货</Tx></option></AdminFilterSelect>
                <AdminFilterButton disabled={selectedCount === 0} onClick={() => setBatchThreshold({ threshold: "10" })} variant="card" className="disabled:opacity-50">{L("批量预警值")} ({selectedCount})</AdminFilterButton>
                <AdminFilterButton disabled={selectedCount === 0} onClick={() => setBatchAdjust({ ...EMPTY_BATCH_ADJUST })} variant="card" className="disabled:opacity-50">{L("批量库存调整")} ({selectedCount})</AdminFilterButton>
                {selectedCount > 0 ? (
                  <UnifiedButton type="button" onClick={() => setSelectedVariantIds([])} className="rounded-lg bg-secondary px-3 py-2.5 text-xs text-muted-foreground"><Tx>清空选择</Tx></UnifiedButton>
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
                <UnifiedButton type="button" onClick={() => smartPreviewMutation.mutate()} disabled={smartPreviewMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60">
                  {smartPreviewMutation.isPending ? L("计算中...") : selectedCount > 0 ? `${L("计算已选 SKU")} (${selectedCount})` : L("计算全部 SKU")}
                </UnifiedButton>
              </>
            ) : null}
            {tab === "alerts" ? (
              <>
                <select value={alertStatus} onChange={(e) => { setAlertStatus(e.target.value); setAlertsPage(1); }} className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
                  <option value=""><Tx>全部预警状态</Tx></option>
                  {Object.entries(ALERT_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{L(label)}</option>)}
                </select>
                <UnifiedButton type="button" onClick={() => generateAlertsMutation.mutate()} disabled={generateAlertsMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60">
                  {generateAlertsMutation.isPending ? L("扫描中...") : L("扫描生成预警")}
                </UnifiedButton>
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
            {tab === "rules" ? <UnifiedButton onClick={() => setRuleForm({ parent_qty: 1, child_qty: 0, enabled: true, manual_unpack_enabled: true, manual_assemble_enabled: true, auto_unpack_enabled: false })} className="flex items-center gap-2 rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]"><Plus size={15} /><Tx>新增规则</Tx></UnifiedButton> : null}
            {tab === "records" ? <UnifiedButton type="button" onClick={() => void exportInventoryRecordsCsv({ keyword, change_type: changeType })} className="rounded-lg border border-border px-3 py-2.5 text-sm"><Tx>导出流水</Tx></UnifiedButton> : null}
          </div>
        </div>

        {tab === "skus" ? (
          <InventorySkusTab
            skus={skus}
            loading={skusQuery.isLoading && !skusQuery.data}
            error={skusQuery.isError && !skusQuery.data}
            onRetry={() => { void skusQuery.refetch(); }}
            page={page}
            onPageChange={setPage}
            total={skusQuery.data?.total || 0}
            selectedVariantIds={selectedVariantIds}
            allSelectedOnPage={allSelectedOnPage}
            onTogglePageSelection={togglePageVariantSelection}
            onToggleVariant={toggleVariantSelect}
            onAdjust={setAdjusting}
            thresholdMutation={thresholdMutation}
            renderMobileCard={renderSkuMobileCard}
            L={L}
            tText={tText}
          />
        ) : null}

        {tab === "smart" ? (
          <InventorySmartTab
            L={L}
            summary={summary}
            selectedCount={selectedCount}
            smartView={smartView}
            setSmartView={setSmartView}
            smartForm={smartForm}
            setSmartForm={setSmartForm}
            smartPreview={smartPreview}
            smartEdits={smartEdits}
            setSmartEdits={setSmartEdits}
            skuCache={skuCache}
            smartPurchaseableCount={smartPurchaseableCount}
            smartWatchCount={smartWatchCount}
            smartUnpackCount={smartUnpackCount}
            smartIncompleteHistoryCount={smartIncompleteHistoryCount}
            smartUnpackableItemIds={smartUnpackableItemIds}
            smartPreviewMutation={smartPreviewMutation}
            smartApplyMutation={smartApplyMutation}
            smartCreatePoMutation={smartCreatePoMutation}
            smartUnpackMutation={smartUnpackMutation}
            dailySnapshotMutation={dailySnapshotMutation}
            smartProfileMutation={smartProfileMutation}
            smartProfileLoadMutation={smartProfileLoadMutation}
          />
        ) : null}

        {tab === "alerts" ? (
          <InventoryAlertsTab
            alerts={alerts}
            loading={alertsQuery.isLoading && !alertsQuery.data}
            error={alertsQuery.isError && !alertsQuery.data}
            onRetry={() => { void alertsQuery.refetch(); }}
            page={alertsPage}
            total={alertsQuery.data?.total || 0}
            onPageChange={setAlertsPage}
            onCreatePo={setPurchaseFromAlert}
            renderMobileCard={renderAlertMobileCard}
            L={L}
          />
        ) : null}

        {tab === "purchaseOrders" ? (
          <InventoryPurchaseOrdersTab
            purchaseOrders={purchaseOrders}
            loading={purchaseOrdersQuery.isLoading && !purchaseOrdersQuery.data}
            error={purchaseOrdersQuery.isError && !purchaseOrdersQuery.data}
            onRetry={() => { void purchaseOrdersQuery.refetch(); }}
            page={purchaseOrdersPage}
            total={purchaseOrdersQuery.data?.total || 0}
            onPageChange={setPurchaseOrdersPage}
            onReceive={(order) => setReceivingOrder({ order, remark: "", actual_arrival_date: "", items: {} })}
            renderMobileCard={renderPurchaseOrderMobileCard}
            L={L}
          />
        ) : null}

        {tab === "records" ? (
          <InventoryRecordsTab
            records={records}
            loading={recordsQuery.isLoading && !recordsQuery.data}
            error={recordsQuery.isError && !recordsQuery.data}
            onRetry={() => { void recordsQuery.refetch(); }}
            page={recordsPage}
            total={recordsQuery.data?.total || 0}
            onPageChange={setRecordsPage}
            changeLabel={changeLabel}
            renderMobileCard={renderRecordMobileCard}
            L={L}
          />
        ) : null}

        {tab === "rules" ? (
          <InventoryRulesTab
            rules={rules}
            loading={rulesQuery.isLoading && !rulesQuery.data}
            error={rulesQuery.isError && !rulesQuery.data}
            onRetry={() => { void rulesQuery.refetch(); }}
            page={rulesPage}
            total={rulesQuery.data?.total || 0}
            onPageChange={setRulesPage}
            onEdit={setRuleForm}
            onDelete={(id) => deleteRuleMutation.mutate(id)}
            onConvert={(type, rule) => setConvertForm({ type, rule, parent_qty: "1", remark: "" })}
            renderMobileCard={renderRuleMobileCard}
            L={L}
          />
        ) : null}

        {tab === "conversions" ? (
          <InventoryConversionsTab
            conversions={conversions}
            loading={conversionsQuery.isLoading && !conversionsQuery.data}
            error={conversionsQuery.isError && !conversionsQuery.data}
            onRetry={() => { void conversionsQuery.refetch(); }}
            page={conversionsPage}
            total={conversionsQuery.data?.total || 0}
            onPageChange={setConversionsPage}
            conversionLabel={conversionLabel}
            renderMobileCard={renderConversionMobileCard}
            L={L}
          />
        ) : null}

        <InventoryFormSheets
          L={L}
          tText={tText}
          changeLabel={changeLabel}
          BATCH_MAX={BATCH_MAX}
          selectedCount={selectedCount}
          selectedSkuPreview={selectedSkuPreview}
          projectedStock={projectedStock}
          purchaseFromAlert={purchaseFromAlert}
          setPurchaseFromAlert={setPurchaseFromAlert}
          receivingOrder={receivingOrder}
          setReceivingOrder={setReceivingOrder}
          receivingOrderDetailQuery={receivingOrderDetailQuery}
          batchThreshold={batchThreshold}
          setBatchThreshold={setBatchThreshold}
          batchAdjust={batchAdjust}
          setBatchAdjust={setBatchAdjust}
          adjusting={adjusting}
          setAdjusting={setAdjusting}
          ruleForm={ruleForm}
          setRuleForm={setRuleForm}
          ruleSkuKeyword={ruleSkuKeyword}
          setRuleSkuKeyword={setRuleSkuKeyword}
          ruleSkuSearchQuery={ruleSkuSearchQuery}
          convertForm={convertForm}
          setConvertForm={setConvertForm}
          renderSkuOptions={renderSkuOptions}
          createPoMutation={createPoMutation}
          receivePoMutation={receivePoMutation}
          batchThresholdMutation={batchThresholdMutation}
          batchAdjustMutation={batchAdjustMutation}
          adjustMutation={adjustMutation}
          saveRuleMutation={saveRuleMutation}
          conversionMutation={conversionMutation}
        />
      </AdminPageShell>
    </PermissionGate>
  );
}
