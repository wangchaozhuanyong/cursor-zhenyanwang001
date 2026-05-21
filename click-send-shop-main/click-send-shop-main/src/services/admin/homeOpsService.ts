import * as homeOpsApi from "@/api/admin/homeOps";
import type { HomeModuleSettings } from "@/constants/homeModules";
import type { HomeNavItem } from "@/types/content";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchHomeOpsSettings(): Promise<HomeModuleSettings> {
  const res = await homeOpsApi.getHomeOpsSettings();
  return res.data;
}

export async function updateHomeOpsSettings(data: Partial<HomeModuleSettings>): Promise<HomeModuleSettings> {
  const res = await homeOpsApi.updateHomeOpsSettings(data);
  return res.data;
}

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

export async function sortHomeNavItems(items: { id: string; sort_order: number }[]): Promise<void> {
  await homeOpsApi.sortHomeNavItems(items);
}
