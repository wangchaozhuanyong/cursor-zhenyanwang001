import { del, get, post, put } from "@/api/request";
import type { HomeNavItem } from "@/types/content";

export function getHomeNavItems() {
  return get<HomeNavItem[]>("/admin/home-ops/nav-items");
}

export function createHomeNavItem(data: Partial<HomeNavItem>) {
  return post<HomeNavItem>("/admin/home-ops/nav-items", data);
}

export function updateHomeNavItem(id: string, data: Partial<HomeNavItem>) {
  return put<void>(`/admin/home-ops/nav-items/${id}`, data);
}

export function deleteHomeNavItem(id: string) {
  return del<void>(`/admin/home-ops/nav-items/${id}`);
}
