import banner1Image from "@/assets/banner1.jpg";
import type { Banner } from "@/types/banner";
import type { Product } from "@/types/product";

export const previewBanner: Banner = {
  id: "preview-banner",
  title: "Theme Studio 预览 Banner",
  image: banner1Image,
  link: "/products",
  sort_order: 1,
  enabled: true,
};

export const previewProduct = {
  id: "preview-product",
  name: "大马通精选商品 · 预览款",
  price: 88,
  original_price: 128,
  points: 20,
  stock: 30,
  sales_count: 256,
  cover_image: banner1Image,
  images: [banner1Image],
  tags: ["热销", "包邮"],
  is_hot: true,
  is_new: true,
} as unknown as Product;
