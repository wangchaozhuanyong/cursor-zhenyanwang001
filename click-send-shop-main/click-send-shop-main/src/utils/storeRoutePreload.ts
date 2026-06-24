import {
  About,
  AddressManage,
  BindWechatPhone,
  Cart,
  Categories,
  Checkout,
  ClientCouponDetailDesign,
  ClientDesignSystem,
  ClientShareDetailDesign,
  ClientStatesDesign,
  ContentCmsPage,
  Coupons,
  Delivery,
  Favorites,
  FeatureStatus,
  Feedback,
  ForgotPassword,
  Help,
  History,
  Invite,
  Login,
  MemberBenefits,
  Notifications,
  OrderDetail,
  Orders,
  PendingReviews,
  Points,
  PointsGiftShop,
  ProductDetail,
  PromotionDetail,
  Promotions,
  Profile,
  ReturnDetail,
  Returns,
  Rewards,
  Search,
  Settings,
  StoreHomeV2,
  SupportDownload,
  Wallet,
} from "@/routes/publicLazyPages";
import { suppressAppVersionRecovery } from "@/lib/appVersionRecovery";
import { areClientDesignRoutesEnabled } from "@/utils/clientDesignRoutes";
import { preloadRoute, type RoutePreloadPriority } from "@/utils/routePreloadPolicy";

type Preloadable = { preload?: () => Promise<unknown> };
const STORE_PRELOAD_RECOVERY_SUPPRESS_MS = 2_500;

const exactPreloaders = new Map<string, Preloadable>([
  ["/categories", Categories],
  ["/new-arrivals", Categories],
  ["/support-download", SupportDownload],
  ["/delivery", Delivery],
  ["/feature-status", FeatureStatus],
  ["/search", Search],
  ["/deals", Promotions],
  ["/promotions", Promotions],
  ["/cart", Cart],
  ["/checkout", Checkout],
  ["/orders", Orders],
  ["/returns", Returns],
  ["/reviews/pending", PendingReviews],
  ["/profile", Profile],
  ["/feedback", Feedback],
  ["/member/benefits", MemberBenefits],
  ["/settings", Settings],
  ["/address", AddressManage],
  ["/favorites", Favorites],
  ["/history", History],
  ["/notifications", Notifications],
  ["/coupons", Coupons],
  ["/points", Points],
  ["/points/gifts", PointsGiftShop],
  ["/rewards", Rewards],
  ["/wallet", Wallet],
  ["/invite", Invite],
  ["/login", Login],
  ["/register", Login],
  ["/forgot", ForgotPassword],
  ["/login/bind-phone", BindWechatPhone],
  ["/help", Help],
  ["/about", About],
]);

if (areClientDesignRoutesEnabled()) {
  exactPreloaders.set("/client-design/system", ClientDesignSystem);
  exactPreloaders.set("/client-design/coupon-detail", ClientCouponDetailDesign);
  exactPreloaders.set("/client-design/share-detail", ClientShareDetailDesign);
  exactPreloaders.set("/client-design/states", ClientStatesDesign);
}

const patternPreloaders: Array<[RegExp, Preloadable]> = [
  [/^\/product\/[^/]+$/, ProductDetail],
  [/^\/promotions\/[^/]+$/, PromotionDetail],
  [/^\/deals\/[^/]+$/, PromotionDetail],
  [/^\/orders\/[^/]+$/, OrderDetail],
  [/^\/returns\/[^/]+$/, ReturnDetail],
  [/^\/content\/[^/]+$/, ContentCmsPage],
];

function normalizePath(to: string) {
  try {
    const url = new URL(to, window.location.origin);
    return url.pathname.replace(/\/+$/, "") || "/";
  } catch {
    const path = to.split("?")[0].replace(/\/+$/, "");
    return path || "/";
  }
}

export function preloadStoreRoute(to: string, priority: RoutePreloadPriority = "intent") {
  const pathname = normalizePath(to);
  if (pathname === "/") {
    suppressAppVersionRecovery(STORE_PRELOAD_RECOVERY_SUPPRESS_MS);
    return preloadRoute(StoreHomeV2.preload, priority);
  }

  const component =
    exactPreloaders.get(pathname)
    ?? patternPreloaders.find(([pattern]) => pattern.test(pathname))?.[1];

  if (component?.preload) {
    suppressAppVersionRecovery(STORE_PRELOAD_RECOVERY_SUPPRESS_MS);
  }
  return preloadRoute(component?.preload, priority);
}
