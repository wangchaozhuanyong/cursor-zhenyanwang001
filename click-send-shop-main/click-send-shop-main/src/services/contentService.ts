import * as contentApi from "@/api/modules/content";
import type { ContentPage, HomeOpsConfig, SiteInfo } from "@/types/content";

export async function fetchSiteInfo(): Promise<SiteInfo | undefined> {
  const res = await contentApi.getSiteInfo();
  return res.data;
}

export async function fetchContentBySlug(slug: string): Promise<ContentPage | undefined> {
  const res = await contentApi.getContentBySlug(slug);
  return res.data;
}

export async function fetchHomeOps(): Promise<HomeOpsConfig> {
  const res = await contentApi.getHomeOps();
  return {
    navItems: Array.isArray(res.data?.navItems) ? res.data.navItems : [],
    announcements: Array.isArray(res.data?.announcements) ? res.data.announcements : [],
  };
}
