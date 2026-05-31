import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

/** 首页横滑 / 网格商品卡统一外壳 */
export const HOME_PRODUCT_CARD_SHELL =
  "store-product-card store-art-product-card flex flex-col overflow-hidden rounded-[var(--store-card-radius)] border border-[var(--store-card-border)] bg-[var(--store-card-bg)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5";

/** 首页新品横滑单卡宽度（约一屏 3 张） */
export const HOME_NEW_ARRIVAL_CARD_WIDTH_CLASS =
  "w-[clamp(118px,28vw,128px)] shrink-0 snap-start";

/** 图片区容器 */
export const HOME_PRODUCT_CARD_MEDIA =
  "store-art-product-media relative w-full shrink-0 overflow-hidden bg-[var(--store-product-media-bg)]";

export const HOME_PRODUCT_IMAGE_PRODUCT_CLASS = "aspect-square w-full max-h-none";
export const HOME_PRODUCT_IMAGE_SERVICE_CLASS = HOME_PRODUCT_IMAGE_PRODUCT_CLASS;

export const HOME_PRODUCT_IMAGE_IMG_CLASS = "h-full w-full object-cover";

/** 图下信息区：与图片明确分界 */
export const HOME_PRODUCT_INFO_CLASS =
  "store-art-product-info min-w-0 border-t border-[var(--store-border)] px-2 pb-2 pt-2";

export const HOME_PRODUCT_TITLE_CLASS =
  "line-clamp-2 min-h-[2.25rem] break-words text-[13.5px] font-semibold leading-snug text-[var(--theme-text-on-surface)]";

export const HOME_PRODUCT_BADGE_CLASS =
  "inline-flex max-w-full items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none";

export const HOME_PRODUCT_PRICE_AMOUNT_CLASS = "text-[13px] font-bold leading-none";
export const HOME_PRODUCT_PRICE_CURRENCY_CLASS = "mr-0.5 text-[10px] font-bold leading-none";

export function isHomeServiceLikeProduct(product: Product) {
  return /服务|咨询|办理|申请|装修/.test(String(product.category_name || product.name || ""));
}

export function homeProductImageAspectClass(product: Product) {
  return isHomeServiceLikeProduct(product)
    ? HOME_PRODUCT_IMAGE_SERVICE_CLASS
    : HOME_PRODUCT_IMAGE_PRODUCT_CLASS;
}

export function cnHomeProductCardShell(className?: string) {
  return cn(HOME_PRODUCT_CARD_SHELL, className);
}
