import type { Product } from "./product";

export interface CartItem {
  id?: string;
  order_item_id?: string;
  product: Product;
  variant_id?: string;
  sku_code?: string;
  variant_name?: string;
  unit_price?: number;
  subtotal?: number;
  qty: number;
  review_id?: string | null;
  review_status?: string | null;
  is_reviewed?: boolean;
  can_review?: boolean;
}

export interface CartSummary {
  totalAmount: number;
  totalPoints: number;
  totalItems: number;
}
