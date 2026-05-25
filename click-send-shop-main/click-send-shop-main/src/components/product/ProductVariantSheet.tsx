import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
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
  const specGroups = product.spec_groups ?? [];
  const hasMatrix = specGroups.length > 0;
  const selectedValueIds = new Set(selected?.spec_value_ids ?? []);
  const unitPrice = Number(selected?.price ?? product.price) || 0;
  const originalPrice = Number(selected?.original_price ?? product.original_price ?? 0) || 0;
  const showOriginalPrice = originalPrice > unitPrice;
  const lineTotal = unitPrice * Math.max(0, qty);
  const title = intent === "cart" ? "加入购物车" : "立即购买";

  const clampQty = (value: number) => {
    if (maxQty <= 0 || soldOut) return 0;
    return Math.max(1, Math.min(value, maxQty));
  };

  const tryChangeQty = (next: number, source: "plus" | "minus" | "input") => {
    if (soldOut || maxQty <= 0) {
      toast.error("库存不足");
      return;
    }
    if (!Number.isFinite(next)) return;
    if (next > maxQty) {
      onQtyChange(clampQty(next));
      toast.error(source === "input" ? `最多可购买 ${maxQty} 件` : "已达到库存上限");
      return;
    }
    if (next < 1) {
      onQtyChange(1);
      return;
    }
    onQtyChange(next);
  };

  const matchVariantByValues = (valueIds: string[]) => {
    const wanted = new Set(valueIds.filter(Boolean));
    return (
      variants.find((variant) => {
        const ids = variant.spec_value_ids ?? [];
        return ids.length === specGroups.length && ids.every((id) => wanted.has(id));
      }) ?? null
    );
  };

  const selectSpecValue = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) nextByGroup.set(spec.group_id, spec.value_id);
    nextByGroup.set(groupId, valueId);
    const nextIds = specGroups.map((group) => nextByGroup.get(group.id)).filter((id): id is string => !!id);
    const matched = matchVariantByValues(nextIds);
    if (matched) {
      onSelectVariant(matched.id);
      return;
    }
    const partial = variants.find((variant) => nextIds.every((id) => (variant.spec_value_ids ?? []).includes(id)));
    if (partial) onSelectVariant(partial.id);
  };

  const isValueAvailable = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) {
      if (spec.group_id !== groupId) nextByGroup.set(spec.group_id, spec.value_id);
    }
    nextByGroup.set(groupId, valueId);
    const picked = [...nextByGroup.values()];
    return variants.some((variant) => {
      if (variant.enabled === false || variant.stock <= 0) return false;
      const ids = variant.spec_value_ids ?? [];
      return picked.every((id) => ids.includes(id));
    });
  };

  const isValueOutOfStock = (groupId: string, valueId: string) => {
    const nextByGroup = new Map<string, string>();
    for (const spec of selected?.spec_values ?? []) {
      if (spec.group_id !== groupId) nextByGroup.set(spec.group_id, spec.value_id);
    }
    nextByGroup.set(groupId, valueId);
    const picked = [...nextByGroup.values()];
    const matched = variants.filter((variant) => {
      if (variant.enabled === false) return false;
      const ids = variant.spec_value_ids ?? [];
      return picked.every((id) => ids.includes(id));
    });
    return matched.length > 0 && matched.every((variant) => Number(variant.stock || 0) <= 0);
  };

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
            <span className="text-sm text-[var(--theme-text-muted)]">合计</span>
            <span className="text-xl font-bold tabular-nums text-[var(--theme-price)]">
              RM {formatMoney(lineTotal)}
            </span>
          </div>
          <SquishButton
            type="button"
            variant="gold"
            disabled={soldOut || maxQty <= 0 || (hasMatrix && !selected)}
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
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums text-[var(--theme-price)]">RM {formatMoney(unitPrice)}</p>
            {showOriginalPrice ? (
              <p className="text-xs text-[var(--theme-text-muted)] line-through">RM {formatMoney(originalPrice)}</p>
            ) : null}
          </div>
        </div>

        {hasMatrix ? (
          <div className="space-y-4">
            {specGroups.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-xs font-medium text-[var(--theme-text-muted)]">{group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(group.values ?? []).map((value) => {
                    const active = selectedValueIds.has(value.id);
                    const disabled = !isValueAvailable(group.id, value.id);
                    const outOfStock = disabled && isValueOutOfStock(group.id, value.id);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectSpecValue(group.id, value.id)}
                        className={cn(
                          "relative min-h-10 rounded-full border px-4 py-2 text-sm disabled:opacity-45",
                          active
                            ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,transparent)] font-semibold"
                            : "border-[var(--theme-border)] bg-[var(--theme-bg)]",
                        )}
                      >
                        {value.value}
                        {outOfStock ? (
                          <span className="absolute -right-1 -top-1 rounded-full bg-[var(--theme-muted)] px-1.5 py-0.5 text-[10px] leading-none text-white">
                            缺货
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {selected ? (
              <p className="text-xs text-[var(--theme-text-muted)]">
                {selected.spec_text || selected.title || selected.sku_code || "默认规格"} · 库存 {selected.stock}
              </p>
            ) : null}
          </div>
        ) : variants.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--theme-text-muted)]">规格</p>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((variant) => {
                const active = variant.id === selectedVariantId;
                const disabled = variant.enabled === false || variant.stock <= 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectVariant(variant.id)}
                    className={cn(
                      "relative min-h-14 rounded-xl border px-3 py-2 text-left text-xs disabled:opacity-45",
                      active
                        ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)]"
                        : "border-[var(--theme-border)] bg-[var(--theme-bg)]",
                    )}
                  >
                    <span className="block truncate font-semibold">
                      {variant.spec_text || variant.title || variant.sku_code || "默认"}
                    </span>
                    <span className="mt-1 block text-[var(--theme-text-muted)]">库存 {variant.stock}</span>
                    {variant.stock <= 0 ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[var(--theme-muted)] px-1.5 py-0.5 text-[10px] leading-none text-white">
                        缺货
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">数量</span>
          <div className="flex items-center gap-2 rounded-full border border-[var(--theme-border)]">
            <button
              type="button"
              disabled={qty <= 1 || soldOut}
              onClick={() => tryChangeQty(qty - 1, "minus")}
              className="flex h-9 w-9 items-center justify-center disabled:opacity-40"
              aria-label="减少"
            >
              <Minus size={16} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qty > 0 ? String(qty) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                if (!raw) {
                  onQtyChange(1);
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                tryChangeQty(parsed, "input");
              }}
              onBlur={(e) => {
                const parsed = Number.parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                if (!Number.isFinite(parsed) || parsed < 1) {
                  onQtyChange(1);
                  return;
                }
                if (parsed > maxQty) onQtyChange(clampQty(parsed));
              }}
              className="h-9 min-w-[2.25rem] bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none"
              aria-label="数量"
            />
            <button
              type="button"
              disabled={soldOut || qty >= maxQty}
              onClick={() => tryChangeQty(qty + 1, "plus")}
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
