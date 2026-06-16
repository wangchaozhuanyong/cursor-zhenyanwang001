export type ProductStatus = "draft" | "active" | "inactive";

/** 与后端一致：0 草稿 · 1 上架 · 2 下架 */
export type ProductLifecycleStatus = 0 | 1 | 2;

export type ProductSortType =
  | "default"
  | "sales"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "category_asc"
  | "category_desc"
  | "sku_asc"
  | "sku_desc"
  | "price_asc"
  | "price_desc"
  | "cost_asc"
  | "cost_desc"
  | "sales_7d_asc"
  | "sales_7d_desc"
  | "sales_30d_asc"
  | "sales_30d_desc"
  | "sales_amount_30d_asc"
  | "sales_amount_30d_desc"
  | "gross_profit_30d_asc"
  | "gross_profit_30d_desc"
  | "stock_asc"
  | "stock_desc"
  | "margin_asc"
  | "margin_desc";

export interface ProductVariant {
  id: string;
  sku_code?: string | null;
  title: string;
  price: number;
  min_price?: number | null;
  max_price?: number | null;
  min_original_price?: number | null;
  max_original_price?: number | null;
  variant_count?: number;
  original_price?: number | null;
  cost_price?: number | null;
  stock: number;
  stock_warning_threshold?: number;
  stock_lower_limit?: number | null;
  stock_upper_limit?: number | null;
  barcode?: string | null;
  image_url?: string | null;
  weight?: number | null;
  enabled?: boolean;
  sort_order: number;
  is_default: boolean;
  spec_value_ids?: string[];
  spec_values?: Array<{
    group_id: string;
    group_name: string;
    value_id: string;
    value: string;
  }>;
  spec_text?: string;
}

export interface ProductSpecValue {
  id: string;
  product_id?: string;
  group_id: string;
  value: string;
  image_url?: string | null;
  sort_order: number;
}

export interface ProductSpecGroup {
  id: string;
  product_id?: string;
  name: string;
  sort_order: number;
  values: ProductSpecValue[];
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
  type: "flash_sale" | "limited_time_discount" | "full_reduction" | "full_discount" | "member_price" | "points_reward" | "checkin_reward" | "campaign";
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
  cover_image_alt?: string;
  /** 商品详情页视频 URL。商品卡不展示，仅详情页图集使用 */
  video_url?: string;
  images: string[];
  image_alts?: string[];
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
  stock_lower_limit?: number | null;
  stock_upper_limit?: number | null;
  /** 0 草稿 · 1 上架 · 2 下架 */
  lifecycle_status?: ProductLifecycleStatus;
  status: ProductStatus;
  sort_order: number;
  /** 管理端：SKU / 规格（ storefront 仍以 SPU 主价格库存为准） */
  variants?: ProductVariant[];
  spec_groups?: ProductSpecGroup[];
  spec_values?: ProductSpecValue[];
  default_variant?: ProductVariant | null;
  description: string;
  is_recommended: boolean;
  is_new: boolean;
  isNewArrival?: boolean;
  newArrival?: boolean;
  is_hot: boolean;
  is_age_restricted?: boolean;
  minimum_age?: number | null;
  compliance_type?: "normal" | "age_restricted" | "regulated" | string | null;
  region_notice?: string | null;
  compliance_notice?: string | null;
  allow_index?: boolean | number | null;
  category_name?: string;
  sku_count?: number;
  enabled_sku_count?: number;
  min_sku_price?: number | null;
  max_sku_price?: number | null;
  min_cost_price?: number | null;
  max_cost_price?: number | null;
  missing_cost_sku_count?: number;
  stock_warning_sku_count?: number;
  out_of_stock_sku_count?: number;
  inventory_cost_value?: number;
  inventory_retail_value?: number;
  sales_qty_7d?: number;
  sales_amount_7d?: number;
  gross_profit_7d?: number;
  sales_qty_30d?: number;
  sales_amount_30d?: number;
  gross_profit_30d?: number;
  gross_margin_30d?: number | null;
  created_at?: string;
  createdAt?: string;
  published_at?: string;
  publishedAt?: string;
  attributes?: Record<string, unknown> | string | null;
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
  stock_status?: "normal" | "low" | "out";
  cost_status?: "normal" | "missing";
  min_margin?: number;
  max_margin?: number;
  page?: number;
  pageSize?: number;
  /** 勾选导出时传入 */
  ids?: string[];
}

export interface ProductImportRowError {
  row: number;
  reason: string;
}

export interface ProductImportResult {
  created: number;
  updated: number;
  skipped?: number;
  sku_rows?: number;
  mode?: "sku_matrix" | "legacy" | "yinbao_excel" | "csv";
  errors?: ProductImportRowError[];
  categories_created?: string[];
}

export interface ProductImportPreview {
  mode: "yinbao_excel" | "csv";
  filename?: string;
  sheet_name?: string;
  total_rows: number;
  valid_rows: number;
  sku_rows: number;
  product_groups: number;
  products_to_create: number;
  products_to_update: number;
  categories_existing: string[];
  categories_to_create: string[];
  negative_stock_rows: number;
  same_name_multi_category?: Array<{ name: string; categories: string[] }>;
  ignored_columns?: string[];
  warnings?: string[];
  errors?: ProductImportRowError[];
}

export interface ProductBatchStatusResult {
  updated: number;
  skipped: number;
  skipped_ids?: string[];
  requested: number;
}

export interface ProductBatchDeleteResult {
  deleted: number;
  skipped: number;
  skipped_ids?: string[];
  blocked_active_ids?: string[];
  requested: number;
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

export interface AdminProductSpecValueInput {
  id?: string;
  value: string;
  image_url?: string | null;
  sort_order: number;
}

export interface AdminProductSpecGroupInput {
  id?: string;
  name: string;
  sort_order: number;
  values: AdminProductSpecValueInput[];
}

export interface AdminProductVariantInput {
  id?: string;
  title: string;
  sku_code?: string | null;
  price: number;
  original_price?: number | null;
  cost_price?: number | null;
  stock: number;
  stock_warning_threshold?: number;
  stock_lower_limit?: number | null;
  stock_upper_limit?: number | null;
  barcode?: string | null;
  image_url?: string | null;
  weight?: number | null;
  enabled?: boolean;
  sort_order: number;
  is_default: boolean;
  spec_value_ids?: string[];
}

/** 管理端商品保存提交体 */
export type AdminProductUpsertPayload = Omit<Product, "id" | "variants" | "spec_groups"> & {
  tag_ids?: string[];
  stock?: number;
  isNewArrival?: boolean;
  spec_groups?: AdminProductSpecGroupInput[];
  variants?: AdminProductVariantInput[];
};
