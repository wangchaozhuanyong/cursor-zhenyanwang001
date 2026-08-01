import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminCategoryBannerRepairBar from "./AdminCategoryBannerRepairBar";

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminCategoryBannerRepairBar", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderBar(props: Partial<React.ComponentProps<typeof AdminCategoryBannerRepairBar>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <AdminCategoryBannerRepairBar
          total={7}
          onStart={vi.fn()}
          onExit={vi.fn()}
          {...props}
        />,
      );
    });
  }

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  it("shows the remaining review count and opens the first category", () => {
    const onStart = vi.fn();
    renderBar({ onStart });

    expect(container).toHaveTextContent("分类主图审阅队列");
    expect(container).toHaveTextContent("剩余 7 个公开一级分类");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("审阅当前首项"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows a completion state and returns to all categories", () => {
    const onExit = vi.fn();
    renderBar({ total: 0, onExit });

    expect(container).toHaveTextContent("分类主图已全部确认");
    expect(container).not.toHaveTextContent("审阅当前首项");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("返回全部分类"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
