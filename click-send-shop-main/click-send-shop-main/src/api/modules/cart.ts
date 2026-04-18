import { get, post, put, del } from "../request";
import type { CartItem } from "@/types/cart";

export function getCart() {
  return get<CartItem[]>("/cart");
}

export function addToCart(productId: string, qty: number) {
  return post<CartItem>("/cart", { productId, qty });
}

export function updateCartItem(productId: string, qty: number) {
  return put<CartItem>(`/cart/${productId}`, { qty });
}

export function removeCartItem(productId: string) {
  return del<void>(`/cart/${productId}`);
}

export function clearCart() {
  return del<void>("/cart");
}
