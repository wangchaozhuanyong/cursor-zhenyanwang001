import { get, post, put, del } from "../request";
import type { Banner } from "@/types/banner";

export function getBanners() {
  return get<Banner[]>("/admin/banners");
}

export function createBanner(data: Omit<Banner, "id">) {
  return post<Banner>("/admin/banners", data);
}

export function updateBanner(id: string, data: Partial<Banner>) {
  return put<Banner>(`/admin/banners/${id}`, data);
}

export function deleteBanner(id: string) {
  return del<void>(`/admin/banners/${id}`);
}
