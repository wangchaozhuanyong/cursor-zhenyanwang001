import * as bannerApi from "@/api/modules/banner";
import type { Banner } from "@/types/banner";

export async function fetchActiveBanners(options?: { fresh?: boolean }): Promise<Banner[]> {
  const res = await bannerApi.getActiveBanners(options);
  return res.data ?? [];
}
