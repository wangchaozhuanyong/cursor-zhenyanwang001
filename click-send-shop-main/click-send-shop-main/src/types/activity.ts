export type ActivityType = "flash_sale" | "full_reduction" | "coupon_activity" | "new_user_gift" | "member_activity" | "points_bonus" | "cashback_activity";
export type ActivityStatus = "draft" | "scheduled" | "active" | "ended" | "disabled";
export type ActivityScopeType = "all" | "category" | "product" | "member_level" | "user_tag" | "new_user" | "old_user";

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
  subtitle?: string;
  cover_image?: string;
  scope_type?: ActivityScopeType;
  scope_ids?: string[];
  allow_coupon_stack?: boolean;
  allow_points_stack?: boolean;
  allow_reward?: boolean;
  publish_at?: string | null;
  internal_note?: string;
  display_positions?: string[];
  activity_config?: Record<string, unknown> | null;
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
  subtitle?: string;
  cover_image?: string;
  description?: string;
  start_at: string;
  end_at: string;
  status?: ActivityStatus;
  disabled?: boolean;
  threshold_amount?: number | null;
  discount_amount?: number | null;
  scope_type?: ActivityScopeType;
  scope_ids?: string[];
  allow_coupon_stack?: boolean;
  allow_points_stack?: boolean;
  allow_reward?: boolean;
  publish_at?: string | null;
  internal_note?: string;
  display_positions?: string[];
  activity_config?: Record<string, unknown> | null;
  sort_order?: number;
  items: ActivityProductItem[];
}
