import type { Banner } from "@/types/banner";

export type BannerMediaRepairScope = "" | "home";

export function readBannerMediaRepairScopeFromSearch(search: string): BannerMediaRepairScope {
  const params = new URLSearchParams(search);
  return params.get("media_status") === "responsive_missing"
    && params.get("repair_scope") === "home"
    ? "home"
    : "";
}

export function sortBannersByRepairPriority(
  banners: Banner[],
  priorityIds: string[],
): Banner[] {
  const priorityById = new Map(priorityIds.map((id, index) => [String(id), index]));
  return banners
    .filter((banner) => priorityById.has(String(banner.id)))
    .sort((left, right) => (
      (priorityById.get(String(left.id)) ?? Number.MAX_SAFE_INTEGER)
      - (priorityById.get(String(right.id)) ?? Number.MAX_SAFE_INTEGER)
    ));
}
