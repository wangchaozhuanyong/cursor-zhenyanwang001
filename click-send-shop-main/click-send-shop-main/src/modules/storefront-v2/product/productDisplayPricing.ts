import type { Product, ProductVariant } from "@/types/product";

type ProductDisplayPriceFields = Product & {
  min_price?: number | null;
  max_price?: number | null;
  min_original_price?: number | null;
  max_original_price?: number | null;
};

export type ProductDisplayPriceModel = {
  amount: number;
  comparePrice: number;
  displayPrice: number | string;
  originalPrice: number | null | undefined;
  hasBackendActivityPrice: boolean;
};

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return 0;
}

function formatPriceRangePart(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function getBackendActivityPrice(product: Product) {
  return firstPositiveNumber(
    product.active_activity?.activity_price,
    product.activity_price,
    product.active_activity ? product.effective_price : 0,
  );
}

export function buildProductDisplayPriceModel(
  product: Product,
  selectedVariant: ProductVariant | null = null,
): ProductDisplayPriceModel {
  const pricedProduct = product as ProductDisplayPriceFields;
  const backendActivityPrice = getBackendActivityPrice(product);
  const productPrice = finiteNumber(product.price);
  const selectedVariantPrice = selectedVariant ? finiteNumber(selectedVariant.price, productPrice) : null;
  const minPrice = finiteNumber(pricedProduct.min_price ?? product.price);
  const maxPrice = finiteNumber(pricedProduct.max_price ?? product.price ?? minPrice);
  const hasPriceRange = !backendActivityPrice && !selectedVariant && maxPrice > minPrice;
  const fallbackAmount = selectedVariantPrice ?? (hasPriceRange ? minPrice : productPrice);
  const amount = backendActivityPrice || fallbackAmount;
  const displayPrice = backendActivityPrice
    ? amount
    : selectedVariantPrice ?? (hasPriceRange ? `${formatPriceRangePart(minPrice)}-${formatPriceRangePart(maxPrice)}` : product.price);
  const comparePrice = backendActivityPrice
    ? amount
    : selectedVariantPrice ?? (hasPriceRange ? maxPrice : productPrice);
  const originalPrice = backendActivityPrice
    ? firstPositiveNumber(
        selectedVariant?.original_price,
        pricedProduct.max_original_price,
        product.original_price,
        selectedVariantPrice,
        product.price,
      )
    : selectedVariant?.original_price ?? (hasPriceRange ? pricedProduct.max_original_price : product.original_price);

  return {
    amount,
    comparePrice,
    displayPrice,
    originalPrice,
    hasBackendActivityPrice: backendActivityPrice > 0,
  };
}
