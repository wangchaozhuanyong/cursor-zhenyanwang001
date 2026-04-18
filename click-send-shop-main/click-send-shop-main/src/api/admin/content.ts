import { get, put } from "../request";
import type { ContentPage } from "@/types/admin";

export function getContentPages() {
  return get<ContentPage[]>("/admin/content");
}

export function updateContentPage(id: string, data: Partial<ContentPage>) {
  return put<ContentPage>(`/admin/content/${id}`, data);
}
