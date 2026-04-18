import type { Product } from "./product";

export interface CartItem {
  product: Product;
  qty: number;
}

export interface CartSummary {
  totalAmount: number;
  totalPoints: number;
  totalItems: number;
}
