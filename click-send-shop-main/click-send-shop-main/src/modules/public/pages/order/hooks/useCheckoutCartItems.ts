import { useMemo } from "react";
import { cartLineKey, getCartLinePrice, useCartStore } from "@/stores/useCartStore";
import type { CartItem } from "@/types/cart";

export function useCheckoutCartItems() {
  const cartItems = useCartStore((s) => s.items);
  const buyNowItem = useCartStore((s) => s.buyNowItem);
  const selection = useCartStore((s) => s.selection);
  const isBuyNow = !!buyNowItem;

  const items = useMemo((): CartItem[] => {
    if (buyNowItem) return [buyNowItem];
    return cartItems.filter((i) => selection[cartLineKey(i.product.id, i.variant_id)] !== false);
  }, [buyNowItem, cartItems, selection]);

  const rawTotal = useMemo(
    () => items.reduce((sum, line) => sum + getCartLinePrice(line), 0),
    [items],
  );

  return { items, cartItems, isBuyNow, rawTotal };
}
