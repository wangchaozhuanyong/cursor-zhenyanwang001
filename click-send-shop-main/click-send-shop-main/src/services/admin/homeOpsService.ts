import * as homeOpsApi from "@/api/admin/homeOps";
import type { HomeAnnouncement, HomeNavItem } from "@/types/content";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchHomeNavItems(): Promise<HomeNavItem[]> {
  const res = await homeOpsApi.getHomeNavItems();
  return unwrapList<HomeNavItem>(res.data);
}

export async function createHomeNavItem(data: Partial<HomeNavItem>): Promise<HomeNavItem> {
  const res = await homeOpsApi.createHomeNavItem(data);
  return res.data;
}

export async function updateHomeNavItem(id: string, data: Partial<HomeNavItem>): Promise<void> {
  await homeOpsApi.updateHomeNavItem(id, data);
}

export async function deleteHomeNavItem(id: string): Promise<void> {
  await homeOpsApi.deleteHomeNavItem(id);
}

export async function fetchHomeAnnouncements(): Promise<HomeAnnouncement[]> {
  const res = await homeOpsApi.getHomeAnnouncements();
  return unwrapList<HomeAnnouncement>(res.data);
}

export async function createHomeAnnouncement(data: Partial<HomeAnnouncement>): Promise<HomeAnnouncement> {
  const res = await homeOpsApi.createHomeAnnouncement(data);
  return res.data;
}

export async function updateHomeAnnouncement(id: string, data: Partial<HomeAnnouncement>): Promise<void> {
  await homeOpsApi.updateHomeAnnouncement(id, data);
}

export async function deleteHomeAnnouncement(id: string): Promise<void> {
  await homeOpsApi.deleteHomeAnnouncement(id);
}
