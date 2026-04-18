import * as contentApi from "@/api/admin/content";
import type { ContentPage } from "@/types/admin";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchContentPages(): Promise<ContentPage[]> {
  const res = await contentApi.getContentPages();
  return unwrapList<ContentPage>(res.data);
}

export async function updateContentPage(id: string, data: Partial<ContentPage>) {
  const res = await contentApi.updateContentPage(id, data);
  return res.data;
}
