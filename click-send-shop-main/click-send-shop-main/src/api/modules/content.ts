import { get } from "../request";
import type { ContentPage, SiteInfo } from "@/types/content";
export type { ContentPage, SiteInfo };

export function getContentBySlug(slug: string) {
  return get<ContentPage>(`/content/${slug}`);
}

export function getSiteInfo() {
  return get<SiteInfo>("/content/site-info");
}
