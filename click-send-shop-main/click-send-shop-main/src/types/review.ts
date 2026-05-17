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
