import { act, type HTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProductImageGallery from "./ProductImageGallery";

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
};

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ initial, animate, exit, transition, ...props }: MotionDivProps) => {
      void initial;
      void animate;
      void exit;
      void transition;
      return <div {...props} />;
    },
  },
}));

vi.mock("@/components/client/RatioImage", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProductImageGallery", () => {
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

  async function renderGallery(images: string[]) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <ProductImageGallery
          images={images}
          imageAlts={images.map((_, index) => `商品图 ${index + 1}`)}
          name="测试商品"
        />,
      );
    });
    return container;
  }

  it("shows real previous and next buttons with disabled edge states", async () => {
    const view = await renderGallery(["/one.jpg", "/two.jpg", "/three.jpg"]);
    const previous = view.querySelector<HTMLButtonElement>("[aria-label='上一张商品媒体']");
    const next = view.querySelector<HTMLButtonElement>("[aria-label='下一张商品媒体']");
    const count = view.querySelector(".sf-next-product-gallery-count");

    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(count).toHaveTextContent("1 / 3");

    await act(async () => {
      next?.click();
    });
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();
    expect(count).toHaveTextContent("2 / 3");

    await act(async () => {
      next?.click();
    });
    expect(next).toBeDisabled();
    expect(count).toHaveTextContent("3 / 3");

    await act(async () => {
      next?.click();
    });
    expect(count).toHaveTextContent("3 / 3");
  });

  it("supports bounded ArrowLeft and ArrowRight navigation on the gallery stage", async () => {
    const view = await renderGallery(["/one.jpg", "/two.jpg", "/three.jpg"]);
    const stage = view.querySelector<HTMLDivElement>(".sf-next-product-gallery-stage");
    const count = view.querySelector(".sf-next-product-gallery-count");

    expect(stage).toHaveAttribute("role", "region");
    expect(stage).toHaveAttribute("tabindex", "0");
    expect(stage).toHaveAccessibleName("测试商品 商品媒体，共 3 项，可使用左右方向键切换");

    await act(async () => {
      stage?.focus();
      stage?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(count).toHaveTextContent("1 / 3");

    await act(async () => {
      stage?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(count).toHaveTextContent("2 / 3");

    await act(async () => {
      stage?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      stage?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(count).toHaveTextContent("3 / 3");

    await act(async () => {
      stage?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(count).toHaveTextContent("2 / 3");
  });

  it("does not render navigation controls or a counter for a single image", async () => {
    const view = await renderGallery(["/only.jpg"]);
    const stage = view.querySelector(".sf-next-product-gallery-stage");

    expect(view.querySelector("[aria-label='上一张商品媒体']")).not.toBeInTheDocument();
    expect(view.querySelector("[aria-label='下一张商品媒体']")).not.toBeInTheDocument();
    expect(view.querySelector(".sf-next-product-gallery-count")).not.toBeInTheDocument();
    expect(stage).not.toHaveAttribute("role");
    expect(stage).not.toHaveAttribute("tabindex");
  });
});
