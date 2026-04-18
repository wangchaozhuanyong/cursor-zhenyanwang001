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
