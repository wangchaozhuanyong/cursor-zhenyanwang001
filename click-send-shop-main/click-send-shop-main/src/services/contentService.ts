import * as contentApi from "@/api/modules/content";
import type { ContentPage, SiteInfo } from "@/types/content";

export async function fetchSiteInfo(): Promise<SiteInfo | undefined> {
  const res = await contentApi.getSiteInfo();
  return res.data;
}

export async function fetchContentBySlug(slug: string): Promise<ContentPage | undefined> {
  const res = await contentApi.getContentBySlug(slug);
  return res.data;
}
