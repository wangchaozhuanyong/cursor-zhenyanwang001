import type { Product } from "./product";

export interface HistoryItem {
  id: string;
  viewed_at: string;
  product: Product;
}
