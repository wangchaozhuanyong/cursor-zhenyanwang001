import { Tx } from "@/components/admin/AdminText";
import type { SmartViewKey } from "@/modules/admin/pages/product/inventory/inventoryConstants";
import type { SmartReplenishmentForm, SmartEditMap } from "@/modules/admin/pages/product/inventory/inventoryTypes";
import type { InventorySku, InventorySummary, SmartReplenishmentPreviewResult } from "@/types/inventory";
import type { Dispatch, SetStateAction } from "react";
import {
  adminTableCellClass,
  adminTableClassName,
  adminTableHeadCellClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const SMART_TABLE_HEADERS = [
  "SKU", "库存", "在途", "销量/天", "当前下限/上限", "建议下限", "建议上限", "建议补货", "建议动作", "置信度", "原因",
] as const;
const SMART_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "right", "right", "right", "right", "right", "right", "right", "center", "right", "left",
];

export type InventorySmartTabProps = {
  L: (zh: string) => string;
  summary: InventorySummary | undefined;
  selectedCount: number;
  smartView: SmartViewKey;
  setSmartView: (view: SmartViewKey) => void;
  smartForm: SmartReplenishmentForm;
  setSmartForm: Dispatch<SetStateAction<SmartReplenishmentForm>>;
  smartPreview: SmartReplenishmentPreviewResult | null;
  smartEdits: SmartEditMap;
  setSmartEdits: Dispatch<SetStateAction<SmartEditMap>>;
  skuCache: Record<string, InventorySku>;
  smartPurchaseableCount: number;
  smartWatchCount: number;
  smartUnpackCount: number;
  smartIncompleteHistoryCount: number;
  smartUnpackableItemIds: string[];
  smartPreviewMutation: { isPending: boolean; mutate: () => void };
  smartApplyMutation: { isPending: boolean; mutate: () => void };
  smartCreatePoMutation: { isPending: boolean; mutate: () => void };
  smartUnpackMutation: { isPending: boolean; mutate: (ids: string[]) => void };
  dailySnapshotMutation: { isPending: boolean; mutate: () => void };
  smartProfileMutation: { isPending: boolean; mutate: () => void };
  smartProfileLoadMutation: { isPending: boolean; mutate: () => void };
};

