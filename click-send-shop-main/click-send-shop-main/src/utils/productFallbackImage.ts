import product1Image from "@/assets/product1.jpg";
import product2Image from "@/assets/product2.jpg";
import product3Image from "@/assets/product3.jpg";
import product4Image from "@/assets/product4.jpg";
import product5Image from "@/assets/product5.jpg";
import product6Image from "@/assets/product6.jpg";

const PRODUCT_FALLBACK_IMAGES = [
  product1Image,
  product2Image,
  product3Image,
  product4Image,
  product5Image,
  product6Image,
] as const;

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function getProductFallbackImage(seed: string | null | undefined) {
  const safeSeed = String(seed || "storefront-product").trim() || "storefront-product";
  return PRODUCT_FALLBACK_IMAGES[hashSeed(safeSeed) % PRODUCT_FALLBACK_IMAGES.length];
}
