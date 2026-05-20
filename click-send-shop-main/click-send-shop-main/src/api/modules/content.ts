import { get } from "@/api/request";
import type { ContentPage, HomeOpsConfig, SiteInfo } from "@/types/content";
export type { ContentPage, HomeOpsConfig, SiteInfo };

export function getContentBySlug(slug: string) {
  return get<ContentPage>(`/content/${slug}`);
}

export function getSiteInfo() {
  return get<SiteInfo>("/content/site-info");
}

export function getHomeOps() {
  return get<HomeOpsConfig>("/content/home-ops");
}

