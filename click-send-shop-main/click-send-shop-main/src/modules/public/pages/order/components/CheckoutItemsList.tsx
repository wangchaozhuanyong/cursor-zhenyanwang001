import { getCartLinePrice } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  return (
    <div className="store-checkout-card theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <div className="mb-3 flex items-center gap-3">
        <span className="store-checkout-step flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-[var(--theme-price-foreground)]">6</span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">确认商品</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">请核对商品、规格和数量后再提交订单</p>
        </div>
      </div>
      {items.map((item, index) => (
        <div key={`${item.product.id}:${item.variant_id || ""}`} className="store-checkout-item flex items-center gap-3 border-b border-[var(--theme-border)] py-3 last:border-0">
          <img
            src={item.product.cover_image}
            alt={item.product.name}
            width={64}
            height={64}
            className="store-checkout-media h-16 w-16 rounded-2xl object-cover"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "low"}
            decoding="async"
          />
          <div className="flex-1 min-w-0">
            <p className="store-card-title truncate text-foreground">{item.product.name}</p>
            {item.variant_name && (
              <p className="store-caption truncate text-muted-foreground">规格：{item.variant_name}</p>
            )}
            <p className="store-caption text-muted-foreground">x{item.qty}</p>
          </div>
          <span className="text-[15px] font-bold text-[var(--theme-price)] flex-shrink-0">RM {getCartLinePrice(item)}</span>
        </div>
      ))}
    </div>
  );
}
