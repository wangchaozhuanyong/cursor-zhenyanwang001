import * as homeOpsApi from "@/api/admin/homeOps";
import type { HomeNavItem } from "@/types/content";
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
