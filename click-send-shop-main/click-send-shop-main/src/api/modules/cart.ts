import { get, post, put, del } from "@/api/request";
import type { CartItem } from "@/types/cart";

export function getCart() {
  return get<CartItem[]>("/cart", undefined, { skipAuthRetry: true, suppressAuthExpired: true });
}

export function addToCart(productId: string, qty: number, variantId = "", skuCode = "") {
  return post<CartItem>("/cart", { productId, qty, variant_id: variantId, sku_code: skuCode });
}

export function updateCartItem(productId: string, qty: number, variantId = "") {
  const query = variantId ? `?variant_id=${encodeURIComponent(variantId)}` : "";
  return put<CartItem>(`/cart/${productId}${query}`, { qty });
}

export function removeCartItem(productId: string, variantId = "") {
  const query = variantId ? `?variant_id=${encodeURIComponent(variantId)}` : "";
  return del<void>(`/cart/${productId}${query}`);
}

export function clearCart() {
  return del<void>("/cart");
}

