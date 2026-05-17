export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  rating: number;
  content: string;
  images: string[];
  created_at: string;
  likes_count: number;
  liked: boolean;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  is_verified_purchase?: boolean;
  sku_text?: string | null;
}

export interface ProductReviewStats {
  total: number;
  avg_rating: number;
  rating_distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  image_review_count: number;
}

/**
 * 首页"用户口碑"精选评价（带商品信息）
 */
export interface FeaturedReview {
  id: string;
  product_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  rating: number;
  content: string;
  images: string[];
  likes_count: number;
  created_at: string;
  product_name: string;
  product_cover: string;
}

export interface PendingReviewItem {
  order_id: string;
  order_no: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  variant_id?: string | null;
  variant_name?: string;
  sku_code?: string;
  qty: number;
  completed_at: string;
}

export interface ReviewEligibility {
  can_review: boolean;
  reason: "login_required" | "purchase_required" | "already_reviewed" | "";
  message: string;
  pending_items: PendingReviewItem[];
  reviewed_count: number;
}
