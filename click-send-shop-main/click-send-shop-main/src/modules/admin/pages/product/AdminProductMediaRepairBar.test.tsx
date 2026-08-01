import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminProductMediaRepairBar from "./AdminProductMediaRepairBar";

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminProductMediaRepairBar", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderBar(props: Partial<React.ComponentProps<typeof AdminProductMediaRepairBar>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <AdminProductMediaRepairBar
          total={41}
          visibleCount={20}
          firstProductName="7星1"
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

  it("shows the remaining repair count and opens the first missing product", () => {
    const onStart = vi.fn();
    renderBar({ onStart });

    expect(container).toHaveTextContent("首页缺图商品修复队列");
    expect(container).toHaveTextContent("剩余 41 个首页商品");
    expect(container).toHaveTextContent("当前首项：7星1");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("编辑当前首项"));
    expect(button).toBeTruthy();

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows a completion state and returns to the full product list", () => {
    const onExit = vi.fn();
    renderBar({ total: 0, visibleCount: 0, onExit });

    expect(container).toHaveTextContent("首页缺图商品已全部处理");
    expect(container).not.toHaveTextContent("编辑当前首项");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("返回全部商品"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
