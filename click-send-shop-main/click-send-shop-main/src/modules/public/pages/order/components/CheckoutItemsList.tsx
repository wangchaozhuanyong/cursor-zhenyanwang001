import { getCartLinePrice } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";
import ProductCoverImage from "@/components/ProductCoverImage";
import StoreAmountToken from "@/components/store/StoreAmountToken";

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  return (
    <div className="sf-next-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-foreground md:text-base">商品信息</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">请核对商品、规格和数量</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">共 {items.reduce((sum, item) => sum + item.qty, 0)} 件</span>
      </div>
      {items.map((item, index) => (
        <div
          key={`${item.product.id}:${item.variant_id || ""}`}
          className="sf-next-checkout-item grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3 border-b border-[var(--theme-border)] py-3 last:border-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3.5"
        >
          <ProductCoverImage
            url={item.product.cover_image}
            alt={item.product.name}
            className="sf-next-checkout-media w-20 self-start rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] object-cover sm:w-[5.5rem]"
            imgClassName="object-cover"
            sizes="(max-width: 640px) 80px, 88px"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "low"}
          />
          <div className="sf-next-checkout-item-copy grid min-h-20 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] sm:min-h-[5.5rem]">
            <p className="sf-next-checkout-item-title line-clamp-2 text-foreground">{item.product.name}</p>
            <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
              <p className="sf-next-checkout-item-meta min-w-0 truncate text-muted-foreground">
                {item.variant_name ? `规格：${item.variant_name}` : "规格：默认规格"}
              </p>
              <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)] bg-[var(--theme-bg)] px-2 py-0.5 text-xs font-bold text-[var(--theme-text-muted)]">
                x{item.qty}
              </span>
            </div>
            <div className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--theme-bg)_72%,var(--theme-surface))] px-2.5 py-2">
              <span className="min-w-0 text-[11px] font-semibold text-[var(--theme-text-muted)]">商品金额</span>
              <StoreAmountToken
                amount={getCartLinePrice(item)}
                className="shrink-0 border-0 bg-transparent p-0 shadow-none"
                amountClassName="text-[15px] leading-none"
                currencyClassName="mr-0.5 text-[10px]"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
