import banner1Image from "@/assets/banner1.jpg";
import type { Banner } from "@/types/banner";
import type { Product } from "@/types/product";

export const previewBanner: Banner = {
  id: "preview-banner",
  title: "主题预览轮播（非线上数据）",
  image: banner1Image,
  link: "/products",
  sort_order: 1,
  enabled: true,
};

/** 仅 Theme Studio 组件画廊占位，不写入商品库 */
export const previewProduct = {
  id: "preview-product",
  name: "主题预览商品卡（非线上数据）",
  price: 88,
  original_price: 128,
  points: 20,
  stock: 30,
  sales_count: 0,
  cover_image: banner1Image,
  images: [banner1Image],
  tags: ["预览"],
  is_hot: false,
  is_new: false,
} as unknown as Product;
