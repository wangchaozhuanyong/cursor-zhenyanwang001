import { getCartLinePrice } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  return (
    <div className="store-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-foreground md:text-base">商品信息</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">请核对商品、规格和数量</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">共 {items.reduce((sum, item) => sum + item.qty, 0)} 件</span>
      </div>
      {items.map((item, index) => (
        <div key={`${item.product.id}:${item.variant_id || ""}`} className="store-checkout-item flex items-center gap-3 border-b border-[var(--theme-border)] py-3 last:border-0">
          <img
            src={item.product.cover_image}
            alt={item.product.name}
            width={64}
            height={64}
            className="store-checkout-media h-16 w-16 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] object-cover"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "low"}
            decoding="async"
          />
          <div className="flex-1 min-w-0">
            <p className="store-card-title line-clamp-2 text-foreground">{item.product.name}</p>
            {item.variant_name && (
              <p className="store-caption truncate text-muted-foreground">规格：{item.variant_name}</p>
            )}
            <p className="store-caption text-muted-foreground">金额：RM {getCartLinePrice(item)}</p>
          </div>
          <span className="flex-shrink-0 text-sm font-bold text-foreground">x{item.qty}</span>
        </div>
      ))}
    </div>
  );
}
