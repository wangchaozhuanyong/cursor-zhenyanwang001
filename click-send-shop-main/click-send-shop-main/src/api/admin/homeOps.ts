import { del, get, post, put } from "@/api/request";
import type { HomeModuleSettings } from "@/constants/homeModules";
import type { HomeNavItem } from "@/types/content";

export function getHomeOpsSettings() {
  return get<HomeModuleSettings>("/admin/home-ops/settings");
}

export function updateHomeOpsSettings(data: Partial<HomeModuleSettings>) {
  return put<HomeModuleSettings>("/admin/home-ops/settings", data);
}

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

export function sortHomeNavItems(items: { id: string; sort_order: number }[]) {
  return put<void>("/admin/home-ops/nav-items/sort", { items });
}
