export type ProductStatus = "active" | "inactive";

export type ProductSortType = "default" | "price-asc" | "price-desc" | "newest";

export interface Product {
  id: string;
  name: string;
  cover_image: string;
  images: string[];
  price: number;
  points: number;
  category_id: string;
  stock: number;
  status: ProductStatus;
  sort_order: number;
  description: string;
  is_recommended: boolean;
  is_new: boolean;
  is_hot: boolean;
}

export interface ProductListParams {
  category_id?: string;
  keyword?: string;
  status?: ProductStatus;
  is_recommended?: boolean;
  is_new?: boolean;
  is_hot?: boolean;
  sort?: ProductSortType;
  page?: number;
  pageSize?: number;
}

export interface ProductTag {
  id: string;
  name: string;
  sort_order: number;
  color?: string;
  count?: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user_nickname: string;
  user_avatar: string;
  rating: number;
  content: string;
  images: string[];
  created_at: string;
}
