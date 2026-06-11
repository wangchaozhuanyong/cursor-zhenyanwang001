import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";

export const DEFAULT_PRODUCT_DESCRIPTION = `大马通正品承诺

在大马通购物，安心有保障。本商品保证为正品，支持假一赔十承诺。我们坚持诚信经营，严格筛选商品品质，只为让每一位会员买得放心、用得安心。

大马通感谢您的信任与支持，祝您购物愉快！`;

export function createEmptyProductForm(): ProductFormPayloadSlice {
  return {
    name: "",
    price: "",
    original_price: "",
    cost_price: "",
    sales_count: "",
    stock: "",
    stock_warning_threshold: "",
    stock_lower_limit: "",
    stock_upper_limit: "",
    category_id: "",
    sort_order: "",
    description: DEFAULT_PRODUCT_DESCRIPTION,
    cover_image: "",
    cover_image_alt: "",
    video_url: "",
    images: [],
    image_alts: [],
    status: "active",
    is_hot: false,
    is_new: false,
    is_recommended: false,
    is_age_restricted: false,
    minimum_age: "",
    compliance_type: "normal",
    region_notice: "",
    compliance_notice: "",
    allow_index: true,
    tag_ids: [],
    spec_groups: [],
    variants: [
      {
        title: DEFAULT_VARIANT_TITLE,
        sku_code: "",
        price: "",
        stock: "",
        sort_order: 0,
        is_default: true,
      },
    ],
  };
}
