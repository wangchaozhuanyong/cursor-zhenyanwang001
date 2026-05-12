import * as cartApi from "@/api/modules/cart";
import type { CartItem } from "@/types/cart";

export async function fetchCart() {
  const res = await cartApi.getCart();
  return res.data;
}

export async function addToCart(productId: string, qty: number, variantId = "", skuCode = "") {
  const res = await cartApi.addToCart(productId, qty, variantId, skuCode);
  return res.data;
}

export async function updateCartItemQty(productId: string, qty: number, variantId = "") {
  const res = await cartApi.updateCartItem(productId, qty, variantId);
  return res.data;
}

export async function removeFromCart(productId: string, variantId = "") {
  await cartApi.removeCartItem(productId, variantId);
}

export async function clearCart() {
  await cartApi.clearCart();
}

export function calcCartSummary(items: CartItem[]) {
  return {
    totalAmount: items.reduce((sum, i) => sum + i.product.price * i.qty, 0),
    totalPoints: items.reduce((sum, i) => sum + i.product.points * i.qty, 0),
    totalItems: items.reduce((sum, i) => sum + i.qty, 0),
  };
}
