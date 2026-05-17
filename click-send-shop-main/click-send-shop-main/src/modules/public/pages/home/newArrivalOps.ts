import type { Product } from "@/types/product";
import { pickUploadImageVariant, productCoverForList } from "@/utils/uploadImageVariant";

export type NewArrivalClickTarget = "product" | "new_arrivals_page";

export function resolveNewArrivalImage(product: Product | null, fallbackIndex: number): string {
  if (!product) return "";
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (images.length > 0) {
    return pickUploadImageVariant(images[fallbackIndex % images.length], "card");
  }
  if (product.cover_image) return productCoverForList(product.cover_image);
  return "";
}
