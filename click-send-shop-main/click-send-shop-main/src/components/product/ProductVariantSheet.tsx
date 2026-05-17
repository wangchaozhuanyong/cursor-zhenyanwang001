import { Minus, Plus } from "lucide-react";
import type { Product, ProductVariant } from "@/types/product";
import { BottomSheet, SquishButton } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";

type PurchaseIntent = "cart" | "buy";

export type ProductVariantSheetProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  variants: ProductVariant[];
  selectedVariantId: string;
  onSelectVariant: (id: string) => void;
  qty: number;
  onQtyChange: (qty: number) => void;
  maxQty: number;
  soldOut: boolean;
  intent: PurchaseIntent;
  onConfirm: () => void;
};

function formatMoney(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/\.00$/, "");
}

export default function ProductVariantSheet({
  open,
  onClose,
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
  qty,
  onQtyChange,
  maxQty,
  soldOut,
  intent,
  onConfirm,
}: ProductVariantSheetProps) {
  const selected = variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = Number(selected?.price ?? product.price) || 0;
  const lineTotal = unitPrice * Math.max(0, qty);
  const title = intent === "cart" ? "加入购物车" : "立即购买";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      height="auto"
      stickyFooter
      footer={
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 px-0.5">
            <span className="text-sm text-[var(--theme-text-muted)]">共实付</span>
            <span className="text-xl font-bold tabular-nums text-[var(--theme-price)]">
              RM {formatMoney(lineTotal)}
            </span>
          </div>
          <SquishButton
            type="button"
            variant="gold"
            disabled={soldOut || maxQty <= 0}
            onClick={onConfirm}
            className="min-h-12 w-full rounded-full text-sm font-semibold"
          >
            {soldOut ? "已售罄" : title}
          </SquishButton>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium text-[var(--theme-text)]">{product.name}</p>
          <p className="shrink-0 text-lg font-bold tabular-nums text-[var(--theme-price)]">
            RM {formatMoney(unitPrice)}
          </p>
        </div>
        {variants.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--theme-text-muted)]">规格</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((variant) => {
                const active = variant.id === selectedVariantId;
                const disabled = variant.stock <= 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectVariant(variant.id)}
                    className={cn(
                      "min-h-14 rounded-xl border px-3 py-2 text-left text-xs disabled:opacity-45",
                      active
                        ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-bg)]",
                    )}
                  >
                    <span className="block truncate font-semibold">
                      {variant.title || variant.sku_code || "默认"}
                    </span>
                    <span className="mt-1 block text-[var(--theme-text-muted)]">库存 {variant.stock}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">数量</span>
          <div className="flex items-center gap-2 rounded-full border border-[var(--theme-border)]">
            <button
              type="button"
              disabled={qty <= 1 || soldOut}
              onClick={() => onQtyChange(Math.max(1, qty - 1))}
              className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
              aria-label="减少"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              disabled={soldOut || qty >= maxQty}
              onClick={() => onQtyChange(Math.min(maxQty, qty + 1))}
              className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
              aria-label="增加"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
