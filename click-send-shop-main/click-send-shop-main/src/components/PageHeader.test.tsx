import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PageHeader", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderHeader(
    rightSlot?: ReactNode,
    props: Partial<ComponentProps<typeof PageHeader>> = {},
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <PageHeader title="我的订单" rightSlot={rightSlot} {...props} />
        </MemoryRouter>,
      );
    });
  }

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

  it("centers the title when no right slot is present", async () => {
    await renderHeader();

    expect(container?.querySelector("button[aria-label='返回']")?.className).not.toContain("absolute");
    expect(container?.querySelector("header > div > div")?.className).toContain("grid");
    expect(container?.querySelector("h1")?.className).toContain("text-center");
  });

  it("places the title after the back button when a right slot is present", async () => {
    await renderHeader(<button type="button">更多</button>);

    expect(container?.querySelector("button[aria-label='返回']")?.className).not.toContain("absolute");
    expect(container?.querySelector("h1")?.className).not.toContain("text-center");
    expect(container?.querySelector("header")?.textContent).toContain("更多");
  });

  it("uses the storefront theme header surface instead of a fixed white background", async () => {
    await renderHeader();

    const headerClassName = container?.querySelector("header")?.className ?? "";
    expect(headerClassName).toContain("sf-next-glass-surface");
    expect(headerClassName).not.toContain("bg-background/95");
  });

  it("allows the header content and back button to match the page container", async () => {
    await renderHeader(undefined, {
      contentClassName: "max-w-3xl",
      backButtonClassName: "lg:left-8",
    });

    expect(container?.querySelector("header > div")?.className).toContain("max-w-3xl");
    expect(container?.querySelector("button[aria-label='返回']")?.className).toContain("lg:left-8");
  });
});
