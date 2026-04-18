import * as bannerApi from "@/api/modules/banner";
import type { Banner } from "@/types/banner";

export async function fetchActiveBanners(): Promise<Banner[]> {
  const res = await bannerApi.getActiveBanners();
  return res.data ?? [];
}
