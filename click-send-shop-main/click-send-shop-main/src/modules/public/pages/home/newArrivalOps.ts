import type { Product } from "@/types/product";

export const NEW_ARRIVAL_OPS_MAX = 6;
export const NEW_ARRIVAL_AUTO_MS = 4200;

export type NewArrivalClickTarget = "product" | "new_arrivals_page" | "hero_cta";

export function resolveNewArrivalImage(product: Product | null, fallbackIndex: number): string {
  if (!product) return "";
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (images.length > 0) {
    return images[fallbackIndex % images.length];
  }
  if (product.cover_image) return product.cover_image;
  return "";
}

export function normalizeNewArrivalHeroCopy(
  title?: string,
  subtitle?: string,
  ctaText?: string,
  siteSlogan?: string,
): { title: string; subtitle: string; ctaText: string; showSubtitle: boolean } {
  const t = (title || "").trim();
  const s = (subtitle || "").trim();
  const c = (ctaText || "").trim();
  return {
    title: t || "新品上市",
    subtitle: s || (siteSlogan || "").trim(),
    ctaText: c || "前往新品上市",
    showSubtitle: Boolean(s || (!t && siteSlogan)),
  };
}
