import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/types/product";
import HomeProductSectionV2 from "./HomeProductSectionV2";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../product/ProductCardV2", () => ({
  default: ({ product, imageLoading, imageFetchPriority }: {
    product: Product;
    imageLoading?: "eager" | "lazy";
    imageFetchPriority?: "high" | "low" | "auto";
  }) => (
    <div
      data-testid="product-card"
      data-product-id={product.id}
      data-image-loading={imageLoading}
      data-image-fetch-priority={imageFetchPriority}
    />
  ),
}));

describe("HomeProductSectionV2", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    container = null;
    root = null;
  });

  it("keeps homepage shelf images lazy instead of reprioritizing every section", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const products = [
      { id: "one", name: "商品一" },
      { id: "two", name: "商品二" },
    ] as Product[];

    act(() => {
      root?.render(
        <HomeProductSectionV2
          title="热门商品"
          products={products}
          onNavigate={vi.fn()}
        />,
      );
    });

    const cards = [...container.querySelectorAll("[data-testid='product-card']")];
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.getAttribute("data-image-loading") === "lazy")).toBe(true);
    expect(cards.every((card) => !card.hasAttribute("data-image-fetch-priority"))).toBe(true);
  });
});