export default function InventorySmartTab({
  L,
  summary,
  selectedCount,
  smartView,
  setSmartView,
  smartForm,
  setSmartForm,
  smartPreview,
  smartEdits,
  setSmartEdits,
  skuCache,
  smartPurchaseableCount,
  smartWatchCount,
  smartUnpackCount,
  smartIncompleteHistoryCount,
  smartUnpackableItemIds,
  smartPreviewMutation,
  smartApplyMutation,
  smartCreatePoMutation,
  smartUnpackMutation,
  dailySnapshotMutation,
  smartProfileMutation,
  smartProfileLoadMutation,
}: InventorySmartTabProps) {
  return (
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
            <UnifiedButton
              key={key}
              type="button"
              onClick={() => setSmartView(key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${smartView === key ? "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]" : "bg-secondary text-muted-foreground"}`}
            >
              {L(label)}
            </UnifiedButton>
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
              <UnifiedButton type="button" onClick={() => setSmartView("limits")} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)]">{L("去计算上下限")}</UnifiedButton>
              <UnifiedButton type="button" onClick={() => setSmartView("suggestions")} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{L("查看补货建议")}</UnifiedButton>
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
            <UnifiedButton type="button" onClick={() => smartPreviewMutation.mutate()} disabled={smartPreviewMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60">
              {smartPreviewMutation.isPending ? L("智能计算中...") : L("智能计算")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => dailySnapshotMutation.mutate()} disabled={dailySnapshotMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {dailySnapshotMutation.isPending ? L("生成中...") : L("生成今日快照")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartApplyMutation.mutate()} disabled={!smartPreview || smartApplyMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartApplyMutation.isPending ? L("应用中...") : L("批量应用")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={!smartPreview || smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartCreatePoMutation.isPending ? L("生成中...") : L("生成采购单")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartUnpackMutation.mutate(smartUnpackableItemIds)} disabled={!smartPreview || smartUnpackableItemIds.length <= 0 || smartUnpackMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartUnpackMutation.isPending ? L("拆包中...") : L("批量执行拆包")}
            </UnifiedButton>
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
            <UnifiedButton type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={!smartPreview || smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-50">
              {smartCreatePoMutation.isPending ? L("生成中...") : `${L("生成采购单")} (${smartPurchaseableCount})`}
            </UnifiedButton>
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
            <UnifiedButton type="button" onClick={() => smartApplyMutation.mutate()} disabled={smartApplyMutation.isPending} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60">
              {smartApplyMutation.isPending ? L("应用中...") : L("确认批量应用")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartCreatePoMutation.mutate()} disabled={smartPurchaseableCount <= 0 || smartCreatePoMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartCreatePoMutation.isPending ? L("生成中...") : L("生成采购单")}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartUnpackMutation.mutate(smartUnpackableItemIds)} disabled={smartUnpackableItemIds.length <= 0 || smartUnpackMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartUnpackMutation.isPending ? L("拆包中...") : L("批量执行拆包")}
            </UnifiedButton>
          </div>
          <div className="overflow-x-auto">
            <table className={adminTableClassName("w-full min-w-[1280px] text-sm")}>
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  {SMART_TABLE_HEADERS.map((head, index) => (
                    <th key={head} className={adminTableHeadCellClass(SMART_COLUMN_ALIGNS[index])}>{L(head)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {smartPreview.items.map((item) => {
                  const sku = skuCache[item.variant_id];
                  const edit = smartEdits[item.id] || { lower: String(item.suggested_lower_limit), upper: String(item.suggested_upper_limit), qty: String(item.suggested_replenishment_qty) };
                  return (
                    <tr key={item.id} className="border-b border-border/70">
                      <td className={adminTableCellClass("left")}>
                        <p className="font-medium">{sku?.product_name || item.variant_id}</p>
                        <p className="text-xs text-muted-foreground">{sku?.variant_title || sku?.spec_text || L("SKU")} / {sku?.sku_code || "-"}</p>
                      </td>
                      <td className={adminTableCellClass("right")}>{item.available_stock} / {item.current_stock}</td>
                      <td className={adminTableCellClass("right")}>{item.in_transit_qty}</td>
                      <td className={adminTableCellClass("right")}>{item.sales_qty} / {Number(item.avg_daily_sales || 0).toFixed(2)}</td>
                      <td className={adminTableCellClass("right")}>{item.old_lower_limit ?? "-"} / {item.old_upper_limit ?? "-"}</td>
                      <td className={adminTableCellClass("right")}>
                        <input type="number" min={0} value={edit.lower} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, lower: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs text-right" />
                      </td>
                      <td className={adminTableCellClass("right")}>
                        <input type="number" min={0} value={edit.upper} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, upper: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs text-right" />
                      </td>
                      <td className={adminTableCellClass("right")}>
                        <input type="number" min={0} value={edit.qty} onChange={(e) => setSmartEdits((prev) => ({ ...prev, [item.id]: { ...edit, qty: e.target.value } }))} className="w-24 rounded-lg bg-secondary px-2 py-1.5 text-xs text-right" />
                      </td>
                      <td className={adminTableCellClass("center")}>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {item.suggestion_type === "unpack" ? L("拆包") : item.suggestion_type === "watch" ? L("观察") : L("采购")}
                          </span>
                          {item.suggestion_type === "unpack" ? (
                            <UnifiedButton
                              type="button"
                              onClick={() => smartUnpackMutation.mutate([item.id])}
                              disabled={smartUnpackMutation.isPending || item.apply_status === "unpacked"}
                              className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-50"
                            >
                              {item.apply_status === "unpacked" ? <Tx>已拆包</Tx> : <Tx>执行拆包</Tx>}
                            </UnifiedButton>
                          ) : null}
                        </div>
                      </td>
                      <td className={adminTableCellClass("right")}>{item.confidence_score}%</td>
                      <td className={adminTableCellClass("left", "max-w-[18rem] text-xs text-muted-foreground")}>{item.reason || "-"}</td>
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
            <UnifiedButton type="button" onClick={() => setSmartView("limits")} className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)]"><Tx>去计算上下限</Tx></UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartProfileLoadMutation.mutate()} disabled={selectedCount !== 1 || smartProfileLoadMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartProfileLoadMutation.isPending ? <Tx>加载中...</Tx> : <Tx>加载当前 SKU 规则</Tx>}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => smartProfileMutation.mutate()} disabled={selectedCount <= 0 || smartProfileMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {smartProfileMutation.isPending ? <Tx>保存中...</Tx> : <><Tx>保存到已选 SKU</Tx> ({selectedCount})</>}
            </UnifiedButton>
            <UnifiedButton type="button" onClick={() => dailySnapshotMutation.mutate()} disabled={dailySnapshotMutation.isPending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {dailySnapshotMutation.isPending ? <Tx>生成中...</Tx> : <Tx>生成今日快照</Tx>}
            </UnifiedButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
