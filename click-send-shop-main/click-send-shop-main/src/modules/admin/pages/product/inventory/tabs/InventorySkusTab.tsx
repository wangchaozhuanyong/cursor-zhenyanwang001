import Pagination from "@/components/admin/Pagination";
import { Tx } from "@/components/admin/AdminText";
import AnimatedTable from "@/modules/micro-interactions/components/AnimatedTable";
import { ADMIN_TABLE_ALIGN_LEFT_CLASS } from "@/utils/adminTableClasses";
import { INVENTORY_PAGE_SIZE, INVENTORY_SKU_HEADS } from "@/modules/admin/pages/product/inventory/inventoryConstants";
import {
  INVENTORY_SKU_TABLE_CLASS,
  inventoryInlineText,
  inventorySkuTd,
  stockStatusText,
} from "@/modules/admin/pages/product/inventory/inventoryDisplayUtils";
import type { AdjustForm } from "@/modules/admin/pages/product/inventory/inventoryTypes";
import type { InventorySku } from "@/types/inventory";
import { formatDateTime } from "@/utils/formatDateTime";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { THEME_BADGE_SUCCESS, THEME_BADGE_WARNING, THEME_TEXT_DANGER, THEME_TEXT_WARNING } from "@/utils/themeVisuals";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props = {
  skus: InventorySku[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  page: number;
  onPageChange: (page: number) => void;
  total: number;
  selectedVariantIds: string[];
  allSelectedOnPage: boolean;
  onTogglePageSelection: () => void;
  onToggleVariant: (variantId: string) => void;
  onAdjust: (form: AdjustForm) => void;
  thresholdMutation: UseMutationResult<void, Error, { sku: InventorySku; threshold: number }, unknown>;
  renderMobileCard: (sku: InventorySku) => ReactNode;
  L: (zh: string) => string;
  tText: (zh: string) => string;
};

export default function InventorySkusTab({
  skus,
  loading,
  error,
  onRetry,
  page,
  onPageChange,
  total,
  selectedVariantIds,
  allSelectedOnPage,
  onTogglePageSelection,
  onToggleVariant,
  onAdjust,
  thresholdMutation,
  renderMobileCard,
  L,
  tText,
}: Props) {
  const emptyAdjust = (sku: InventorySku, change_type: AdjustForm["change_type"], quantity = ""): AdjustForm => ({
    sku,
    change_type,
    quantity,
    reason: "",
    remark: "",
    source_no: "",
    cost_price: "",
  });

  return (
    <>
      <AnimatedTable
        embedded
        loading={loading}
        error={error}
        errorTitle={L("SKU 库存加载失败")}
        errorDescription={L("库存接口暂时没有返回数据，请检查网络或稍后重试。")}
        onRetry={onRetry}
        rows={skus}
        rowKey={(sku) => sku.variant_id}
        skeletonRows={8}
        skeletonCols={14}
        tableClassName={INVENTORY_SKU_TABLE_CLASS}
        theadClassName="border-b border-border text-xs text-muted-foreground"
        emptyIcon={Package}
        emptyTitle={L("暂无 SKU 库存")}
        emptyDescription={L("创建商品规格后会显示库存。")}
        thead={(
          <tr>
            <th className="w-10 whitespace-nowrap px-3 py-2 text-left">
              <input type="checkbox" checked={allSelectedOnPage} onChange={onTogglePageSelection} aria-label={tText("全选当前页")} />
            </th>
            {INVENTORY_SKU_HEADS.map((head) => (
              <th
                key={head}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-xs font-semibold",
                  head === "操作" ? "text-right" : "text-left",
                  head === "图" && "w-12",
                )}
              >
                {L(head)}
              </th>
            ))}
          </tr>
        )}
        renderMobileCard={renderMobileCard}
        renderRow={(sku) => {
          const checked = selectedVariantIds.includes(sku.variant_id);
          const unit = sku.unit_name || L("件");
          const productName = String(sku.product_name ?? "").replace(/\s+/g, " ").trim();
          const specName = String(sku.variant_title || sku.spec_text || L("默认规格")).replace(/\s+/g, " ").trim();
          const skuCode = String(sku.sku_code ?? "").trim();
          const updatedLabel = sku.updated_at ? formatDateTime(sku.updated_at) : "—";
          return (
            <>
              <td className={inventorySkuTd("w-10")}>
                <input type="checkbox" checked={checked} onChange={() => onToggleVariant(sku.variant_id)} aria-label={`选择 ${productName}`} />
              </td>
              <td className={inventorySkuTd("w-12")}>
                {sku.cover_image ? (
                  <img src={sku.cover_image} alt={`${productName || "商品"} ${specName || "SKU"} 库存图`} className="mx-auto block h-7 w-7 rounded object-cover" />
                ) : (
                  <span className="mx-auto block h-7 w-7 rounded bg-secondary" aria-hidden />
                )}
              </td>
              <td className={inventorySkuTd(ADMIN_TABLE_ALIGN_LEFT_CLASS)}>
                {inventoryInlineText(productName, { maxWidth: "11rem", medium: true })}
              </td>
              <td className={inventorySkuTd(ADMIN_TABLE_ALIGN_LEFT_CLASS)}>
                {inventoryInlineText(specName, { maxWidth: "8rem" })}
              </td>
              <td className={inventorySkuTd(ADMIN_TABLE_ALIGN_LEFT_CLASS)}>
                {inventoryInlineText(skuCode || L("未填写"), { maxWidth: "9rem", mono: true, muted: !skuCode })}
              </td>
              <td className={inventorySkuTd(ADMIN_TABLE_ALIGN_LEFT_CLASS)}>
                {inventoryInlineText(sku.category_name || L("未分类"), { maxWidth: "7rem", muted: true })}
              </td>
              <td className={inventorySkuTd()}>
                <span className={cn("text-sm leading-none", sku.out_of_stock ? `font-bold ${THEME_TEXT_DANGER}` : sku.low_stock ? `font-bold ${THEME_TEXT_WARNING}` : "font-medium")}>
                  {sku.available_stock} {unit}
                </span>
              </td>
              <td className={inventorySkuTd()}>
                <span className="text-sm leading-none text-muted-foreground">{sku.stock} {unit}</span>
              </td>
              <td className={inventorySkuTd()}>{inventoryInlineText(unit, { maxWidth: "3rem" })}</td>
              <td className={inventorySkuTd()}>
                <input
                  type="number"
                  min={0}
                  defaultValue={sku.stock_warning_threshold}
                  onBlur={(e) => {
                    const threshold = Number(e.target.value);
                    if (Number.isInteger(threshold) && threshold >= 0 && threshold !== sku.stock_warning_threshold) {
                      thresholdMutation.mutate({ sku, threshold });
                    }
                  }}
                  className="w-16 rounded-lg bg-secondary px-2 py-1 text-xs leading-none"
                />
              </td>
              <td className={inventorySkuTd("text-xs")}>{inventoryInlineText(stockStatusText(sku, L), { maxWidth: "4rem" })}</td>
              <td className={inventorySkuTd("text-xs text-muted-foreground")}>
                {inventoryInlineText(updatedLabel, { maxWidth: "11rem", mono: true })}
              </td>
              <td className={inventorySkuTd()}>
                <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                  <button type="button" onClick={() => onAdjust(emptyAdjust(sku, "in"))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_SUCCESS}`}><Tx>入库</Tx></button>
                  <button type="button" onClick={() => onAdjust(emptyAdjust(sku, "out"))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${THEME_BADGE_WARNING}`}><Tx>出库</Tx></button>
                  <button type="button" onClick={() => onAdjust(emptyAdjust(sku, "adjust", String(sku.stock)))} className="rounded-lg bg-gold/10 px-3 py-1.5 text-xs text-theme-price"><Tx>盘点</Tx></button>
                </div>
              </td>
            </>
          );
        }}
      />
      {!error ? (
        <Pagination total={total} page={page} pageSize={INVENTORY_PAGE_SIZE} onPageChange={onPageChange} onPageSizeChange={() => undefined} showPageSizeSelect={false} />
      ) : null}
    </>
  );
}
