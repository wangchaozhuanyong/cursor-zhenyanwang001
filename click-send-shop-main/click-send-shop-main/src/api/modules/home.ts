import { get } from "@/api/request";
import type { HomeOpsConfig, SiteInfo } from "@/types/content";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { RuntimeConfig, SiteCapabilities } from "@/types/siteCapabilities";

export type HomeBootstrap = {
  siteInfo: SiteInfo;
  siteCapabilities: SiteCapabilities;
  runtimeConfig: RuntimeConfig;
  homeOps: HomeOpsConfig;
  banners: Array<Record<string, unknown>>;
  categories: Category[];
  products: {
    hot: Product[];
    new_arrivals: Product[];
    recommended: Product[];
  };
  marketing: {
    flashSale: unknown;
    promotionBanners: unknown[];
    fullReductionNotices: unknown[];
    couponZone: unknown;
    couponCenter: unknown;
    newUserGift: unknown;
  };
};

export function getHomeBootstrap() {
  return get<HomeBootstrap>("/home/bootstrap");
}
