import { getCartLinePrice } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";
import ProductCoverImage from "@/components/ProductCoverImage";
import StoreAmountToken from "@/components/store/StoreAmountToken";

interface CheckoutItemsListProps {
  items: CartItem[];
}

export function CheckoutItemsList({ items }: CheckoutItemsListProps) {
  return (
    <div className="sf-next-checkout-card">
      <div className="sf-next-checkout-card__head">
        <div>
          <h2 className="sf-next-checkout-section-title">商品信息</h2>
          <p className="sf-next-checkout-section-description">请核对商品、规格和数量</p>
        </div>
        <span className="sf-next-checkout-section-meta">共 {items.reduce((sum, item) => sum + item.qty, 0)} 件</span>
      </div>
      {items.map((item, index) => (
        <div
          key={`${item.product.id}:${item.variant_id || ""}`}
          className="sf-next-checkout-item"
        >
          <ProductCoverImage
            url={item.product.cover_image}
            alt={item.product.name}
            className="sf-next-checkout-media"
            imgClassName="h-full w-full object-cover"
            sizes="(max-width: 640px) 80px, 88px"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "low"}
          />
          <div className="sf-next-checkout-item-copy">
            <p className="sf-next-checkout-item-title">{item.product.name}</p>
            <div className="sf-next-checkout-item-meta-row">
              <p className="sf-next-checkout-item-meta">
                {item.variant_name ? `规格：${item.variant_name}` : "规格：默认规格"}
              </p>
              <span className="sf-next-checkout-item-quantity">
                x{item.qty}
              </span>
            </div>
            <div className="sf-next-checkout-item-amount">
              <span>商品金额</span>
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
