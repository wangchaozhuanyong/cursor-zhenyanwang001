import * as contentApi from "@/api/modules/content";
import type { ContentPage, HomeOpsConfig, SiteInfo } from "@/types/content";
import { ApiError } from "@/types/common";

export async function fetchSiteInfo(): Promise<SiteInfo | undefined> {
  const res = await contentApi.getSiteInfo();
  return res.data;
}

export async function fetchContentBySlug(slug: string): Promise<ContentPage | undefined> {
  try {
    const res = await contentApi.getContentBySlug(slug);
    return res.data;
  } catch (e) {
    if (e instanceof ApiError && e.code === 404) return undefined;
    throw e;
  }
}

export async function fetchHomeOps(): Promise<HomeOpsConfig> {
  const res = await contentApi.getHomeOps();
  return {
    navItems: Array.isArray(res.data?.navItems) ? res.data.navItems : [],
    moduleSettings: res.data?.moduleSettings,
  };
}

