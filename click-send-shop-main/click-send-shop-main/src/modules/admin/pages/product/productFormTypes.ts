/** 商品编辑表单：规格与 SKU 相关类型（与 AdminProductForm 共用） */

export type AdminSpecValue = {
  id?: string;
  value: string;
  image_url?: string;
  sort_order: number;
};

export type AdminSpecGroup = {
  id?: string;
  name: string;
  sort_order: number;
  values: AdminSpecValue[];
};

export type AdminVariantForm = {
  id?: string;
  title: string;
  sku_code: string;
  price: string;
  original_price?: string;
  cost_price?: string;
  stock: string;
  stock_warning_threshold?: string;
  stock_lower_limit?: string;
  stock_upper_limit?: string;
  barcode?: string;
  image_url?: string;
  weight?: string;
  enabled?: boolean;
  sort_order: number;
  is_default: boolean;
  spec_value_ids?: string[];
};

/** SKU 矩阵区块读取的表单字段子集 */
export type ProductVariantMatrixFormSlice = {
  spec_groups: AdminSpecGroup[];
  variants: AdminVariantForm[];
  price: string;
  original_price: string;
  cost_price: string;
  stock: string;
  stock_warning_threshold: string;
  stock_lower_limit: string;
  stock_upper_limit: string;
};

export type ProductFormPayloadSlice = ProductVariantMatrixFormSlice & {
  name: string;
  sales_count: string;
  category_id: string;
  sort_order: string;
  description: string;
  cover_image: string;
  cover_image_alt: string;
  video_url: string;
  images: string[];
  image_alts: string[];
  status: "draft" | "active" | "inactive";
  is_hot: boolean;
  is_new: boolean;
  is_recommended: boolean;
  is_age_restricted: boolean;
  minimum_age: string;
  compliance_type: string;
  region_notice: string;
  compliance_notice: string;
  allow_index: boolean;
  tag_ids: string[];
};
