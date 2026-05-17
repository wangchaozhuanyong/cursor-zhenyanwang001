export type ProductStatus = "draft" | "active" | "inactive";

/** 与后端一致：0 草稿 · 1 上架 · 2 下架 */
export type ProductLifecycleStatus = 0 | 1 | 2;

export type ProductSortType = "default" | "sales" | "newest" | "price-asc" | "price-desc";

export interface ProductVariant {
  id: string;
  sku_code?: string | null;
  title: string;
  price: number;
  stock: number;
  sort_order: number;
  is_default: boolean;
}

/** 后台「标签管理」关联到商品后，接口随商品返回 */
export interface ProductCatalogTag {
  id: string;
  name: string;
  color?: string;
  bg_color?: string;
  text_color?: string;
  sort_order?: number;
}

export interface ProductActiveActivity {
  id: string;
  type: "flash_sale" | "full_reduction";
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  activity_price: number;
  limit_per_user: number;
  activity_stock: number;
  sold_count: number;
  remaining_stock: number;
  threshold_amount?: number | null;
  discount_amount?: number | null;
  status: "active";
  status_label: string;
}

export interface Product {
  id: string;
  name: string;
  cover_image: string;
  /** 商品详情页视频 URL。商品卡不展示，仅详情页图集使用 */
  video_url?: string;
  images: string[];
  price: number;
  /** 活动价/实际展示成交价；有 active_activity 时与 price 一致 */
  effective_price?: number;
  activity_price?: number;
  active_activity?: ProductActiveActivity | null;
  /** 划线原价（可选）。前端在 > price 时才以删除线渲染 */
  original_price?: number | null;
  /** 满减活动文案（如「满100减10」），由目录接口在 type=full_reduction 时附带 */
  activity_promo_label?: string | null;
  /** 累计销量（订单付款后由后端自动累加） */
  sales_count?: number;
  points: number;
  category_id: string;
  stock: number;
  stock_warning_threshold?: number;
  /** 0 草稿 · 1 上架 · 2 下架 */
  lifecycle_status?: ProductLifecycleStatus;
  status: ProductStatus;
  sort_order: number;
  /** 管理端：SKU / 规格（ storefront 仍以 SPU 主价格库存为准） */
  variants?: ProductVariant[];
  default_variant?: ProductVariant | null;
  description: string;
  is_recommended: boolean;
  is_new: boolean;
  is_hot: boolean;
  tags?: ProductCatalogTag[];
}

export interface ProductListParams {
  category_id?: string;
  include_descendants?: boolean | number;
  keyword?: string;
  status?: ProductStatus;
  is_recommended?: boolean | number;
  is_new?: boolean | number;
  is_hot?: boolean | number;
  home_new_arrivals_rule?: boolean | number;
  new_arrivals_only_in_stock?: boolean | number;
  tag_id?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean | number;
  sort?: ProductSortType;
  page?: number;
  pageSize?: number;
}

export interface ProductTag {
  id: string;
  name: string;
  sort_order: number;
  color?: string;
  bg_color?: string;
  text_color?: string;
  enabled?: boolean;
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
