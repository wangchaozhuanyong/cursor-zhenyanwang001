import type { Product } from "./product";

export interface CartItem {
  product: Product;
  variant_id?: string;
  sku_code?: string;
  variant_name?: string;
  unit_price?: number;
  subtotal?: number;
  qty: number;
}

export interface CartSummary {
  totalAmount: number;
  totalPoints: number;
  totalItems: number;
}
