import { get } from "@/api/request";
import type { Banner } from "@/types/banner";

export function getActiveBanners() {
  return get<Banner[]>("/banners");
}

