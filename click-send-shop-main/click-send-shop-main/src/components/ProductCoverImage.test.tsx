import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import ProductCoverImage from "./ProductCoverImage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProductCoverImage", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it("shows an honest missing-image state instead of an unrelated product photo", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ProductCoverImage url="" alt="缺图商品" />);
    });

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("[role='img']")).toHaveAttribute("aria-label", "缺图商品");
    expect(container.textContent).toContain("暂无图片");
  });
});
