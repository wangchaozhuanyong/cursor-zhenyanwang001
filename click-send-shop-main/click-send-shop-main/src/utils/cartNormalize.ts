import { ensureMediaUrl } from "@/utils/mediaUrl";
import type { CartItem } from "@/types/cart";

export function normalizeCartItem(item: CartItem): CartItem {
  const cover = ensureMediaUrl(item.product.cover_image);
  if (!cover || cover === item.product.cover_image) return item;
  return {
    ...item,
    product: { ...item.product, cover_image: cover },
  };
}

export function normalizeCartItems(items: CartItem[]): CartItem[] {
  return items.map(normalizeCartItem);
}
