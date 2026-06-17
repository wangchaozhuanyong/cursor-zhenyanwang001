import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import ProductActivityPanel from "./ProductActivityPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProductActivityPanel", () => {
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

  it("renders stock progress and backend validation copy", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ProductActivityPanel
          activity={{
            id: "a1",
            type: "flash_sale",
            title: "周末秒杀",
            description: "限量活动",
            start_at: "2026-06-17T00:00:00.000Z",
            end_at: "2026-06-18T00:00:00.000Z",
            activity_price: 88,
            limit_per_user: 2,
            activity_stock: 10,
            sold_count: 6,
            remaining_stock: 4,
            status: "active",
            status_label: "进行中",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("周末秒杀");
    expect(container.textContent).toContain("已抢 60%");
    expect(container.textContent).toContain("每人限购 2 件");
    expect(container.textContent).toContain("由后端重新校验");
  });

  it("does not expose backend status enums to customers", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ProductActivityPanel
          activity={{
            id: "a1",
            type: "flash_sale",
            title: "周末秒杀",
            start_at: "2026-06-17T00:00:00.000Z",
            end_at: "2026-06-18T00:00:00.000Z",
            activity_price: 88,
            remaining_stock: 4,
            status: "active",
            status_label: "active",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("进行中");
    expect(container.textContent).not.toContain("active");
  });
});
