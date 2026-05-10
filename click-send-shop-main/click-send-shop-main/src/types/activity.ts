export type ActivityType = "flash_sale" | "full_reduction";
export type ActivityStatus = "not_started" | "active" | "ended" | "disabled";

export interface ActivityProductItem {
  id?: string;
  product_id: string;
  product_name?: string;
  cover_image?: string;
  product_price?: number | null;
  product_stock?: number | null;
  activity_price: number;
  limit_per_user: number;
  activity_stock: number;
  sold_count?: number;
  sort_order?: number;
}

export interface MarketingActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  disabled: boolean;
  threshold_amount?: number | null;
  discount_amount?: number | null;
  sort_order: number;
  product_count?: number;
  activity_stock_total?: number;
  sold_count_total?: number;
  status: ActivityStatus;
  status_label: string;
  items?: ActivityProductItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ActivityPayload {
  type: ActivityType;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  disabled?: boolean;
  threshold_amount?: number | null;
  discount_amount?: number | null;
  sort_order?: number;
  items: ActivityProductItem[];
}
