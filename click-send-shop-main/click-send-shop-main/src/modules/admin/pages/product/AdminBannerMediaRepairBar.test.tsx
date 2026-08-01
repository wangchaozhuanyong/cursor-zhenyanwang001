import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminBannerMediaRepairBar from "./AdminBannerMediaRepairBar";

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminBannerMediaRepairBar", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderBar(props: Partial<React.ComponentProps<typeof AdminBannerMediaRepairBar>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <AdminBannerMediaRepairBar
          total={7}
          firstBannerTitle="中文客服确认中心"
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

  it("显示剩余数量并打开首张轮播", () => {
    const onStart = vi.fn();
    renderBar({ onStart });

    expect(container).toHaveTextContent("首页轮播双图修复队列");
    expect(container).toHaveTextContent("剩余 7 张首页轮播");
    expect(container).toHaveTextContent("当前首项：中文客服确认中心");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("编辑当前首项"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("显示完成状态并返回全部轮播", () => {
    const onExit = vi.fn();
    renderBar({ total: 0, firstBannerTitle: "", onExit });

    expect(container).toHaveTextContent("首页轮播双图已全部处理");
    expect(container).not.toHaveTextContent("编辑当前首项");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("返回全部轮播"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
