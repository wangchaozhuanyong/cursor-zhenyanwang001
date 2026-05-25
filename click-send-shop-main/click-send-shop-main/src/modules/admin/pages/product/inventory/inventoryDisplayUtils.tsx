import type { InventorySku } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { adminTableClassName } from "@/utils/adminTableClasses";

export const INVENTORY_SKU_TABLE_CLASS = adminTableClassName(
  "admin-inventory-sku-table w-full min-w-[1480px] text-left text-sm",
);

export function inventorySkuTd(extra?: string) {
  return cn(
    "h-9 max-h-9 overflow-hidden whitespace-nowrap px-3 py-1 align-middle leading-none",
    extra,
  );
}

export function inventoryInlineText(
  text: string,
  opts?: { maxWidth?: string; mono?: boolean; muted?: boolean; medium?: boolean },
) {
  const line = String(text ?? "").replace(/\s+/g, " ").trim() || "—";
  return (
    <span
      className={cn(
        "inline-block min-w-0 truncate align-middle leading-none",
        opts?.medium ? "text-sm font-medium text-foreground" : "text-sm text-foreground",
        opts?.mono && "font-mono text-xs",
        opts?.muted && "text-muted-foreground",
      )}
      style={{ maxWidth: opts?.maxWidth ?? "10rem" }}
      title={line}
    >
      {line}
    </span>
  );
}

export function skuLabel(sku: InventorySku | null | undefined, tText: (zh: string) => string) {
  if (!sku) return "";
  return `${sku.product_name} / ${sku.variant_title || sku.spec_text || tText("默认规格")} / ${sku.sku_code || "-"}`;
}

export function stockStatusText(sku: InventorySku, tText: (zh: string) => string) {
  if (sku.out_of_stock) return tText("缺货");
  if (sku.low_stock) return tText("低库存");
  return tText("正常");
}
