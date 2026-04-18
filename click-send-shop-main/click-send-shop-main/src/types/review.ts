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
