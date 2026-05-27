import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import { Tx } from "@/components/admin/AdminText";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import type { InventorySku, PurchaseOrderDetail } from "@/types/inventory";
import type { PaginatedData } from "@/types/common";
import { skuLabel } from "@/modules/admin/pages/product/inventory/inventoryDisplayUtils";
import type {
  AdjustForm,
  BatchAdjustForm,
  BatchThresholdForm,
  ConvertForm,
  PurchaseFromAlertForm,
  ReceivePurchaseOrderForm,
  RuleForm,
} from "@/modules/admin/pages/product/inventory/inventoryTypes";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";

type MutationLike = Pick<UseMutationResult<unknown, Error, void, unknown>, "isPending" | "mutateAsync">;

function stringifyForm(value: unknown) {
  return JSON.stringify(value);
}

export type InventoryFormSheetsProps = {
  L: (zh: string) => string;
  tText: (zh: string) => string;
  changeLabel: (key: string) => string;
  BATCH_MAX: number;
  selectedCount: number;
  selectedSkuPreview: InventorySku[];
  projectedStock: number;
  purchaseFromAlert: PurchaseFromAlertForm | null;
  setPurchaseFromAlert: (value: PurchaseFromAlertForm | null) => void;
  receivingOrder: ReceivePurchaseOrderForm | null;
  setReceivingOrder: (value: ReceivePurchaseOrderForm | null) => void;
  receivingOrderDetailQuery: UseQueryResult<PurchaseOrderDetail>;
  batchThreshold: BatchThresholdForm | null;
  setBatchThreshold: (value: BatchThresholdForm | null) => void;
  batchAdjust: BatchAdjustForm | null;
  setBatchAdjust: (value: BatchAdjustForm | null) => void;
  adjusting: AdjustForm | null;
  setAdjusting: (value: AdjustForm | null) => void;
  ruleForm: RuleForm | null;
  setRuleForm: (value: RuleForm | null) => void;
  ruleSkuKeyword: string;
  setRuleSkuKeyword: (value: string) => void;
  ruleSkuSearchQuery: UseQueryResult<PaginatedData<InventorySku>>;
  convertForm: ConvertForm | null;
  setConvertForm: (value: ConvertForm | null) => void;
  renderSkuOptions: (selectedId?: string) => ReactNode;
  createPoMutation: MutationLike;
  receivePoMutation: MutationLike;
  batchThresholdMutation: MutationLike;
  batchAdjustMutation: MutationLike;
  adjustMutation: MutationLike;
  saveRuleMutation: MutationLike;
  conversionMutation: MutationLike;
};

