import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Banner } from "@/types/banner";
import BannerCarousel from "./BannerCarousel";

const motionConfig = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => vi.fn(),
}));

vi.mock("@/modules/micro-interactions/hooks/useMotionConfig", () => ({
  useMotionConfig: () => ({ enabled: motionConfig.enabled }),
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
    vi.useRealTimers();
    motionConfig.enabled = true;
  });

  async function renderCarousel(props: Partial<ComponentProps<typeof BannerCarousel>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <BannerCarousel banners={banners} {...props} />
        </MemoryRouter>,
      );
    });
    return container;
  }

  it("uses compact previous and next controls for multi-banner sets", async () => {
    const view = await renderCarousel();

    expect(view.querySelector("[aria-label='上一张轮播图']")).toBeInTheDocument();
    expect(view.querySelector("[aria-label='下一张轮播图']")).toBeInTheDocument();
    expect(view.querySelector("[aria-label='暂停轮播']")).toBeInTheDocument();
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");
    expect(view.querySelector(".sf-next-banner-dots")).not.toBeInTheDocument();

    await act(async () => {
      view
        .querySelector<HTMLButtonElement>("[aria-label='下一张轮播图']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.querySelector(".sf-next-banner-copy-title")?.textContent).toBe("会员权益与奖励");
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("2/2");
    expect(view.querySelector(".sf-next-banner-announcement")?.textContent).toContain("已切换到第 2 张");
  });

  it("keeps the slide container non-interactive when a dedicated CTA is present", async () => {
    const view = await renderCarousel();
    const carousel = view.querySelector(".sf-next-banner-carousel");
    const cta = view.querySelector<HTMLButtonElement>(".sf-next-banner-copy-cta");

    expect(cta).toBeInTheDocument();
    expect(carousel).toHaveAttribute("role", "region");
    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(carousel).not.toHaveAttribute("tabindex");
    expect(carousel?.querySelector("[role='button'] button")).not.toBeInTheDocument();
  });

  it("lets the user persistently pause and resume automatic rotation", async () => {
    vi.useFakeTimers();
    const view = await renderCarousel();
    const carousel = view.querySelector(".sf-next-banner-carousel");

    await act(async () => {
      view
        .querySelector<HTMLButtonElement>("[aria-label='暂停轮播']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.querySelector("[aria-label='继续轮播']")).toHaveTextContent("继续");
    expect(carousel).toHaveAttribute("data-auto-paused", "true");
    expect(view.querySelector(".sf-next-banner-announcement")).toHaveTextContent("轮播已暂停");

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");

    await act(async () => {
      view
        .querySelector<HTMLButtonElement>("[aria-label='继续轮播']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.querySelector("[aria-label='暂停轮播']")).toHaveTextContent("暂停");
    expect(carousel).toHaveAttribute("data-auto-paused", "false");

    await act(async () => {
      vi.advanceTimersByTime(2_200);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("2/2");
  });

  it("pauses while focus is inside and resumes after focus leaves", async () => {
    vi.useFakeTimers();
    const view = await renderCarousel();
    const carousel = view.querySelector(".sf-next-banner-carousel");
    const nextButton = view.querySelector<HTMLButtonElement>("[aria-label='下一张轮播图']");
    const outsideButton = document.createElement("button");
    view.appendChild(outsideButton);

    act(() => {
      nextButton?.focus();
    });
    expect(carousel).toHaveAttribute("data-auto-paused", "true");

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");

    act(() => {
      outsideButton.focus();
    });
    expect(carousel).toHaveAttribute("data-auto-paused", "false");

    await act(async () => {
      vi.advanceTimersByTime(2_200);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("2/2");
  });

  it("does not resume after focus leaves when the user chose pause", async () => {
    vi.useFakeTimers();
    const view = await renderCarousel();
    const carousel = view.querySelector(".sf-next-banner-carousel");
    const outsideButton = document.createElement("button");
    view.appendChild(outsideButton);

    await act(async () => {
      view
        .querySelector<HTMLButtonElement>("[aria-label='暂停轮播']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      view.querySelector<HTMLButtonElement>("[aria-label='下一张轮播图']")?.focus();
      outsideButton.focus();
    });

    expect(carousel).toHaveAttribute("data-auto-paused", "true");
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");
  });

  it("keeps reduced-motion automatic rotation disabled", async () => {
    vi.useFakeTimers();
    motionConfig.enabled = false;
    const view = await renderCarousel();
    const playbackButton = view.querySelector<HTMLButtonElement>("[aria-label='自动轮播已关闭']");

    expect(playbackButton).toBeDisabled();
    expect(playbackButton).toHaveTextContent("已关闭");

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });
    expect(view.querySelector(".sf-next-banner-page-count")?.textContent).toBe("1/2");
  });

  it("does not expose automatic slide changes as live announcements", async () => {
    vi.useFakeTimers();
    const view = await renderCarousel();
    const count = view.querySelector(".sf-next-banner-page-count");
    const announcement = view.querySelector(".sf-next-banner-announcement");

    expect(count).not.toHaveAttribute("aria-live");
    expect(announcement?.textContent).toBe("");

    await act(async () => {
      vi.advanceTimersByTime(2_200);
    });

    expect(count?.textContent).toBe("2/2");
    expect(announcement?.textContent).toBe("");
  });

  it("hides all playback controls for a single banner", async () => {
    const view = await renderCarousel({ banners: [banners[0]] });

    expect(view.querySelector("[aria-label='上一张轮播图']")).not.toBeInTheDocument();
    expect(view.querySelector("[aria-label='下一张轮播图']")).not.toBeInTheDocument();
    expect(view.querySelector("[aria-label='暂停轮播']")).not.toBeInTheDocument();
  });
});
