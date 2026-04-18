import { get } from "../request";
import type { Banner } from "@/types/banner";

export function getActiveBanners() {
  return get<Banner[]>("/banners");
}
