import * as bannerApi from "@/api/admin/banner";
import type { Banner } from "@/types/banner";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchBanners(): Promise<Banner[]> {
  const res = await bannerApi.getBanners();
  return unwrapList<Banner>(res.data);
}

export async function createBanner(data: Omit<Banner, "id">) {
  const res = await bannerApi.createBanner(data);
  return res.data;
}

export async function updateBanner(id: string, data: Partial<Banner>) {
  const res = await bannerApi.updateBanner(id, data);
  return res.data;
}

export async function deleteBanner(id: string) {
  await bannerApi.deleteBanner(id);
}
