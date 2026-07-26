import {
  lazyPublicRouteWithPreload,
  lazyPublicRouteWithStyles,
  lazyWithPreload,
} from "@/routes/lazyWithPreload";

let promotionsRouteStylesPromise: Promise<unknown> | undefined;
let cartRouteStylesPromise: Promise<unknown> | undefined;

function preloadPromotionsRouteStyles() {
  promotionsRouteStylesPromise ??= Promise.all([
    import("@/styles/promotions-tailwind.css"),
    import("@/styles/storefront-route-primitives.css"),
  ]).catch((error: unknown) => {
    promotionsRouteStylesPromise = undefined;
    throw error;
  });
  return promotionsRouteStylesPromise;
}

function preloadCartRouteStyles() {
  cartRouteStylesPromise ??= Promise.all([
    import("@/styles/cart-tailwind.css"),
    import("@/styles/storefront-route-primitives.css"),
  ]).catch((error: unknown) => {
    cartRouteStylesPromise = undefined;
    throw error;
  });
  return cartRouteStylesPromise;
}

export const StoreHomeV2 = lazyWithPreload(() => import("@/modules/storefront-v2/home/StoreHomeV2"));
export const Categories = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/product/Categories"));
export const ProductDetail = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/product/ProductDetail"));
export const Search = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/product/Search"));
export const Promotions = lazyPublicRouteWithStyles(
  () => import("@/modules/public/pages/promotion/Promotions"),
  preloadPromotionsRouteStyles,
);
export const PromotionDetail = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/promotion/PromotionDetail"));
export const Cart = lazyPublicRouteWithStyles(
  () => import("@/modules/public/pages/cart/Cart"),
  preloadCartRouteStyles,
);
export const Profile = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/user/Profile"));
export const SupportDownload = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/content/SupportDownload"));
export const TikTokLanding = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/content/TikTokLanding"));
export const NotFound = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/error/NotFound"));
