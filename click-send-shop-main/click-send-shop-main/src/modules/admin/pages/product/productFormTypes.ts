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
