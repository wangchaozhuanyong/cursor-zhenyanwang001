import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminHomeNavRepairBar from "./AdminHomeNavRepairBar";

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("首页快捷入口修复队列", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function renderBar(props: Partial<React.ComponentProps<typeof AdminHomeNavRepairBar>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <AdminHomeNavRepairBar
          total={6}
          firstItemTitle="正品烟草"
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

  it("显示剩余数量并处理首项", () => {
    const onStart = vi.fn();
    renderBar({ onStart });

    expect(container).toHaveTextContent("首页快捷入口修复队列");
    expect(container).toHaveTextContent("剩余 6 个入口");
    expect(container).toHaveTextContent("当前首项：正品烟草");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("处理当前首项"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("显示完成状态并返回全部入口", () => {
    const onExit = vi.fn();
    renderBar({ total: 0, firstItemTitle: "", onExit });

    expect(container).toHaveTextContent("首页快捷入口已全部确认");
    expect(container).not.toHaveTextContent("处理当前首项");
    const button = [...(container?.querySelectorAll("button") || [])]
      .find((item) => item.textContent?.includes("返回全部入口"));

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
