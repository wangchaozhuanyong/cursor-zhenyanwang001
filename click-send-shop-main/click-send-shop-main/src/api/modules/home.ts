import { get } from "@/api/request";
import type { HomeOpsConfig, SiteInfo } from "@/types/content";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

export type HomeBootstrap = {
  siteInfo: SiteInfo;
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
    couponCenter: unknown;
    newUserGift: unknown;
  };
};

export function getHomeBootstrap() {
  return get<HomeBootstrap>("/home/bootstrap");
}
