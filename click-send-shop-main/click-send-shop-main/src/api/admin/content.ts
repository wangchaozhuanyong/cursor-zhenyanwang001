import { get, post, put } from "@/api/request";
import type { ContentPage } from "@/types/admin";

export function getContentPages() {
  return get<ContentPage[]>("/admin/content");
}

export function createContentPage(data: Partial<ContentPage>) {
  return post<ContentPage>("/admin/content", data);
}

export function updateContentPage(id: string, data: Partial<ContentPage>) {
  return put<ContentPage>(`/admin/content/${id}`, data);
}
