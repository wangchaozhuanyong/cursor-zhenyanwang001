import { get } from "@/api/request";
import type { Banner } from "@/types/banner";

export function getActiveBanners(options?: { fresh?: boolean }) {
  return get<Banner[]>("/banners", options?.fresh ? { _t: Date.now() } : undefined);
}
