import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";

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
    description: "",
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
