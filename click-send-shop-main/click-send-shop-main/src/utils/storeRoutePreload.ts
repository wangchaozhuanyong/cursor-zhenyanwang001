import {
  About,
  AddressManage,
  BindWechatPhone,
  Cart,
  Categories,
  Checkout,
  ContentCmsPage,
  Coupons,
  Favorites,
  Feedback,
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
  Profile,
  ReturnDetail,
  Returns,
  Rewards,
  Search,
  Settings,
  StoreHomeV2,
  SupportDownload,
} from "@/routes/publicLazyPages";
import { preloadRoute, type RoutePreloadPriority } from "@/utils/routePreloadPolicy";

type Preloadable = { preload?: () => Promise<unknown> };

const exactPreloaders = new Map<string, Preloadable>([
  ["/categories", Categories],
  ["/new-arrivals", Categories],
  ["/support-download", SupportDownload],
  ["/search", Search],
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
  ["/invite", Invite],
  ["/login", Login],
  ["/register", Login],
  ["/login/bind-phone", BindWechatPhone],
  ["/help", Help],
  ["/about", About],
]);

const patternPreloaders: Array<[RegExp, Preloadable]> = [
  [/^\/product\/[^/]+$/, ProductDetail],
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
    return preloadRoute(StoreHomeV2.preload, priority);
  }

  const component =
    exactPreloaders.get(pathname)
    ?? patternPreloaders.find(([pattern]) => pattern.test(pathname))?.[1];

  return preloadRoute(component?.preload, priority);
}