export default function InventoryFormSheets({
  L,
  tText,
  changeLabel,
  BATCH_MAX,
  selectedCount,
  selectedSkuPreview,
  projectedStock,
  purchaseFromAlert,
  setPurchaseFromAlert,
  receivingOrder,
  setReceivingOrder,
  receivingOrderDetailQuery,
  batchThreshold,
  setBatchThreshold,
  batchAdjust,
  setBatchAdjust,
  adjusting,
  setAdjusting,
  ruleForm,
  setRuleForm,
  ruleSkuKeyword,
  setRuleSkuKeyword,
  ruleSkuSearchQuery,
  convertForm,
  setConvertForm,
  renderSkuOptions,
  createPoMutation,
  receivePoMutation,
  batchThresholdMutation,
  batchAdjustMutation,
  adjustMutation,
  saveRuleMutation,
  conversionMutation,
}: InventoryFormSheetsProps) {
  const purchaseBaselineRef = useRef<string | null>(null);
  const receivingBaselineRef = useRef<string | null>(null);
  const batchThresholdBaselineRef = useRef<string | null>(null);
  const batchAdjustBaselineRef = useRef<string | null>(null);
  const adjustingBaselineRef = useRef<string | null>(null);
  const ruleBaselineRef = useRef<string | null>(null);
  const convertBaselineRef = useRef<string | null>(null);

  const purchaseSerialized = useMemo(
    () => (
      purchaseFromAlert
        ? stringifyForm({
            ordered_qty: purchaseFromAlert.ordered_qty,
            unit_cost: purchaseFromAlert.unit_cost,
            expected_arrival_date: purchaseFromAlert.expected_arrival_date,
            remark: purchaseFromAlert.remark,
          })
        : null
    ),
    [purchaseFromAlert],
  );

  const receivingSerialized = useMemo(() => {
    if (!receivingOrder || !receivingOrderDetailQuery.data) return null;
    return stringifyForm({
      actual_arrival_date: receivingOrder.actual_arrival_date,
      remark: receivingOrder.remark,
      items: (receivingOrderDetailQuery.data.items || []).map((item) => {
        const formItem = receivingOrder.items[item.id] || {
          received_qty: String(item.remaining_qty),
          unit_cost: item.unit_cost == null ? "" : String(item.unit_cost),
        };
        return {
          id: item.id,
          received_qty: formItem.received_qty,
          unit_cost: formItem.unit_cost,
        };
      }),
    });
  }, [receivingOrder, receivingOrderDetailQuery.data]);

  const batchThresholdSerialized = useMemo(
    () => (batchThreshold ? stringifyForm({ threshold: batchThreshold.threshold }) : null),
    [batchThreshold],
  );

  const batchAdjustSerialized = useMemo(
    () => (
      batchAdjust
        ? stringifyForm({
            change_type: batchAdjust.change_type,
            quantity: batchAdjust.quantity,
            reason: batchAdjust.reason,
            remark: batchAdjust.remark,
            source_no: batchAdjust.source_no,
            cost_price: batchAdjust.cost_price,
          })
        : null
    ),
    [batchAdjust],
  );

  const adjustingSerialized = useMemo(
    () => (
      adjusting
        ? stringifyForm({
            change_type: adjusting.change_type,
            quantity: adjusting.quantity,
            reason: adjusting.reason,
            remark: adjusting.remark,
            source_no: adjusting.source_no,
            cost_price: adjusting.cost_price,
          })
        : null
    ),
    [adjusting],
  );

  const ruleSerialized = useMemo(
    () => (
      ruleForm
        ? stringifyForm({
            id: ruleForm.id ?? null,
            parent_variant_id: ruleForm.parent_variant_id || "",
            child_variant_id: ruleForm.child_variant_id || "",
            parent_qty: ruleForm.parent_qty ?? 1,
            child_qty: ruleForm.child_qty ?? 0,
            enabled: ruleForm.enabled !== false,
            auto_unpack_enabled: !!ruleForm.auto_unpack_enabled,
            manual_unpack_enabled: ruleForm.manual_unpack_enabled !== false,
            manual_assemble_enabled: ruleForm.manual_assemble_enabled !== false,
            remark: ruleForm.remark || "",
          })
        : null
    ),
    [ruleForm],
  );

  const convertSerialized = useMemo(
    () => (
      convertForm
        ? stringifyForm({
            type: convertForm.type,
            parent_qty: convertForm.parent_qty,
            remark: convertForm.remark,
          })
        : null
    ),
    [convertForm],
  );

  useEffect(() => {
    if (!purchaseFromAlert) {
      purchaseBaselineRef.current = null;
      return;
    }
    if (purchaseBaselineRef.current === null && purchaseSerialized !== null) {
      purchaseBaselineRef.current = purchaseSerialized;
    }
  }, [purchaseFromAlert, purchaseSerialized]);

  useEffect(() => {
    if (!receivingOrder) {
      receivingBaselineRef.current = null;
      return;
    }
    if (receivingBaselineRef.current === null && receivingSerialized !== null) {
      receivingBaselineRef.current = receivingSerialized;
    }
  }, [receivingOrder, receivingSerialized]);

  useEffect(() => {
    if (!batchThreshold) {
      batchThresholdBaselineRef.current = null;
      return;
    }
    if (batchThresholdBaselineRef.current === null && batchThresholdSerialized !== null) {
      batchThresholdBaselineRef.current = batchThresholdSerialized;
    }
  }, [batchThreshold, batchThresholdSerialized]);

  useEffect(() => {
    if (!batchAdjust) {
      batchAdjustBaselineRef.current = null;
      return;
    }
    if (batchAdjustBaselineRef.current === null && batchAdjustSerialized !== null) {
      batchAdjustBaselineRef.current = batchAdjustSerialized;
    }
  }, [batchAdjust, batchAdjustSerialized]);

  useEffect(() => {
    if (!adjusting) {
      adjustingBaselineRef.current = null;
      return;
    }
    if (adjustingBaselineRef.current === null && adjustingSerialized !== null) {
      adjustingBaselineRef.current = adjustingSerialized;
    }
  }, [adjusting, adjustingSerialized]);

  useEffect(() => {
    if (!ruleForm) {
      ruleBaselineRef.current = null;
      return;
    }
    if (ruleBaselineRef.current === null && ruleSerialized !== null) {
      ruleBaselineRef.current = ruleSerialized;
    }
  }, [ruleForm, ruleSerialized]);

  useEffect(() => {
    if (!convertForm) {
      convertBaselineRef.current = null;
      return;
    }
    if (convertBaselineRef.current === null && convertSerialized !== null) {
      convertBaselineRef.current = convertSerialized;
    }
  }, [convertForm, convertSerialized]);

  const anyDirty = Boolean(
    (purchaseSerialized && purchaseBaselineRef.current !== null && purchaseSerialized !== purchaseBaselineRef.current)
      || (receivingSerialized && receivingBaselineRef.current !== null && receivingSerialized !== receivingBaselineRef.current)
      || (batchThresholdSerialized && batchThresholdBaselineRef.current !== null && batchThresholdSerialized !== batchThresholdBaselineRef.current)
      || (batchAdjustSerialized && batchAdjustBaselineRef.current !== null && batchAdjustSerialized !== batchAdjustBaselineRef.current)
      || (adjustingSerialized && adjustingBaselineRef.current !== null && adjustingSerialized !== adjustingBaselineRef.current)
      || (ruleSerialized && ruleBaselineRef.current !== null && ruleSerialized !== ruleBaselineRef.current)
      || (convertSerialized && convertBaselineRef.current !== null && convertSerialized !== convertBaselineRef.current),
  );
  useAdminTabDirty(anyDirty);

  return (
    <>
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
            <SegmentedDateInput value={purchaseFromAlert.expected_arrival_date} onChange={(expected_arrival_date) => setPurchaseFromAlert({ ...purchaseFromAlert, expected_arrival_date })} controlClassName="px-4 py-3" />
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
            <SegmentedDateInput value={receivingOrder.actual_arrival_date} onChange={(actual_arrival_date) => setReceivingOrder({ ...receivingOrder, actual_arrival_date })} controlClassName="px-4 py-3" />
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
              <AdminSearchInput
                value={ruleSkuKeyword}
                onChange={setRuleSkuKeyword}
                placeholder={tText("搜索商品名、SKU 编码、规格名或条码")}
                showIcon={false}
                className="border-0 bg-secondary"
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
    </>
  );
}
