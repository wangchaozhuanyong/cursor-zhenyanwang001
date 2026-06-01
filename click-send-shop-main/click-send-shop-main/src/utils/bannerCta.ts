import type { Banner } from "@/types/banner";

export function getBannerCtaText(banner: Pick<Banner, "cta_text" | "link">, fallback = "立即查看"): string {
  const value = banner.cta_text?.trim();
  if (value) return value;
  return banner.link?.trim() ? fallback : "";
}
