import { del, get, post, put } from "../request";
import type { HomeAnnouncement, HomeNavItem } from "@/types/content";

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

export function getHomeAnnouncements() {
  return get<HomeAnnouncement[]>("/admin/home-ops/announcements");
}

export function createHomeAnnouncement(data: Partial<HomeAnnouncement>) {
  return post<HomeAnnouncement>("/admin/home-ops/announcements", data);
}

export function updateHomeAnnouncement(id: string, data: Partial<HomeAnnouncement>) {
  return put<void>(`/admin/home-ops/announcements/${id}`, data);
}

export function deleteHomeAnnouncement(id: string) {
  return del<void>(`/admin/home-ops/announcements/${id}`);
}
