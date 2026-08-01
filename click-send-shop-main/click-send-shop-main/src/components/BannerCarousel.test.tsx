import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Banner } from "@/types/banner";
import BannerCarousel from "./BannerCarousel";

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => vi.fn(),
}));

vi.mock("@/modules/micro-interactions/hooks/useMotionConfig", () => ({
  useMotionConfig: () => ({ enabled: false }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const banners: Banner[] = [
  {
    id: "banner-one",
    title: "中文客服确认中心",
    image: "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-01-customer-support-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-01-customer-support-desktop.webp",
    link: "/support-download?tab=support",
  },
  {
    id: "banner-two",
    title: "会员权益与奖励",
    image: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
    image_mobile: "/assets/fixed-storefront/home-banner-02-membership-benefits-mobile.webp",
    image_desktop: "/assets/fixed-storefront/home-banner-02-membership-benefits-desktop.webp",
    link: "/profile",
  },
];

describe("BannerCarousel", () => {
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

  async function renderCarousel() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <BannerCarousel banners={banners} />
        </MemoryRouter>,
      );
    });
    return container;
  }

  it("uses compact previous and next controls for multi-banner sets", async () => {
    const view = await renderCarousel();

    expect(view.querySelector("[aria-label='上一张轮播图']")).toBeInTheDocument();
    expect(view.querySelector("[aria-label='下一张轮播图']")).toBeInTheDocument();
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");
    expect(view.querySelector(".sf-next-banner-dots")).not.toBeInTheDocument();

    await act(async () => {
      view
        .querySelector<HTMLButtonElement>("[aria-label='下一张轮播图']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.querySelector(".sf-next-banner-copy-title")?.textContent).toBe("会员权益与奖励");
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("2/2");
  });

  it("keeps the slide container non-interactive when a dedicated CTA is present", async () => {
    const view = await renderCarousel();
    const carousel = view.querySelector(".sf-next-banner-carousel");
    const cta = view.querySelector<HTMLButtonElement>(".sf-next-banner-copy-cta");

    expect(cta).toBeInTheDocument();
    expect(carousel).not.toHaveAttribute("role", "button");
    expect(carousel).not.toHaveAttribute("tabindex");
    expect(carousel?.querySelector("[role='button'] button")).not.toBeInTheDocument();
  });
});
