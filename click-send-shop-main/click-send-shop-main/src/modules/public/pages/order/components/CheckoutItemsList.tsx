import { getCartLinePrice } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  return (
    <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
      <h3 className="mb-3 text-sm font-semibold text-foreground">5. 确认商品</h3>
      {items.map((item) => (
        <div key={`${item.product.id}:${item.variant_id || ""}`} className="flex items-center gap-3 border-b border-[var(--theme-border)] py-3 last:border-0">
          <img src={item.product.cover_image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{item.product.name}</p>
            {item.variant_name && (
              <p className="text-xs text-muted-foreground truncate">规格：{item.variant_name}</p>
            )}
            <p className="text-xs text-muted-foreground">x{item.qty}</p>
          </div>
          <span className="text-sm font-bold text-[var(--theme-price)] flex-shrink-0">RM {getCartLinePrice(item)}</span>
        </div>
      ))}
    </div>
  );
}
