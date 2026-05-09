export type ProductStatus = "draft" | "active" | "inactive";

/** 与后端一致：0 草稿 · 1 上架 · 2 下架 */
export type ProductLifecycleStatus = 0 | 1 | 2;

export type ProductSortType = "default" | "price-asc" | "price-desc" | "newest";

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
}

export interface Product {
  id: string;
  name: string;
  cover_image: string;
  images: string[];
  price: number;
  /** 划线原价（可选）。前端在 > price 时才以删除线渲染 */
  original_price?: number | null;
  /** 累计销量（订单付款后由后端自动累加） */
  sales_count?: number;
  points: number;
  category_id: string;
  stock: number;
  /** 0 草稿 · 1 上架 · 2 下架 */
  lifecycle_status?: ProductLifecycleStatus;
  status: ProductStatus;
  sort_order: number;
  /** 管理端：SKU / 规格（ storefront 仍以 SPU 主价格库存为准） */
  variants?: ProductVariant[];
  description: string;
  is_recommended: boolean;
  is_new: boolean;
  is_hot: boolean;
  tags?: ProductCatalogTag[];
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
